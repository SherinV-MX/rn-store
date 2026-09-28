'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { rnSlides } from '@/content/rn';
import s from './RnHero.module.css';

const DWELL_MS = 6500;

/* The hero carousel.

   Five slides on a timer, with arrows, a dot rail that doubles as the progress bar, keyboard
   arrows, and a pause whenever the visitor is plainly looking at it — hover, focus, or the tab
   in the background. Auto-advance stops permanently the moment someone takes control, because
   a carousel that keeps moving under a reader is the thing everyone hates about carousels. */
export default function RnHero({ locale }: { locale: string }) {
    const slides = rnSlides(locale);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [surrendered, setSurrendered] = useState(false);
    const region = useRef<HTMLDivElement>(null);

    const go = useCallback((next: number) => {
        setIndex((next + slides.length) % slides.length);
    }, [slides.length]);

    const take = useCallback((next: number) => {
        setSurrendered(true);
        go(next);
    }, [go]);

    useEffect(() => {
        if (paused || surrendered) return;
        const timer = setTimeout(() => go(index + 1), DWELL_MS);
        return () => clearTimeout(timer);
    }, [index, paused, surrendered, go]);

    /* A tab in the background should not burn through all five slides unseen. */
    useEffect(() => {
        const onVisibility = () => setPaused(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); take(index + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); take(index - 1); }
    };

    return (
        <section
            className={s.hero}
            aria-roledescription="carousel"
            aria-label="Race Navigator"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onKeyDown={onKeyDown}
            ref={region}
            tabIndex={-1}
        >
            <div className={s.canvas} aria-hidden="true" />

            {slides.map((slide, i) => (
                <div
                    key={slide.title}
                    className={`${s.slide} ${i === index ? s.slideOn : ''}`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${slides.length}`}
                    aria-hidden={i !== index}
                    /* inert keeps the hidden slides' links out of the tab order without
                       needing to unmount and re-layout them on every change. */
                    inert={i !== index}
                >
                    {/* The photograph sits behind the type with a gradient over it, dark enough
                        on the left that the headline holds its contrast whatever the frame shows.
                        Only the first slide is priority — the rest load as they come up. */}
                    <Image
                        className={s.shot}
                        src={slide.image}
                        alt={slide.variant === 'quote'
                            ? (locale === 'de'
                                ? 'Christian Menzel, Rennfahrer und Markenbotschafter'
                                : 'Christian Menzel, racing driver and brand ambassador')
                            : ''}
                        fill
                        sizes="100vw"
                        priority={i === 0}
                        quality={82}
                    />
                    <div
                        className={`${s.scrim} ${slide.variant === 'quote' ? s.scrimQuote : ''}`}
                        aria-hidden="true"
                    />

                    <div className={`${s.body} ${slide.variant === 'quote' ? s.bodyQuote : ''}`}>
                        {slide.variant === 'quote' ? (
                            <blockquote className={s.quote}>
                                <h1 className={s.quoteText}>{slide.title}</h1>
                            </blockquote>
                        ) : (
                            <>
                                <p className={s.eyebrow}>{slide.eyebrow}</p>
                                <h1 className={s.title}>{slide.title}</h1>
                                <div className={s.rule} aria-hidden="true" />
                                <p className={s.subtitle}>{slide.subtitle}</p>
                            </>
                        )}

                        <div className={s.actions}>
                            <Link
                                href={slide.href.startsWith('#') ? slide.href : `/${locale}/rn/${slide.href}`}
                                className="rnBtn rnBtnSolid"
                            >
                                {slide.cta}
                            </Link>
                            {/* The ambassador slide carries one call to action on the live site,
                                and a second button beside a pull quote reads as a form. */}
                            {slide.variant !== 'quote' && (
                                <Link href={`/${locale}/products`} className="rnBtn rnBtnGhost">
                                    {locale === 'de' ? 'Zum Shop' : 'To the store'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            <div className={`rnRail ${s.controls}`}>
                <div className={s.dots}>
                    {slides.map((slide, i) => (
                        <button
                            key={slide.title}
                            type="button"
                            className={`${s.dot} ${i === index ? s.dotOn : ''}`}
                            aria-label={slide.title}
                            aria-current={i === index}
                            onClick={() => take(i)}
                        />
                    ))}
                </div>

            </div>

            {/* Outside the control bar: they sit at the left and right edges of the picture, and
                nesting them in a positioned bar would resolve them against it instead. */}
            <div className={s.arrows}>
                <button type="button" className={s.arrow} onClick={() => take(index - 1)} aria-label="Previous slide">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M10 2 4 8l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button type="button" className={s.arrow} onClick={() => take(index + 1)} aria-label="Next slide">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 2l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </section>
    );
}
