import Image from 'next/image';
import Link from 'next/link';
import { RN_PARTNERS, RN_TRACKS, rnHome } from '@/content/rn';
import s from './RnHome.module.css';

/* The partner rail. The list is rendered twice and the track translated by half its width, so
   the loop closes without a visible seam. Hovering pauses it; reduced motion stops it and
   leaves the rail scrollable by hand. */
export function RnPartners() {
    const run = [...RN_PARTNERS, ...RN_PARTNERS];
    return (
        <section className="rnLight" id="partners" aria-label="References">
            <div className={s.marquee}>
                <div className={s.track}>
                    {run.map((partner, i) => (
                        <span className={s.brand} key={`${partner.name}-${i}`} aria-hidden={i >= RN_PARTNERS.length}>
                            <Image
                                src={partner.src}
                                alt={i < RN_PARTNERS.length ? partner.name : ''}
                                width={partner.w}
                                height={partner.h}
                                /* The rail animates continuously, so a logo parked off-screen
                                   is seconds from being on it. Lazy-loading would pop it in
                                   mid-travel; every file here is a few kilobytes. */
                                loading="eager"
                            />
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* "Full vision - also at night". The mirror of the case band: picture on the left, heading and
   button on the right.

   The camera is the client's own. It was hard to find because it is served from Elementor's
   thumbnail cache under the name "Koffer-placeholder-2", which reads like a stand-in and is
   not what it is, and because the live page lazy-loads it and blocks scripted scrolling — so
   it never enters the viewport to be fetched. Moving the element into view is what finally
   made it load. */
export function RnNightVision({ locale }: { locale: string }) {
    const t = rnHome(locale);

    return (
        <section className={`rnSection ${s.cta} ${s.night}`} aria-labelledby="rn-night">
            <div className={`${s.nightRail} ${s.ctaGrid} ${s.nightGrid}`}>
                <div className={s.nightShot}>
                    {/* Served untouched, and no `sizes`. This is a fixed 400x427 drawn at
                        exactly 400x427 — the same file at the same size live uses — so there is
                        no smaller variant worth picking and nothing for re-encoding to win: the
                        whole thing is 16KB. Running it through the optimizer only softened it,
                        and an earlier `sizes="45vw"` had the browser pick an 89px variant and
                        stretch it across 400px. Straight through, it is pixel for pixel what
                        the live page shows. */}
                    <Image
                        src="/rn/night-camera.jpg"
                        alt=""
                        width={400}
                        height={427}
                        unoptimized
                    />
                </div>

                <div>
                    <h2 id="rn-night" className={`rnH2 ${s.ctaHead}`}>{t.nightHead}</h2>

                    <p className={s.ctaActions}>
                        <Link href={`/${locale}/products`} className="rnBtn rnBtnSolid">{t.nightButton}</Link>
                    </p>
                </div>
            </div>
        </section>
    );
}

/* "Support on over 160 tracks": a heading band on the reading rail, then a full-width row of
   four regions, each a darkened circuit photograph linking into RN's track list.

   The hover is theirs, copied off the live tiles rather than invented. The photograph is drawn
   50px wider than its frame and parked 40px to the left, and the region name sits 40px below
   where it belongs; on hover both slide to zero, so the picture drifts right as the name rises
   into place. The two moving in opposite directions is what gives it the depth.

   Each tile links to RN's own track list, which this rebuild does not have, so they are inert
   for now. */
export function RnTracks({ locale }: { locale: string }) {
    const t = rnHome(locale);

    return (
        <section className="rnLight" aria-labelledby="rn-tracks">
            <div className={`rnRail ${s.tracksHead}`}>
                <h2 id="rn-tracks" className="rnH2">{t.tracksHead}</h2>
                <p className={s.tracksBody}>{t.tracksBody}</p>
            </div>

            <ul className={s.tracksRow}>
                {RN_TRACKS.map((region) => (
                    <li key={region.name}>
                        <a className={s.trackTile} href={region.href}>
                            <Image
                                className={s.trackShot}
                                src={region.src}
                                alt=""
                                width={600}
                                height={347}
                                sizes="(max-width: 700px) 50vw, 25vw"
                                quality={82}
                            />
                            <span className={s.trackName}>{region.name}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/* "News." — the heading and the brush band it sits on.

   Live's block is a social-stream plugin that currently renders "AX Social Stream: There is no
   feed data to display!". There is nothing here to copy and nothing of theirs to put in its
   place, so the band stands empty, at the height live gives it, ready for a real feed. */
export function RnNews({ locale }: { locale: string }) {
    const t = rnHome(locale);

    return (
        <section className="rnLight" aria-labelledby="rn-news">
            <div className={`rnRail ${s.newsHead}`}>
                <h2 id="rn-news" className="rnH2">{t.newsHead}</h2>
            </div>

            <div className={s.newsBand} />
        </section>
    );
}
