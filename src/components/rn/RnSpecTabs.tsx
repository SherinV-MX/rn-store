'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import s from './RnProduct.module.css';

/* The specification tabs: technical data, settings, what is in the box, what can be added.

   A real tablist, like the product tabs on the home page — arrow keys move between tabs, Home
   and End jump to the ends — and the red rule slides between them rather than appearing and
   disappearing under each one.

   Switching is a handover rather than a swap, built the same way as the product tabs so the two
   read as the same site. The chosen tab is marked at once; the pane on show leaves the way the
   chosen tab lies, and the new one arrives from the other side, its headings and lines
   cascading in rather than all landing together. Tying the rule, the departure and the arrival
   to one direction is what makes it read as a single movement.

   The panes are different lengths — technical data runs to eleven lines, the box contents to
   nine — so all four are kept in the page, stacked in one grid cell with only the chosen one
   visible. A hidden pane still takes its space, so the cell is as tall as the longest of them
   and stays that way: a short pane leaves white space below it rather than dragging the
   photographs underneath up the page. Animating the height instead was worse — it moved
   everything below on every click.

   Every pane is two columns on the live page, and Settings fills only the first. That falls out
   of the content rather than needing a special case: a pane with one column gets one column. */

export type SpecTab = {
    label: string;
    cols: { head: string; items: string[] }[];
};

/* Long enough to read as a departure, short enough that nobody waits for it. Must match the
   exit animation in the stylesheet. */
const EXIT_MS = 220;

export default function RnSpecTabs({ tabs, label }: { tabs: SpecTab[]; label: string }) {
    const base = useId();

    /* `active` is the tab that has been chosen; `shown` is the pane still on screen. The two
       differ only while the old one is on its way out. */
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

        /* Someone who has asked not to be animated should not be made to sit through the length
           of an animation they will never see. */
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

    return (
        <div className={s.spec} style={{ ['--rn-dir' as string]: dir }}>
            <div className={s.specTabs} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
                {tabs.map((t, i) => (
                    <button
                        key={t.label}
                        id={`${base}-tab-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        aria-controls={`${base}-panel-${i}`}
                        tabIndex={i === active ? 0 : -1}
                        className={`${s.specTab} ${i === active ? s.specTabOn : ''}`}
                        onClick={() => select(i)}
                    >
                        {t.label}
                    </button>
                ))}

                {/* One rule that travels, as on the product tabs. The offset is a plain
                    percentage worked out here: a transform built from a custom property does
                    not reliably start a transition. The rule is narrower than the tab it sits
                    under, which the stylesheet handles by painting it inset. */}
                <span
                    className={s.specInk}
                    style={{
                        width: `${100 / tabs.length}%`,
                        transform: `translateX(${active * 100}%)`,
                    }}
                    aria-hidden="true"
                />
            </div>

            {/* All four panes live here, one on top of the other. The tallest sets the height,
                so the section never changes size. */}
            <div className={s.specStage}>
                {tabs.map((t, i) => {
                    const on = i === shown && !leaving;
                    const going = i === shown && leaving;
                    return (
                        <div
                            key={t.label}
                            id={`${base}-panel-${i}`}
                            role="tabpanel"
                            aria-labelledby={`${base}-tab-${i}`}
                            tabIndex={on ? 0 : -1}
                            /* Hidden panes are out of the accessibility tree by way of
                                visibility, and inert keeps their links and focus out of reach
                                without taking their space away. */
                            inert={!on && !going}
                            className={[
                                s.specPane,
                                on ? s.specPaneOn : '',
                                going ? s.specPaneLeaving : '',
                            ].filter(Boolean).join(' ')}
                        >
                            {t.cols.map((col, ci) => (
                                <div className={s.specCol} key={col.head || 'only'}>
                                    {col.head && (
                                        <p
                                            className={s.specColHead}
                                            style={{ ['--rn-in' as string]: `${ci * 70}ms` }}
                                        >
                                            {col.head}
                                        </p>
                                    )}
                                    <ul className={s.specList}>
                                        {col.items.map((item, k) => (
                                            <li
                                                key={item}
                                                /* The lines follow their heading down the
                                                   column. The step is small and capped, so an
                                                   eleven-line list finishes at about the same
                                                   moment as a four-line one rather than
                                                   trailing far behind it. */
                                                style={{
                                                    ['--rn-in' as string]:
                                                        `${ci * 70 + 60 + Math.min(k, 9) * 26}ms`,
                                                }}
                                            >
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
