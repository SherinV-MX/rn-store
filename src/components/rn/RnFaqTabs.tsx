'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import s from './RnSupportPage.module.css';

/* RN's FAQ: six tabs by product, and inside each a run of questions with their answers.

   The tabs stand on the same red brush wash as the regions on the Supported Tracks page. That
   is not a borrowed idea — live gives the two pages the identical band, down to the picture
   file, the 50px labels 184px below the top of it and the questions starting 150px below its
   foot — so the band lives in the stylesheet once and both pages wear it.

   Built as a real tablist like the spec tabs on the RN ONE page — arrow keys move between tabs,
   Home and End jump to the ends — and the panes hand over in the direction of travel rather
   than swapping.

   Unlike the spec tabs, the panes here are wildly different lengths: twenty-odd answers under
   RN LITE against two under RN CONNECT. Stacking them to hold the tallest would leave most of
   the page empty, so this one lets the height follow the content. Nothing sits below it but the
   footer, so there is nothing for the change to shove around. */

export type FaqTab = {
    label: string;
    items: { q: string; a: string[] }[];
};

const EXIT_MS = 200;

export default function RnFaqTabs({ tabs, label }: { tabs: FaqTab[]; label: string }) {
    const base = useId();
    const [active, setActive] = useState(0);
    const [shown, setShown] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const [dir, setDir] = useState(1);
    const handover = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(handover.current), []);

    const select = useCallback((next: number) => {
        if (next === active) return;
        setActive(next);
        setDir(next > active ? 1 : -1);
        window.clearTimeout(handover.current);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShown(next);
            setLeaving(false);
            return;
        }
        setLeaving(true);
        handover.current = window.setTimeout(() => {
            setShown(next);
            setLeaving(false);
        }, EXIT_MS);
    }, [active]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        const last = tabs.length - 1;
        const map: Record<string, number> = {
            ArrowRight: active === last ? 0 : active + 1,
            ArrowLeft: active === 0 ? last : active - 1,
            Home: 0,
            End: last,
        };
        const next = map[e.key];
        if (next === undefined) return;
        e.preventDefault();
        select(next);
        document.getElementById(`${base}-tab-${next}`)?.focus();
    };

    const pane = tabs[shown];

    return (
        <div className={`${s.faq} ${s.washBand}`} style={{ ['--rn-dir' as string]: dir }}>
            <div className={s.bigTabs} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
                {tabs.map((t, i) => (
                    <button
                        key={t.label}
                        id={`${base}-tab-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        aria-controls={`${base}-panel-${i}`}
                        tabIndex={i === active ? 0 : -1}
                        className={`${s.bigTab} ${i === active ? s.bigTabOn : ''}`}
                        onClick={() => select(i)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div
                id={`${base}-panel-${active}`}
                role="tabpanel"
                aria-labelledby={`${base}-tab-${active}`}
                tabIndex={0}
                aria-busy={leaving}
                key={pane.label}
                className={`${s.faqPane} ${s.washPane} ${leaving ? s.faqPaneLeaving : ''}`}
            >
                {pane.items.map((item, i) => (
                    <article
                        className={s.faqItem}
                        key={item.q}
                        /* The answers arrive in order rather than all at once, capped so a
                           twenty-question pane does not take half a minute to finish. */
                        style={{ ['--rn-in' as string]: `${Math.min(i, 8) * 45}ms` }}
                    >
                        <h3 className={s.faqQ}>{item.q}</h3>
                        {item.a.map((para) => <p className={s.faqA} key={para}>{para}</p>)}
                    </article>
                ))}
            </div>
        </div>
    );
}
