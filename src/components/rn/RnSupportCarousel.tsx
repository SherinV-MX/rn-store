'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import s from './RnSupport.module.css';

/* The six support tiles, as live runs them: four on screen at a time, stepping one at a time,
   looping forever, with an arrow at each edge of the band.

   Live does this with Slick, which clones slides either side of the real ones and moves a track
   whose width it computes in JavaScript. This does the same thing with CSS and far less of it:
   the six tiles are rendered three times over and the middle copy is the real one. Stepping
   moves the track by one tile; when the step would carry the track past the end of the middle
   copy it is silently jumped back a whole copy with the transition switched off, so the loop
   has no seam and there is no moment where the band is empty.

   The lily hover is RN's own, the same one their track tiles use: the picture is drawn wider
   than its frame and drifts as the title rises to meet it. */

export type SupportTile = { title: string; image: string; href: string };

/* An internal path gets next/link; anything else is a plain anchor off the site. */
function Tile({ href, children, ...rest }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    tabIndex?: number;
    'aria-current'?: 'page';
}) {
    if (href.startsWith('/')) return <Link href={href} {...rest}>{children}</Link>;
    return <a href={href} {...rest}>{children}</a>;
}

/* Three and a half rather than four, so the fourth tile is cut by the edge of the window. That
   half tile is the whole point: it is what tells somebody there is more to the right without a
   caption saying so. */
const PER_VIEW = 3.5;

export default function RnSupportCarousel({ tiles, prev, next, label, active = -1 }: {
    tiles: SupportTile[];
    prev: string;
    next: string;
    label: string;
    /* Which of the six is the page you are on. The band opens there rather than always on the
       first tile, so the page you are reading is under your hand and the ones after it are what
       you see next. Left out on the hub, which is not one of the six: it opens on the first and
       marks none of them as current. */
    active?: number;
}) {
    const count = tiles.length;

    /* Start on the middle copy, so there is a full set to travel through in either direction
       before the track has to be jumped — offset to the open page's tile. */
    const start = count + (active >= 0 ? Math.min(active, count - 1) : 0);
    const [at, setAt] = useState(start);

    /* Where we are in the real six, for the progress bar. `at` roams across three copies, so it
       is folded back down before it is shown. */
    const pos = ((at % count) + count) % count;
    const [animating, setAnimating] = useState(true);
    const settling = useRef(false);

    const step = useCallback((by: number) => {
        if (settling.current) return;
        setAnimating(true);
        setAt((n) => n + by);
    }, []);

    /* The jump home. It runs after the move has finished, with the transition off, so the track
       lands on the identical tile one copy over and nothing is seen to happen. */
    const onSettled = useCallback(() => {
        setAt((n) => {
            if (n >= count * 2) { setAnimating(false); return n - count; }
            if (n < count) { setAnimating(false); return n + count; }
            return n;
        });
    }, [count]);

    /* Turning the transition back on has to wait for a frame in which it was off, or the
       browser folds both changes into one and animates the jump it was meant to hide.

       The timer beside the frame request is not belt and braces, it is the fix for a lock-up.
       requestAnimationFrame does not run in a background tab — and does not run at all in some
       embedded viewers — so a carousel that waits only on a frame can be left with its
       transition switched off and its guard raised, refusing every further press for good.
       Whichever of the two arrives first releases it; the other is cancelled. */
    useEffect(() => {
        if (animating) return;
        settling.current = true;
        const release = () => {
            setAnimating(true);
            settling.current = false;
        };
        const frame = requestAnimationFrame(release);
        const timer = window.setTimeout(release, 120);
        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(timer);
        };
    }, [animating]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };

    /* Three copies: one to leave into, the real one, one to arrive from. */
    const run = [...tiles, ...tiles, ...tiles];

    return (
        <div
            className={s.carousel}
            role="group"
            aria-roledescription="carousel"
            aria-label={label}
            onKeyDown={onKeyDown}
        >
            <div className={s.viewport}>
                <ul
                    className={s.track}
                    style={{
                        width: `${(run.length / PER_VIEW) * 100}%`,
                        transform: `translateX(-${(at * 100) / run.length}%)`,
                        transition: animating ? undefined : 'none',
                    }}
                    onTransitionEnd={onSettled}
                >
                    {run.map((tile, i) => {
                        /* Only the middle copy is the real list; the other two are scenery and
                           are kept away from the keyboard and from screen readers. */
                        const real = i >= count && i < count * 2;
                        /* The page this tile points at is the one being read. */
                        const here = real && i - count === active;
                        return (
                            <li className={s.cell} key={`${tile.title}-${i}`} aria-hidden={!real}>
                                {/* Tiles that point inside this site route rather than
                                    navigate, so moving between support pages does not throw
                                    the whole document away and fetch it again. */}
                                <Tile
                                    className={s.tile}
                                    href={tile.href}
                                    tabIndex={real ? undefined : -1}
                                    aria-current={here ? 'page' : undefined}
                                >
                                    <Image
                                        className={s.shot}
                                        src={tile.image}
                                        alt=""
                                        fill
                                        /* Far wider than the tile looks, on purpose. These
                                           are 3:2 photographs cropped into a tall portrait
                                           frame, so the source has to be big enough for the
                                           HEIGHT: a 520-tall tile needs about 780px of a 1.5
                                           image, not the 360 its 25vw width would suggest. */
                                        sizes="(max-width: 760px) 80vw, 55vw"
                                        quality={82}
                                    />
                                    <span className={s.wash} aria-hidden="true" />

                                    {/* The set reads as a sequence: each tile carries its own
                                        number, counted within the real six rather than the
                                        three copies it is rendered in. */}
                                    <span className={s.tileNo} aria-hidden="true">
                                        {String((i % count) + 1).padStart(2, '0')}
                                    </span>

                                    <span className={s.tileFoot}>
                                        <span className={s.tileRule} aria-hidden="true" />
                                        <h3 className={s.tileTitle}>{tile.title}</h3>
                                    </span>
                                </Tile>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* A line under the strip that fills as you move through the six. Decorative — the
                tiles themselves are the content, and the arrows carry the labels. */}
            <div className={s.progress} aria-hidden="true">
                <span
                    className={s.progressFill}
                    style={{ width: `${((pos + 1) / count) * 100}%` }}
                />
            </div>

            <button type="button" className={`${s.arrow} ${s.arrowPrev}`}
                    onClick={() => step(-1)} aria-label={prev}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10 2 4 8l6 6" stroke="currentColor" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <button type="button" className={`${s.arrow} ${s.arrowNext}`}
                    onClick={() => step(1)} aria-label={next}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 2l6 6-6 6" stroke="currentColor" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    );
}
