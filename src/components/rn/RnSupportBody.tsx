import Image from 'next/image';
import type { StepText, SupportBlock } from '@/content/rn-support';
import RnLayoutSlides, { type LayoutShot } from './RnLayoutSlides';
import RnStepCarousel, { type Step } from './RnStepCarousel';
import s from './RnSupportPage.module.css';

/* The body of a support subpage, rendered from the blocks lifted off live.

   These pages are walkthroughs — a heading, a line or two, then a screenshot of the device or
   the app, over and over — so rather than hand-building four nearly identical layouts, each
   page hands its blocks to this and the shape comes out of the content.

   Two groupings have to be rebuilt from the flat stream, because the stream loses them:

   Lists. Consecutive <li> arrive loose, because that is how they sit in the source, and a run
   of them outside a <ul> is invalid and reads as nothing in a screen reader.

   Manual downloads. On live these sit in columns under a flag — English on the left, German on
   the right — as outlined buttons. In the stream that is a small image followed by a run of PDF
   links, so a flag opens a column and the links that follow belong to it until the next flag or
   the next heading. Sections with no flag get one column.

   Walkthrough sliders. Device Updates steps through the dashboard in thirteen screenshots and
   the RN Connect app in fourteen; Mode Activation does the same in seven and eleven. Live puts
   each run in a slider, and the stream has them as loose pictures, so stacking them turned four
   short walkthroughs into forty-five screenshots down the page.

   Which pictures belong to a slider is not guessed from their filenames. The captions were read
   off live's own sliders and are keyed by picture, so a picture that has an entry is a slide and
   one that does not — the YouTube mark, the App Store badge, an illustration in the text — is
   not. Mode Activation also titles each slide ("SETTINGS:", "NETWORK:"), and those titles arrive
   in the stream as headings sitting between the pictures; they belong to the slider, so they are
   taken out of the flow and handed to it rather than left breaking the run in two. */

const FLAG_MAX_WIDTH = 200;


/* Live prints the line naming which devices a method works with in red bold, as a <strong>
   rather than a styled paragraph, so it arrives in the stream as ordinary text. Both
   languages say it the same way. */
const LEAD = /^(available for|verf[üu]gbar f[üu]r)\s*:/i;


/* A manual is one document that may exist in more than one language, but live lists it once per
   language — "RN ONE Manual – English »" and "RN ONE Manual – German »" are the same handbook.
   Stripping the language off the end gives the document's name, and the names then group. */
const LANG = /\s*[-–—]\s*(english|englisch|german|deutsch)\s*»?\s*$/i;
const GERMAN = /^(german|deutsch)$/i;

/* The cover is the manual's own first page, rendered by /api/rn/manual-cover. The browser
   cannot do this itself: RN's PDF hosts send no CORS headers and half the files are plain
   http, so the fetch has to happen on the server. See that route for the rest. */
function coverFor(man: Manual) {
    return `/api/rn/manual-cover?src=${encodeURIComponent(man.editions[0].href)}`;
}

/* A flag opens a column in the source stream; the cards ignore the split, but the shape is
   still how the links arrive. */
type Column = { flag?: { src: string; w: number; h: number }; links: { t: string; href: string }[] };

type Manual = { name: string; editions: { label: string; href: string; german: boolean }[] };

/* Links in, one card per document out, in the order they first appear. */
function toManuals(links: { t: string; href: string }[]): Manual[] {
    const order: string[] = [];
    const byName = new Map<string, Manual>();

    for (const l of links) {
        const m = l.t.match(LANG);
        const lang = m ? m[1] : '';
        const name = l.t.replace(LANG, '').replace(/\s*»\s*$/, '').trim();
        if (!byName.has(name)) {
            byName.set(name, { name, editions: [] });
            order.push(name);
        }
        byName.get(name)!.editions.push({
            /* DE, not GE — the chip is the language code, and slicing the word gave "Ge" for
               German and "De" for Deutsch, which is the same language labelled two ways. */
            label: lang ? (GERMAN.test(lang) ? 'DE' : 'EN') : 'PDF',
            href: l.href,
            german: GERMAN.test(lang),
        });
    }
    return order.map((n) => byName.get(n)!);
}

export default function RnSupportBody({
    blocks,
    captions = {},
    slideTitles = [],
    gallery = [],
}: {
    blocks: readonly SupportBlock[];
    /* Caption per screenshot, for the pages that have a walkthrough. */
    captions?: Record<string, StepText>;
    /* Every title live gives a slide on this page, the renderer's cue that a heading belongs
       to a slider. Includes the one whose text cell carries no picture. */
    slideTitles?: readonly string[];
    /* The sample layouts Video Layouts opens with, which carry no caption of their own. */
    gallery?: readonly string[];
}) {
    /* Which pictures are slides, worked out before anything is rendered.

       Walking the stream and buffering as it goes does not work here: Mode Activation puts each
       slide's title between the pictures, so the pictures are not consecutive and a run would
       break at every title. Instead the slides are grouped up front — consecutive slide pictures
       sharing a stem are one run, and the title headings between them are marked to be skipped
       because the slider renders them itself.

       A run is emitted at the position of its first block, so it lands where live has it. */
    const skip = new Set<number>();
    const runAt = new Map<number, Step[]>();
    const galleryAt = new Map<number, LayoutShot[]>();
    const inGallery = new Set(gallery);
    /* A heading that says one of live's slide titles is the slider's, not the page's. */
    const titles = new Set(slideTitles);
    {
        let i = 0;
        while (i < blocks.length) {
            const b = blocks[i];
            if (b.k === 'img' && inGallery.has(b.src)) {
                const shots: LayoutShot[] = [];
                let j = i;
                while (j < blocks.length) {
                    const c = blocks[j];
                    if (c.k !== 'img' || !inGallery.has(c.src)) break;
                    shots.push({ src: c.src, w: c.w, h: c.h });
                    skip.add(j);
                    j += 1;
                }
                skip.delete(i);
                galleryAt.set(i, shots);
                i = j;
                continue;
            }

            const info = b.k === 'img' ? captions[b.src] : undefined;
            if (b.k !== 'img' || !info) {
                i += 1;
                continue;
            }

            const run = info.run;
            const steps: Step[] = [];
            const members: number[] = [];

            let j = i;
            while (j < blocks.length) {
                const c = blocks[j];
                if (c.k === 'img') {
                    const ci = captions[c.src];
                    if (!ci || ci.run !== run) break;
                    steps.push({ src: c.src, w: c.w, h: c.h, t: ci.t, title: ci.title });
                    members.push(j);
                    j += 1;
                    continue;
                }
                /* A heading only stays inside the run if it is the next slide's own title. */
                const nxt = blocks[j + 1];
                const ni = nxt && nxt.k === 'img' ? captions[nxt.src] : undefined;
                if (c.k === 'h' && ni && ni.run === run && ni.title && ni.title === c.t) {
                    members.push(j);
                    j += 1;
                    continue;
                }
                break;
            }

            /* The titles do not line up one-for-one with the pictures in the stream — the run
               can end on a title whose picture never arrived. A heading straight after the run
               that names one of its steps belongs to the slider, not to the page. */
            const after = blocks[j];
            if (after && after.k === 'h' && titles.has(after.t)) {
                members.push(j);
                j += 1;
            }

            /* The first slide's title sits before its picture, so the run starts there. */
            let start = i;
            const prev = blocks[i - 1];
            if (prev && prev.k === 'h' && steps[0]?.title && prev.t === steps[0].title) {
                start = i - 1;
                skip.add(i - 1);
            }

            for (const m of members) skip.add(m);
            skip.delete(start);
            runAt.set(start, steps);
            i = j;
        }
    }

    const out: React.ReactNode[] = [];
    let list: string[] = [];
    let columns: Column[] = [];
    /* The heading a run sits under, which names the walkthrough far better than its
       filenames do — "Update via RN Connect App" rather than the image stem. */
    let lastHead = '';
    /* The tallest picture in the walkthrough just emitted, or 0 if the last thing out was not
       one. A tutorial link that follows a walkthrough is pulled up into the overhang below the
       red band, as live pulls its own. */
    let lastWalkTall = 0;
    /* Whether that walkthrough was the mirrored one. Live sets its tutorial link on the
       caption's side, opposite the picture, so the link mirrors with the run. */
    let lastWalkMirrored = false;
    /* How many walkthroughs have gone out on this page, which decides the next one's side. */
    let walkCount = 0;

    const flushList = (key: string) => {
        if (!list.length) return;
        out.push(
            <ul className={s.list} key={`ul-${key}`}>
                {list.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
            </ul>,
        );
        list = [];
    };

    const flushColumns = (key: string) => {
        if (!columns.length) return;

        /* The flag columns live uses are dropped here: a card carries its own languages, so
           splitting the list in two by language would only separate a document from itself. */
        const manuals = toManuals(columns.flatMap((c) => c.links));
        columns = [];

        out.push(
            <div className={s.manuals} key={`dl-${key}`}>
                {manuals.map((man, mi) => (
                    <article className={s.manual} key={`${man.name}-${mi}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className={s.manualCover}
                            src={coverFor(man)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                        />
                        <div className={s.manualBody}>
                            <h3 className={s.manualName}>{man.name}</h3>
                            <p className={s.editions}>
                                {man.editions.map((e, ei) => (
                                    <a
                                        className={s.edition}
                                        href={e.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        key={`${e.href}-${ei}`}
                                    >
                                        {e.label}
                                    </a>
                                ))}
                            </p>
                        </div>
                    </article>
                ))}
            </div>,
        );
    };

    /* The slider for the run that starts at this block, emitted in its place. */
    const emitRun = (i: number, steps: Step[]) => {
        lastWalkTall = steps.reduce((n, x) => Math.max(n, x.h), 0);
        /* Live alternates the runs down a page: the first puts its picture on the right with
           the caption on the left, the second flips both. Counted rather than matched on a
           filename, because the two pages that do this name their second run differently —
           rn-connect-app on Device Updates, app-settings on Mode Activation — and a name is a
           coincidence where the alternation is the rule. */
        lastWalkMirrored = walkCount % 2 === 1;
        walkCount += 1;
        out.push(
            <RnStepCarousel
                steps={steps}
                label={lastHead || 'Walkthrough'}
                mirrored={lastWalkMirrored}
                key={`steps-${i}`}
            />,
        );
    };

    const flushAll = (key: string) => {
        flushList(key);
        flushColumns(key);
    };

    blocks.forEach((b, i) => {
        /* Swallowed into the slider that renders them. */
        if (skip.has(i)) return;

        const shots = galleryAt.get(i);
        if (shots) {
            flushAll(String(i));
            out.push(
                <RnLayoutSlides shots={shots} label={lastHead || 'Video layouts'} key={`gal-${i}`} />,
            );
            return;
        }

        const steps = runAt.get(i);
        if (steps) {
            flushAll(String(i));
            emitRun(i, steps);
            return;
        }

        if (b.k === 'li') {
            flushColumns(String(i));
            list.push(b.t);
            return;
        }

        /* A flag opens a column; a PDF joins the open one, starting a bare column if the
           section has no flags at all. */
        if (b.k === 'img' && b.w > 0 && b.w < FLAG_MAX_WIDTH) {
            flushList(String(i));
            columns.push({ flag: { src: b.src, w: b.w, h: b.h }, links: [] });
            return;
        }
        if (b.k === 'pdf') {
            flushList(String(i));
            if (!columns.length) columns.push({ links: [] });
            columns[columns.length - 1].links.push({ t: b.t, href: b.href });
            return;
        }

        flushAll(String(i));

        if (b.k !== 'video') { lastWalkTall = 0; lastWalkMirrored = false; }

        if (b.k === 'h') {
            /* Live uses h2 for the section titles and h5 for the steps. Levels are kept in
               order here rather than copied literally, so the page has one h1 and no gaps. */
            const Tag = (b.level <= 2 ? 'h2' : 'h3') as 'h2' | 'h3';
            lastHead = b.t;
            out.push(
                <Tag className={b.level <= 2 ? s.bodyHead : s.stepHead} key={`h-${i}`}>
                    {b.t}
                </Tag>,
            );
        } else if (b.k === 'video') {
            /* The picture hangs below the band by half its overhang, leaving a tall empty
               space the link would otherwise sit under. Live closes that with a negative top
               margin — -55px under the short dashboard shots, -250px under the tall phone
               ones — so the link lands just below the band either way. Worked out from the
               run's own height rather than copied as two magic numbers: the band is 195 tall
               and centred, so half the overhang is (h - 195) / 2, less the 22px the link
               already carries, so it lands the 30px under the band that live leaves. */
            const pull = lastWalkTall ? Math.round(lastWalkTall / 2 - 67.5) : 0;
            const onRight = lastWalkMirrored;
            lastWalkTall = 0;
            lastWalkMirrored = false;
            /* The mark is drawn rather than loaded: live serves it as a 24px bitmap, and at
               that size a path is sharper and saves a request. */
            out.push(
                <p
                    className={`${s.videoLine} ${onRight ? s.videoLineRight : ''}`}
                    style={pull > 0 ? { marginTop: `-${pull}px` } : undefined}
                    key={`v-${i}`}
                >
                    <a
                        className={s.videoLink}
                        href={b.href}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg
                            className={s.videoMark}
                            viewBox="0 0 28 20"
                            width="28"
                            height="20"
                            aria-hidden="true"
                        >
                            <path
                                d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5c.6-2.2.6-6.9.6-6.9s0-4.7-.6-6.9Z"
                                fill="#f00"
                            />
                            <path d="M11.2 14.3 18.4 10l-7.2-4.3v8.6Z" fill="#fff" />
                        </svg>
                        {b.t}
                    </a>
                </p>,
            );
        } else if (b.k === 'p') {
            out.push(
                <p className={LEAD.test(b.t) ? s.bodyLead : s.bodyText} key={`p-${i}`}>
                    {b.t}
                </p>,
            );
        } else if (b.k === 'img' && b.w > 0) {
            out.push(
                <Image
                    className={s.shot}
                    src={b.src}
                    alt=""
                    width={b.w}
                    height={b.h}
                    sizes="(max-width: 900px) 100vw, 900px"
                    quality={82}
                    key={`img-${i}`}
                />,
            );
        }
    });

    flushAll('end');
    return <>{out}</>;
}
