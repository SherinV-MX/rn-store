import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { rnSupport } from '@/content/rn';
import {
    rnSupport_manuals, rnSupport_updates, rnSupport_modes, rnSupport_layouts,
    rnSupport_tracks, rnSupport_stepCaptions, rnSupport_slideTitles, rnSupport_gallery, type SupportBlock,
} from '@/content/rn-support';
import RnSupportCarousel from '@/components/rn/RnSupportCarousel';
import RnSupportBody from '@/components/rn/RnSupportBody';
import RnTrackList from '@/components/rn/RnTrackList';
import s from '@/components/rn/RnSupportPage.module.css';

/* The five support subpages. They are the same page with different contents — a banner, the
   six-tile nav live repeats at the top of each one, then the page's own body — so they share a
   route rather than existing as five near-identical files. */

type Lang = 'en' | 'de';

/* `banner` is each page's own hero photograph, lifted from live. The nav tile image is a
   different, smaller picture and using it here left Supported Tracks showing its thumbnail
   where the Nürburgring shot belongs.

   `tile` is the index of this page in the support nav, which is where its name comes from.

   The name cannot be taken from the page's own content: live gives Manuals a heading of its own
   but starts Device Updates, Mode Activation and Video Layouts straight in on a step — "Update
   via the Race Navigator Dashboard" — so reading the first heading named three of the five
   pages after their first instruction. The nav already holds the right name in both
   languages. */
const PAGES = {
    faq: { tile: 0, banner: '/rn/support/hero-faq.jpg', blocks: null },
    'supported-tracks': { tile: 1, banner: '/rn/support/hero-tracks.jpg', blocks: null },
    manuals: { tile: 2, banner: '/rn/support/hero-manuals.jpg', blocks: rnSupport_manuals },
    'device-updates': { tile: 3, banner: '/rn/support/hero-updates.jpg', blocks: rnSupport_updates },
    'mode-activation': { tile: 4, banner: '/rn/support/hero-modes.jpg', blocks: rnSupport_modes },
    'video-layouts': { tile: 5, banner: '/rn/support/hero-layouts.jpg', blocks: rnSupport_layouts },
} as const;

type Slug = keyof typeof PAGES;

export function generateStaticParams() {
    /* faq has a route of its own; it is listed above only so the nav can name it. */
    return Object.keys(PAGES).filter((p) => p !== 'faq').map((page) => ({ page }));
}

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; page: string }> },
): Promise<Metadata> {
    const { locale, page } = await params;
    const entry = PAGES[page as Slug];
    if (!entry) return {};
    return { title: `${rnSupport(locale).tiles[entry.tile].title} | Race Navigator` };
}

export default async function RnSupportSubPage(
    { params }: { params: Promise<{ locale: string; page: string }> },
) {
    const { locale, page } = await params;
    const entry = PAGES[page as Slug];
    if (!entry) notFound();

    const lang: Lang = locale === 'de' ? 'de' : 'en';
    const nav = rnSupport(locale);
    const blocks: readonly SupportBlock[] | null = entry.blocks ? entry.blocks[lang] : null;
    const title = nav.tiles[entry.tile].title;

    /* Manuals opens with a heading that repeats the page name, so it is dropped rather than
       printed twice. The other pages open on a step and keep everything. */
    const first = blocks?.findIndex((b) => b.k === 'h' && b.level <= 2) ?? -1;
    const repeats = first >= 0 && blocks?.[first].k === 'h'
        && (blocks[first] as { t: string }).t.trim().toLowerCase() === title.trim().toLowerCase();
    const body = (repeats ? blocks!.filter((_, i) => i !== first) : blocks) ?? [];

    return (
        <>
            <section
                className={s.banner}
                style={{ backgroundImage: `url('${entry.banner}')` }}
                aria-hidden="true"
            />

            {/* The support nav sits between the hero and the page, exactly where live puts it
                on every subpage. */}
            <section className={s.navBand}>
                <RnSupportCarousel
                    tiles={nav.tiles}
                    prev={nav.prev}
                    next={nav.next}
                    label={nav.head}
                    active={entry.tile}
                />
            </section>

            <section className={s.intro}>
                <div className={`rnRail ${s.introRail}`}>
                    <h1 className="rnH2">{title}</h1>
                </div>
            </section>

            <section className={s.body}>
                <div className={`rnRail ${s.bodyRail}`}>
                    {blocks
                        ? <RnSupportBody
                            blocks={body}
                            captions={rnSupport_stepCaptions[lang]}
                            slideTitles={rnSupport_slideTitles[lang]}
                            gallery={rnSupport_gallery[lang]}
                        />
                        : <RnTrackList regions={rnSupport_tracks[lang]} label={title} />}
                </div>
            </section>

        </>
    );
}
