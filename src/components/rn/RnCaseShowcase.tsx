'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { rnHome } from '@/content/rn';
import s from './RnHome.module.css';

/* The closing band: a heading, a button, and the case beside them.

   The clip is RN's own case animation and it runs closed to open and back to closed again —
   the file is named "2-way" for that reason. That makes the two halves useful separately: the
   first half opens the lid, the second half shuts it. So the case is a switch, and two things
   throw it: the scroll and the pointer.

   Scrolling is the main one. The case opens when the section arrives properly in the window and
   shuts once it has left entirely, every time the visitor passes it and whichever direction
   they come from — so it is packed again when they return to it rather than sitting open from
   an hour ago. Clicking it plays whichever half it needs at any point, and stops on the frame
   where that half ends.

   Playing backwards would be the obvious way to close it, but browsers do not do that: setting
   a negative playbackRate is ignored or stutters, and scrubbing frame by frame from script
   looks nothing like the filmed motion. Using the footage the way it was shot is both smoother
   and simpler. */

/* Seconds, until metadata gives us the real duration. */
const OPEN_AT_FALLBACK = 1.0;

/* How much of the section has to be in the window for the case to open, and how little before
   it shuts again — both as a fraction of the section's own height.

   Both numbers are high on purpose: the whole point of the two halves is that they are watched,
   so both have to run while there is plenty of the section on screen to watch them on. It opens
   at seven tenths, well clear of the edge, and shuts while nearly half of it is still in the
   window rather than waiting for it to be almost gone. An earlier pair of numbers — open at a
   half, shut at a fifth — put the closing frames in the last sliver at the edge of the screen,
   which is barely better than closing it after the section had left.

   The 0.25 between them is what stops the two chasing each other: without a gap, a slow or
   wavering scroll parks on the mark and flaps the lid. */
const OPEN_AT = 0.7;
const SHUT_AT = 0.45;

export default function RnCaseShowcase({ locale }: { locale: string }) {
    const t = rnHome(locale);
    const de = locale === 'de';

    const section = useRef<HTMLElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const frame = useRef(0);
    const guard = useRef<number | undefined>(undefined);

    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    /* The observer is built once and then reads the case's state on every crossing. Reading it
       from the `open` state would mean rebuilding the observer on each change, and a freshly
       observed element fires immediately with its current position — which would re-trigger the
       animation it had just finished. A ref alongside the state keeps the observer stable. */
    const openRef = useRef(false);

    const mark = useCallback((next: boolean) => {
        openRef.current = next;
        setOpen(next);
    }, []);

    /* Where the lid is fully up: half of a clip that opens and closes again. */
    const halfway = useCallback(() => {
        const d = video.current?.duration;
        return d && Number.isFinite(d) ? d / 2 : OPEN_AT_FALLBACK;
    }, []);

    /* Play one half and stop dead on its last frame.

       timeupdate only fires a few times a second, which is enough to overshoot a two-second
       clip and catch the lid on its way back down, so a frame loop watches instead. */
    const run = useCallback((toOpen: boolean) => {
        const el = video.current;
        if (!el) return;

        cancelAnimationFrame(frame.current);
        window.clearTimeout(guard.current);
        setBusy(true);

        const half = halfway();
        const end = el.duration && Number.isFinite(el.duration) ? el.duration : half * 2;
        const stop = toOpen ? half : end;
        el.currentTime = toOpen ? 0 : half;

        /* A refused play is not a failure worth surfacing — but the case must not be left
           claiming a state it never reached. */
        el.play().catch(() => {
            /* Refused autoplay is not worth surfacing, but the case must not be left claiming
               a state it never reached. */
            cancelAnimationFrame(frame.current);
            window.clearTimeout(guard.current);
            el.currentTime = stop;
            mark(toOpen);
            setBusy(false);
        });

        /* A deadline as well as a target. If the clip stalls, is never decoded, or the tab is
           in the background where frames stop being served, the loop would otherwise never
           reach its stop and the case would be left mid-press and deaf to further clicks.
           Half the clip plus a second is generous for a two-second file. */
        const deadline = performance.now() + (stop - el.currentTime) * 1000 + 1000;

        const land = () => {
            el.pause();
            /* A hair inside the end: seeking exactly to duration can land on a blank frame in
               some browsers. */
            el.currentTime = Math.min(stop, end - 0.02);
            mark(toOpen);
            setBusy(false);
        };

        const settle = () => {
            if (el.currentTime >= stop - 0.01 || el.ended || performance.now() > deadline) {
                land();
                return;
            }
            frame.current = requestAnimationFrame(settle);
        };
        frame.current = requestAnimationFrame(settle);

        /* requestAnimationFrame does not run at all in a background tab, so the deadline needs
           a timer that does. Whichever arrives first lands the case; the other is cancelled. */
        window.clearTimeout(guard.current);
        guard.current = window.setTimeout(() => {
            cancelAnimationFrame(frame.current);
            land();
        }, Math.max(0, deadline - performance.now()));
    }, [halfway, mark]);

    const toggle = useCallback(() => {
        if (busy) return;
        run(!open);
    }, [busy, open, run]);

    useEffect(() => () => {
        cancelAnimationFrame(frame.current);
        window.clearTimeout(guard.current);
    }, []);

    /* The case answers the scroll, not just the first sight of it: it opens as the section
       arrives and shuts as it leaves, as often as the visitor passes it and from whichever
       direction they come.

       Both halves are meant to be watched, so both fire while the section is still on screen.
       Closing only once it had gone was the obvious reading of "shuts when it leaves" and it
       was useless: the lid came down in an empty window and the visitor saw an open case go and
       a closed one come back, never the movement between them.

       Two thresholds rather than one, so the two events cannot chase each other. See OPEN_AT
       and SHUT_AT above for where they sit and why. Between those two marks nothing happens,
       and that gap is what stops a slow or wavering scroll from flapping the lid. */
    useEffect(() => {
        const el = section.current;
        if (!el) return;

        /* Every state change happens inside the observer's callback rather than in the effect
           body, including the reduced-motion shortcut — a synchronous setState here would make
           React render twice before paint. */
        /* A section taller than the window can never fill much of it, so on a short screen a
           fixed 0.7 would be a mark it never reaches and the case would never open. The two
           marks bend down to whatever this section can actually show, keeping their gap. */
        const reach = Math.min(1, window.innerHeight / (el.offsetHeight || 1));
        const openAt = Math.min(OPEN_AT, reach * 0.9);
        const shutAt = Math.max(0.05, Math.min(SHUT_AT, openAt - 0.25));

        const io = new IntersectionObserver(
            ([entry]) => {
                const seen = entry.intersectionRatio;
                const arriving = entry.isIntersecting && seen >= openAt;
                const leaving = seen <= shutAt;
                if (!arriving && !leaving) return;

                const next = arriving;
                if (next === openRef.current) return;

                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    /* Show the state without travelling to it. Clicking still works. */
                    const v = video.current;
                    if (v) v.currentTime = next ? halfway() : 0;
                    mark(next);
                    return;
                }
                run(next);
            },
            { threshold: [shutAt, openAt] },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [run, halfway, mark]);

    const label = open
        ? (de ? 'Koffer schließen' : 'Close the case')
        : (de ? 'Koffer öffnen' : 'Open the case');

    return (
        <section className={`rnSection ${s.cta}`} ref={section}>
            <div className={`rnRail ${s.ctaGrid}`}>
                <div>
                    <h2 className={`rnH2 ${s.ctaHead}`}>{t.ctaHead}</h2>

                    <p className={s.ctaActions}>
                        <Link href={`/${locale}/rn/rn-one`} className="rnBtn rnBtnSolid">{t.ctaButton}</Link>
                    </p>
                </div>

                {/* A real button, so it answers the keyboard and announces which way it will
                    go. aria-expanded says whether the case is open; the label says what
                    pressing will do. */}
                <button
                    type="button"
                    className={`${s.caseStage} ${s.caseToggle}`}
                    onClick={toggle}
                    aria-expanded={open}
                    aria-label={label}
                    title={label}
                >
                    <video
                        ref={video}
                        className={s.caseVideo}
                        width={550}
                        height={534}
                        muted
                        playsInline
                        preload="metadata"
                        /* No controls and no loop: the button around it is the control. */
                        aria-hidden="true"
                    >
                        <source src="/rn/case-open.mp4" type="video/mp4" />
                    </video>
                </button>
            </div>
        </section>
    );
}
