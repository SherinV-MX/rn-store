'use client';

import { useState } from 'react';
import Image from 'next/image';
import s from './RnProduct.module.css';

export interface Shot { src: string; alt: string }

/* The product showcase: the shot on the left, whatever is passed as children on the right,
   and the thumbnail strip under that — which is where the live page puts it. It looks odd
   written down, but the strip belongs to the text column there, not under the picture, and
   splitting it off would mean lifting the selected-shot state into a server component.

   Arrow keys move between shots and the thumbnail strip is a radiogroup, so it is operable
   without a mouse. Every image is rendered rather than swapped in and out, which keeps the
   next one already decoded when it is asked for. */
export default function RnGallery({ shots, label, children }: {
    shots: Shot[];
    label: string;
    children?: React.ReactNode;
}) {
    const [active, setActive] = useState(0);

    const onKeyDown = (e: React.KeyboardEvent) => {
        const last = shots.length - 1;
        const map: Record<string, number> = {
            ArrowRight: active === last ? 0 : active + 1,
            ArrowDown: active === last ? 0 : active + 1,
            ArrowLeft: active === 0 ? last : active - 1,
            ArrowUp: active === 0 ? last : active - 1,
        };
        const next = map[e.key];
        if (next === undefined) return;
        e.preventDefault();
        setActive(next);
    };

    return (
        <div className={s.gallery}>
            <div className={s.stage}>
                {shots.map((shot, i) => (
                    <Image
                        key={shot.src}
                        className={`${s.stageShot} ${i === active ? s.stageOn : ''}`}
                        src={shot.src}
                        alt={shot.alt}
                        width={392}
                        height={461}
                        priority={i === 0}
                        aria-hidden={i !== active}
                    />
                ))}
            </div>

            <div className={s.side}>
                {children}

                <div className={s.thumbs} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
                    {shots.map((shot, i) => (
                        <button
                            key={shot.src}
                            type="button"
                            role="radio"
                            aria-checked={i === active}
                            tabIndex={i === active ? 0 : -1}
                            className={`${s.thumb} ${i === active ? s.thumbOn : ''}`}
                            onClick={() => setActive(i)}
                        >
                            <Image src={shot.src} alt={shot.alt} width={98} height={115} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
