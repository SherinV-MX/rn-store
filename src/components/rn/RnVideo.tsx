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

   Almost no controls. A play mark while it is stopped, the picture itself as the switch, and
   two buttons in the corner for the only things the picture cannot do on its own — silence it,
   and fill the screen with it. No bar, no scrubber, no clock. This is a film on a page rather
   than something to be operated.

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
    const de = locale === 'de';
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [full, setFull] = useState(false);
    const video = useRef<HTMLVideoElement>(null);
    const frame = useRef<HTMLDivElement>(null);

    const toggle = useCallback(() => {
        const el = video.current;
        if (!el) return;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
    }, []);

    /* Sound is off and on from the element, not from state: something else may mute it — the
       browser, the operating system, a later autoplay policy — and the button has to show what
       is true rather than what was last pressed. */
    const toggleMute = useCallback(() => {
        const el = video.current;
        if (!el) return;
        el.muted = !el.muted;
    }, []);

    /* Fullscreen goes on the window around the film, not on the video element.

       Fullscreening a <video> makes the browser take it over: Chrome draws its own control bar
       on top, and that bar carries a Download item and a playback-rate menu. Putting the
       window into fullscreen instead keeps this the player it is — our two buttons, no bar,
       nothing offering the file up — and the video simply fills it.

       iOS Safari has never implemented the standard API on an arbitrary element, only its own
       on the video, so that is the fallback there and only there. */
    const toggleFull = useCallback(() => {
        const box = frame.current;
        const el = video.current;
        if (!box || !el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
            return;
        }
        if (box.requestFullscreen) {
            box.requestFullscreen().catch(() => {});
            return;
        }
        (el as HTMLVideoElement & { webkitEnterFullscreen?: () => void })
            .webkitEnterFullscreen?.();
    }, []);

    useEffect(() => {
        const onChange = () => setFull(document.fullscreenElement === frame.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
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
        const onVolume = () => setMuted(el.muted);

        /* Silent until asked. A film that starts talking the moment someone presses it is the
           thing everyone hates about video on a page, and the button beside it is right there.

           Set here as well as in the markup because React does not serialise `muted` into the
           server HTML — it only applies it as a property once the component has hydrated, so
           for a moment the element would be a video with sound. Nothing autoplays, so that
           moment is harmless, but there is no reason to leave it. */
        el.muted = true;

        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('ended', onEnded);
        el.addEventListener('volumechange', onVolume);

        /* preload="auto" often has the metadata before this effect runs, in which case the
           event will not fire again. */
        if (el.readyState >= 1) queueMicrotask(onMeta);
        queueMicrotask(onVolume);

        return () => {
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('ended', onEnded);
            el.removeEventListener('volumechange', onVolume);
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
                        quality={82}
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
                        quality={82}
                        aria-hidden="true"
                    />

                    <div className={s.filmWindow} ref={frame}>
                        <video
                            ref={video}
                            className={s.filmVideo}
                            src={`${CLIP}#t=${START}`}
                            playsInline
                            muted
                            /* Buffered up front, so the click plays rather than loads. */
                            preload="auto"
                            /* Belt and braces against the file being taken. The window is what
                               goes fullscreen, so no native bar should ever appear — but if a
                               browser draws one anyway, it will not carry Download or a speed
                               menu, and the right-click Save is off. None of this makes the
                               file unreachable to anyone determined; it stops the player
                               inviting it. */
                            controlsList="nodownload noplaybackrate noremoteplayback"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
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

                        {/* The two things the picture cannot say on its own. They sit in the
                            corner rather than on a bar, and each one says what pressing it
                            will do rather than what the state currently is. */}
                        <div className={s.filmTools}>
                            <button
                                type="button"
                                className={s.filmTool}
                                onClick={toggleMute}
                                aria-pressed={muted}
                                aria-label={muted
                                    ? (de ? 'Ton einschalten' : 'Unmute')
                                    : (de ? 'Ton ausschalten' : 'Mute')}
                                title={muted
                                    ? (de ? 'Ton einschalten' : 'Unmute')
                                    : (de ? 'Ton ausschalten' : 'Mute')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                     aria-hidden="true">
                                    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                                    {muted
                                        ? <path d="M17 9l4 6M21 9l-4 6" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" />
                                        : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
                                                stroke="currentColor" strokeWidth="2"
                                                strokeLinecap="round" />}
                                </svg>
                            </button>

                            <button
                                type="button"
                                className={s.filmTool}
                                onClick={toggleFull}
                                aria-label={full
                                    ? (de ? 'Vollbild verlassen' : 'Exit fullscreen')
                                    : (de ? 'Vollbild' : 'Fullscreen')}
                                title={full
                                    ? (de ? 'Vollbild verlassen' : 'Exit fullscreen')
                                    : (de ? 'Vollbild' : 'Fullscreen')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                     strokeLinejoin="round" aria-hidden="true">
                                    {full
                                        ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                                        : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
