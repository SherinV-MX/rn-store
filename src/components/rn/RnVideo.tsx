'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import s from './RnHome.module.css';

/* The film band: RN's brush-stroke backdrop, their frame artwork, and a film inside it.

   The artwork supplies the surround only — the rounded case, the drop shadow and the red
   "NEU!" flash. The window inside it is the film itself, sitting on its own first frame from
   the moment the page loads, so pressing play does not swap one picture for another: the frame
   that was already there simply starts moving. The clip is buffered by then, so there is no
   wait and nothing fades.

   No controls at all. A play mark while it is stopped, and the picture itself is the switch —
   no bar, no scrubber, no clock, no fullscreen. This is a film on a page rather than something
   to be operated.

   Nothing third-party is involved either: no embed, no YouTube, no cookies. The file is served
   from this site like any other asset.

   The clip is a stand-in for the demo. RN's own Christian Menzel film exists only on YouTube
   and is not ours to copy, so this is public-domain footage (US Navy, via Wikimedia Commons —
   see public/rn/README.md). Swapping in the real file is a one-line change. */

const CLIP = '/rn/video/reel.webm';

/* The footage opens on three quarters of a second of pure black before the first picture.
   Without ffmpeg to hand the file cannot be trimmed, so the player treats this as its zero: it
   starts here and returns here when the film ends. */
const START = 0.9;

export default function RnVideo({ locale }: { locale: string }) {
    const [playing, setPlaying] = useState(false);
    const video = useRef<HTMLVideoElement>(null);

    const toggle = useCallback(() => {
        const el = video.current;
        if (!el) return;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
    }, []);

    /* The element is the source of truth: it also stops on its own at the end, or if the
       browser declines to play. */
    useEffect(() => {
        const el = video.current;
        if (!el) return;

        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        /* Park on the first real frame, so that is what is on screen before and after. */
        const onMeta = () => { if (el.currentTime < START) el.currentTime = START; };
        const onEnded = () => { el.currentTime = START; };

        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('ended', onEnded);

        /* preload="auto" often has the metadata before this effect runs, in which case the
           event will not fire again. */
        if (el.readyState >= 1) queueMicrotask(onMeta);

        return () => {
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('ended', onEnded);
        };
    }, []);

    return (
        <section className={s.film} aria-label="Christian Menzel x Race Navigator">
            <div className={s.filmInner}>
                <div className={s.filmFrame}>
                    {/* Decorative: it is the case around the film, and the film carries the
                        content. */}
                    <Image
                        className={s.filmArt}
                        src="/rn/video/menzel-cover.png"
                        alt=""
                        width={1045}
                        height={583}
                        sizes="(max-width: 1000px) 100vw, 907px"
                        quality={85}
                    />

                    {/* The red "NEU!" flash is printed over the top-right corner of the
                        photograph, so the film covers it. This is the same artwork again,
                        clipped to just that corner and laid over the film. */}
                    <Image
                        className={s.filmBadge}
                        src="/rn/video/menzel-cover.png"
                        alt=""
                        width={1045}
                        height={583}
                        sizes="(max-width: 1000px) 100vw, 907px"
                        quality={85}
                        aria-hidden="true"
                    />

                    <div className={s.filmWindow}>
                        <video
                            ref={video}
                            className={s.filmVideo}
                            src={`${CLIP}#t=${START}`}
                            playsInline
                            /* Buffered up front, so the click plays rather than loads. */
                            preload="auto"
                            onClick={toggle}
                        />

                        {!playing && (
                            <button
                                type="button"
                                className={s.filmPlay}
                                onClick={toggle}
                                aria-label={locale === 'de'
                                    ? 'Film abspielen: Christian Menzel x Race Navigator'
                                    : 'Play the film: Christian Menzel x Race Navigator'}
                            >
                                <svg width="26" height="26" viewBox="0 0 16 16" aria-hidden="true">
                                    <path d="M4 2l10 6-10 6z" fill="currentColor" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
