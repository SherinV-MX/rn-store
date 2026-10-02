import { createRequire } from 'node:module';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { createCanvas } from '@napi-rs/canvas';

/* The cover of a manual card: the first page of the manual itself, rendered on demand.

   The cards used to show a product photograph picked by keyword from the document's name,
   which is a guess — and every one of these PDFs already opens on a proper printed cover.

   This cannot happen in the browser. RN's PDF hosts send no Access-Control-Allow-Origin, so a
   cross-origin fetch of the file is refused, and half the manuals are served over plain http,
   which an https page blocks outright as mixed content. Neither restriction applies to a fetch
   made from the server. So the page asks this route for a picture and it renders one, which
   also means the browser receives a 40KB thumbnail instead of the 5-16MB handbook behind it.

   Nothing is written to disk. A render is held in memory for as long as the process lives and
   in the browser's own cache after that, and a manual nobody looks at is never fetched. */

export const runtime = 'nodejs';

/* The manuals live on two of RN's hosts. Anything else is refused, so a crafted src cannot
   turn this route into an open fetch proxy for the network the server sits on. */
const HOSTS = new Set(['race-navigator.com', 'www.race-navigator.com', 'downloads.race-navigator.com']);

const WIDTH = 560;
const MAX_BYTES = 40 * 1024 * 1024;
/* Ten manuals on the page at about 60KB a render. The cap is what stops a long-running
   server from holding every PDF it has ever been asked about. */
const KEEP = 24;

/* Renders in flight as well as finished ones: a cold page load asks for ten covers at once,
   and twice for the same document would otherwise fetch and rasterise it twice. */
const cache = new Map<string, Promise<ArrayBuffer>>();

function remember(key: string, work: () => Promise<ArrayBuffer>) {
    const hit = cache.get(key);
    if (hit) return hit;
    const task = work();
    cache.set(key, task);
    /* A failed render must not be remembered as the answer — an upstream hiccup would
       otherwise blank that card until the server restarts. */
    task.catch(() => cache.delete(key));
    for (const k of cache.keys()) {
        if (cache.size <= KEEP) break;
        cache.delete(k);
    }
    return task;
}

function bad(why: string, code = 400) {
    return new Response(why, { status: code, headers: { 'cache-control': 'no-store' } });
}

/* pdf.js keeps the fourteen standard PDF typefaces as data files beside itself, and without
   them a page that asks for Helvetica renders its text as nothing.

   Resolved from the project root rather than from this module: the bundler rewrites
   import.meta.url to a stub of its own, and resolving against that gave a path inside the
   bundle instead of the one on disk.

   Handed over as a plain directory path with a trailing slash, which is what pdf.js joins
   each font file onto and what its node loader opens. A file:// url passes its own trailing
   slash check and then fails on every font, because the loader reads from the filesystem
   rather than fetching. Forward slashes, since it does that joining as a string. */
const require_ = createRequire(path.join(process.cwd(), 'package.json'));
const FONTS =
    path.join(path.dirname(require_.resolve('pdfjs-dist/package.json')), 'standard_fonts')
        .split(path.sep).join('/') + '/';

async function render(src: string) {
    const res = await fetch(src, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        /* Not through Next's data cache: it refuses anything over 2MB, and every one of
           these manuals is over 2MB, so each request logged a cache failure. The rendered
           picture is what is worth keeping, and that is held above. */
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) throw new Error('pdf too large');

    /* Imported here rather than at the top of the file: pdf.js reaches for browser globals
       as it initialises, so it is only loaded once a request is actually being served. */
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const task = pdfjs.getDocument({
        data: new Uint8Array(body),
        standardFontDataUrl: FONTS,
        /* Print PDFs, full of embedded faces and colour profiles. For a thumbnail of page
           one, pdf.js's own rasteriser is enough and installing the fonts in the process
           is not. */
        disableFontFace: true,
    });

    try {
        const doc = await task.promise;
        const page = await doc.getPage(1);
        const scale = WIDTH / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
        const ctx = canvas.getContext('2d');
        /* A page that paints no background of its own comes out transparent, which a JPEG
           turns black. */
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // @ts-expect-error - a node canvas, which pdf.js draws to but is not typed for
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        /* Copied out of the node Buffer rather than handed over: a Buffer is a view on a
           pooled allocation, and its whole backing store is not this picture. */
        const buf = canvas.toBuffer('image/jpeg', 86);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } finally {
        /* The loading task owns the worker; the document proxy has no destroy of its own. */
        await task.destroy();
    }
}

export async function GET(req: NextRequest) {
    const src = req.nextUrl.searchParams.get('src');
    if (!src) return bad('src required');

    let url: URL;
    try {
        url = new URL(src);
    } catch {
        return bad('src is not a url');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return bad('bad protocol');
    if (!HOSTS.has(url.hostname)) return bad('host not allowed');
    if (!url.pathname.toLowerCase().endsWith('.pdf')) return bad('not a pdf');

    try {
        const jpeg = await remember(url.href, () => render(url.href));
        return new Response(jpeg, {
            headers: {
                'content-type': 'image/jpeg',
                /* A new edition of a manual arrives under a new filename rather than over
                   the old one, so a given url is the same page forever. */
                'cache-control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e) {
        return bad(`could not render: ${(e as Error).message}`, 502);
    }
}
