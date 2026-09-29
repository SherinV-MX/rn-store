'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { rnHome } from '@/content/rn';
import s from './RnHome.module.css';

/* The closing band: a heading, a button, and the case opening beside them.

   The clip is RN's own case animation, and it runs closed to open and back to closed again —
   the file is named "2-way" for that reason. Played straight through it would shut the case in
   the visitor's face, so it is stopped at the halfway frame, where the lid is up and the
   contents are on show, and left there.

   The opening is the whole of the reveal. It used to be followed by a list naming what was
   inside, which was copy I had written rather than anything the client says, so it is gone;
   the picture does that job on its own. */

export default function RnCaseShowcase({ locale }: { locale: string }) {
    const t = rnHome(locale);
    const section = useRef<HTMLElement>(null);
    const video = useRef<HTMLVideoElement>(null);

    const frame = useRef(0);

    /* Where the lid is fully up. Half of a clip that opens and closes again. */
    const OPEN_AT_FALLBACK = 1.0; /* seconds, until metadata gives us the real duration */

    const openAt = () => {
        const d = video.current?.duration;
        return d && Number.isFinite(d) ? d / 2 : OPEN_AT_FALLBACK;
    };

    const play = useCallback(() => {
        const el = video.current;
        if (!el) return;

        cancelAnimationFrame(frame.current);
        el.currentTime = 0;
        /* A refused play is not a failure worth surfacing. */
        el.play().catch(() => {});

        /* timeupdate only fires a few times a second, which is enough to overshoot a
           two-second clip and catch the lid on its way back down. A frame loop stops it on
           the right one. */
        const stopWhenOpen = () => {
            const stop = el.duration && Number.isFinite(el.duration) ? el.duration / 2 : OPEN_AT_FALLBACK;
            if (el.currentTime >= stop) {
                el.pause();
                el.currentTime = stop;
                return;
            }
            frame.current = requestAnimationFrame(stopWhenOpen);
        };
        frame.current = requestAnimationFrame(stopWhenOpen);
    }, []);

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    useEffect(() => {
        const el = section.current;
        if (!el) return;

        /* Every state change happens inside the observer's callback rather than in the effect
           body, including the reduced-motion shortcut — a synchronous setState here would make
           React render twice before paint. */
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                io.disconnect();
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    /* Show it open without animating there. */
                    const v = video.current;
                    if (v) v.currentTime = openAt();
                    return;
                }
                play();
            },
            /* Wait until a good part of it is on screen, so the animation is not spent while
               the section is still a sliver at the bottom of the window. */
            { threshold: 0.45 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [play]);

    return (
        <section className={`rnSection ${s.cta}`} ref={section}>
            <div className={`rnRail ${s.ctaGrid}`}>
                <div>
                    <h2 className={`rnH2 ${s.ctaHead}`}>{t.ctaHead}</h2>

                    <p className={s.ctaActions}>
                        <Link href={`/${locale}/rn/rn-one`} className="rnBtn rnBtnSolid">{t.ctaButton}</Link>
                    </p>
                </div>

                <div className={s.caseStage}>
                    <video
                        ref={video}
                        className={s.caseVideo}
                        width={550}
                        height={534}
                        muted
                        playsInline
                        preload="metadata"
                        /* No controls and no loop: it is a two-second reveal, not a video the
                           visitor is meant to operate. */
                        aria-label={locale === 'de'
                            ? 'Der RN Koffer öffnet sich und zeigt Gerät, Halterung und Zubehör'
                            : 'The RN case opens to show the unit, mount and accessories'}
                    >
                        <source src="/rn/case-open.mp4" type="video/mp4" />
                    </video>
                </div>
            </div>
        </section>
    );
}
