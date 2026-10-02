'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './RnSupportPage.module.css';

/* A walkthrough, one step at a time: the caption on the left over a red band, the screenshot on
   the right standing proud of it.

   Live steps through an update with thirteen shots of the dashboard and fourteen of the RN
   Connect app, each run in a slider showing two cells at once — a text cell and a picture cell.
   The first pass through this page kept only the pictures and stacked all twenty-seven down the
   page, which turned two short walkthroughs into a wall of near-identical screenshots with
   nothing to say what any of them meant.

   The band is a full-bleed stripe behind the row rather than a box around it, as live has it:
   the picture is taller than the stripe and hangs over it top and bottom.

   Which side the picture sits on is live's own choice per run, and the arrows follow it — the
   dashboard run puts its picture on the right with the arrows either side of it, the RN Connect
   run mirrors the whole thing. */

/* Must match the animations in the stylesheet. */
const FADE_MS = 400;

export type Step = {
    src: string;
    w: number;
    h: number;
    /* The caption. Mode Activation also titles each step — "SETTINGS:", "NETWORK:" — above it;
       Device Updates titles none, and an empty title simply draws nothing. */
    t: string;
    title: string;
};

export default function RnStepCarousel({
    steps,
    label,
    mirrored = false,
}: {
    steps: Step[];
    label: string;
    mirrored?: boolean;
}) {
    const [at, setAt] = useState(0);
    const [dir, setDir] = useState(1);
    /* The picture on its way out, held until its fade ends so the two cross over rather than
       the old one vanishing the instant the new one mounts. */
    const [leaving, setLeaving] = useState<number | null>(null);
    /* Nothing animates until the first press, so the opening step is simply there. */
    const [moved, setMoved] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const go = useCallback((delta: number) => {
        setDir(delta);
        setMoved(true);
        setLeaving(at);
        /* Wraps, so the last arrow does not dead-end on a thirteen-step walkthrough. */
        setAt((at + delta + steps.length) % steps.length);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setLeaving(null), FADE_MS);
    }, [at, steps.length]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setDir(-1); setAt(0); }
        else if (e.key === 'End') { e.preventDefault(); setDir(1); setAt(steps.length - 1); }
    };

    const step = steps[at];
    /* The band is sized off the tallest picture in the run, so it does not jump as the steps
       change — live's RN Connect run mixes portrait phone shots with landscape ones. */
    const tallest = steps.reduce((n, x) => Math.max(n, x.h), 0);

    return (
        <section
            className={`${s.walk} ${mirrored ? s.walkMirrored : ''}`}
            aria-roledescription="carousel"
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKeyDown}
            style={{
                ['--rn-step-h' as string]: `${tallest}px`,
                /* Which way the next step comes in from. */
                ['--rn-dir' as string]: dir,
            }}
        >
            <div className={s.walkBand} aria-hidden="true" />

            <div className={s.walkRow}>
                <div className={s.walkText}>
                    {/* Re-keyed on the step so React mounts new text and the enter animation
                        runs again, rather than retargeting the old. */}
                    <div className={`${s.walkWords} ${moved ? '' : s.walkFirst}`} key={at}>
                        {step.title && <h3 className={s.walkTitle}>{step.title}</h3>}
                        <p className={s.walkCaption} aria-live="polite">{step.t}</p>
                    </div>
                </div>

                <div className={`${s.walkShot} ${s.walkShotStack}`}>
                    {leaving !== null && leaving !== at && (
                        <Image
                            key={`out-${steps[leaving].src}`}
                            className={`${s.walkImg} ${s.walkImgOut}`}
                            src={steps[leaving].src}
                            alt=""
                            width={steps[leaving].w}
                            height={steps[leaving].h}
                            sizes="(max-width: 860px) 100vw, 560px"
                            quality={82}
                            aria-hidden="true"
                        />
                    )}
                    {/* Keyed on the step so React swaps the picture rather than re-pointing
                        one img at a new file, which would leave the old frame on screen until
                        the next decoded — and so the enter animation runs on each one. */}
                    <Image
                        key={step.src}
                        className={`${s.walkImg} ${moved ? '' : s.walkFirst}`}
                        src={step.src}
                        alt=""
                        width={step.w}
                        height={step.h}
                        sizes="(max-width: 860px) 100vw, 560px"
                        quality={82}
                        priority={at === 0}
                    />
                </div>
            </div>

            <div className={s.walkNav}>
                <button
                    type="button"
                    className={s.walkArrow}
                    onClick={() => go(-1)}
                    aria-label={`Previous step in ${label}`}
                >
                    <svg viewBox="0 0 24 24" width="35" height="35" aria-hidden="true">
                        <path
                            d="M15 4 7 12l8 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>


                <button
                    type="button"
                    className={s.walkArrow}
                    onClick={() => go(1)}
                    aria-label={`Next step in ${label}`}
                >
                    <svg viewBox="0 0 24 24" width="35" height="35" aria-hidden="true">
                        <path
                            d="M9 4l8 8-8 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </section>
    );
}
