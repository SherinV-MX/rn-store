'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './RnSupportPage.module.css';

/* The sample layouts on Video Layouts: fifteen stills of a lap, each with a different data
   overlay, shown one at a time with an arrow either side, as live shows them.

   Unlike the walkthrough slider this carries no words — the pictures are the point, and live
   gives them no caption, no red band and no step titles. So it is its own small thing rather
   than the walkthrough with its text cell switched off.

   The one leaving stays mounted until its fade finishes, so the two cross over each other.
   Swapping on the key alone took the old picture away the instant the new one mounted, which
   left a flash of empty box in the middle of every step — the thing that made it feel abrupt
   however long the incoming animation ran. */

export type LayoutShot = { src: string; w: number; h: number };

/* Long enough for the slide to be followed, short enough that holding the arrow down still
   feels responsive. Must match the animations in the stylesheet. */
const FADE_MS = 520;

export default function RnLayoutSlides({
    shots,
    label,
}: {
    shots: LayoutShot[];
    label: string;
}) {
    const [at, setAt] = useState(0);
    const [dir, setDir] = useState(1);
    /* The picture on its way out, held until its fade ends. */
    const [leaving, setLeaving] = useState<number | null>(null);
    /* Nothing animates until the first press. The slide is a reaction to an arrow, so running
       it on mount would have the opening picture arrive from off-frame — an empty box for half
       a second on a page nobody has touched yet. */
    const [moved, setMoved] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const go = useCallback((delta: number) => {
        setDir(delta);
        setMoved(true);
        setLeaving(at);
        setAt((at + delta + shots.length) % shots.length);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setLeaving(null), FADE_MS);
    }, [at, shots.length]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setDir(-1); setAt(0); }
        else if (e.key === 'End') { e.preventDefault(); setDir(1); setAt(shots.length - 1); }
    };

    const shot = shots[at];
    /* Held at the first still's shape, so the box does not jump as the layouts change. */
    const ratio = shots[0] ? shots[0].w / shots[0].h : 16 / 9;

    return (
        <section
            className={s.layouts}
            aria-roledescription="carousel"
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKeyDown}
            style={{
                ['--rn-layout-ratio' as string]: String(ratio),
                ['--rn-dir' as string]: dir,
            }}
        >
            <div className={s.layoutFrame}>
                {leaving !== null && leaving !== at && (
                    <Image
                        key={`out-${shots[leaving].src}`}
                        className={`${s.layoutImg} ${s.layoutOut}`}
                        src={shots[leaving].src}
                        alt=""
                        width={shots[leaving].w}
                        height={shots[leaving].h}
                        sizes="(max-width: 1200px) 100vw, 1120px"
                        quality={82}
                        aria-hidden="true"
                    />
                )}
                {/* Re-keyed so React mounts a new picture and the fade runs again, rather
                    than re-pointing one img at a new file — which would hold the old frame
                    on screen until the next had decoded. */}
                <Image
                    key={shot.src}
                    className={`${s.layoutImg} ${moved ? s.layoutIn : s.layoutFirst}`}
                    src={shot.src}
                    alt=""
                    width={shot.w}
                    height={shot.h}
                    sizes="(max-width: 1200px) 100vw, 1120px"
                    quality={82}
                    priority={at === 0}
                />

                <button
                    type="button"
                    className={`${s.layoutArrow} ${s.layoutPrev}`}
                    onClick={() => go(-1)}
                    aria-label={`Previous layout in ${label}`}
                >
                    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                        <path
                            d="M15 4 7 12l8 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    className={`${s.layoutArrow} ${s.layoutNext}`}
                    onClick={() => go(1)}
                    aria-label={`Next layout in ${label}`}
                >
                    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                        <path
                            d="M9 4l8 8-8 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>

            {/* Fifteen unlabelled stills give no sense of how far along you are, and unlike the
                walkthrough there are no words to tell you. */}
            <p className={s.layoutCount}>
                <span className={s.layoutNow}>{String(at + 1).padStart(2, '0')}</span>
                <span> / {String(shots.length).padStart(2, '0')}</span>
            </p>
        </section>
    );
}
