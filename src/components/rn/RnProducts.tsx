'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { rnCategories, rnHome } from '@/content/rn';
import { RnDeviceMark } from './RnArt';
import s from './RnHome.module.css';

/* The four product families, as tabs.

   Built as a real tablist — arrow keys move between tabs, Home and End jump to the ends — so
   it behaves the way a keyboard user expects rather than only responding to clicks.

   Switching family is a handover rather than a swap. The chosen tab is marked straight away,
   and the cards on show leave before the new ones arrive, both moving the way the chosen tab
   lies: pick a family to the right and the old cards slide off to the left while the new ones
   come in from the right. Tying both to the direction of travel is what makes the rule sliding
   along the tabs and the grid changing underneath read as one movement rather than two things
   happening at the same time. */

/* Long enough to read as a departure, short enough that nobody waits for it. Must match the
   exit animation in the stylesheet. */
const EXIT_MS = 240;

export default function RnProducts({ locale }: { locale: string }) {
    const categories = rnCategories(locale);
    const copy = rnHome(locale);
    const base = useId();

    /* `active` is the tab that has been chosen; `shown` is the family the grid is still
       displaying. The two differ only while the old cards are on their way out. */
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

        /* Someone who has asked not to be animated should not be made to sit through the
           length of an animation they will never see. */
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
        const last = categories.length - 1;
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

    const category = categories[shown];

    return (
        <section className="rnSection rnLight" id="systems">
            <div className="rnRail">
                <h2 className={s.headHidden}>{copy.productsHead}</h2>

                <div className={s.tabs} role="tablist" aria-label={copy.productsHead} onKeyDown={onKeyDown}>
                    {categories.map((c, i) => (
                        <button
                            key={c.id}
                            id={`${base}-tab-${i}`}
                            type="button"
                            role="tab"
                            aria-selected={i === active}
                            aria-controls={`${base}-panel-${i}`}
                            tabIndex={i === active ? 0 : -1}
                            className={`${s.tab} ${i === active ? s.tabOn : ''}`}
                            onClick={() => select(i)}
                        >
                            <Image className={s.tabIcon} src={c.icon} alt="" width={71} height={71} />
                            <span className={s.tabLabel}>{c.label}</span>
                        </button>
                    ))}

                    {/* One rule that travels between the columns rather than a rule per tab
                        appearing and disappearing. Decorative, so it is hidden from the
                        tablist; the selected tab is still announced by aria-selected.

                        The offset is worked out here rather than from a custom property in the
                        stylesheet: a transform built out of var() does not reliably start a
                        transition, and the rule simply jumped. A plain percentage animates. */}
                    <span
                        className={s.tabInk}
                        style={{
                            width: `${100 / categories.length}%`,
                            transform: `translateX(${active * 100}%)`,
                        }}
                        aria-hidden="true"
                    />
                </div>

                <div
                    id={`${base}-panel-${active}`}
                    role="tabpanel"
                    aria-labelledby={`${base}-tab-${active}`}
                    tabIndex={0}
                    /* Mid-handover the grid still holds the family being left behind, so a
                       screen reader is told to wait rather than read cards that are going. */
                    aria-busy={leaving}
                >
                    {/* Keyed on the family, so React replaces the cards rather than reusing
                        them and the entrance runs again on every switch. */}
                    <div
                        className={`${s.cards} ${leaving ? s.cardsLeaving : ''}`}
                        key={category.id}
                        style={{ ['--rn-dir' as string]: dir }}
                    >
                        {category.products.map((p, i) => {
                            const internal = p.href !== '#';
                            const href = internal ? `/${locale}/rn/${p.href}` : '#';
                            return (
                                <Link
                                    key={p.name}
                                    href={href}
                                    className={s.card}
                                    /* Arriving, the cards come in order. Leaving, they go in the
                                       same order but closer together, so the set clears towards
                                       the side it is heading for. */
                                    style={{
                                        ['--rn-in' as string]: `${60 + i * 80}ms`,
                                        ['--rn-out' as string]: `${i * 45}ms`,
                                    }}
                                >
                                    {p.image
                                        ? <Image className={s.cardShot} src={p.image} alt="" fill
                                                 /* The first card is twice the size of the other
                                                    two, so it is worth asking for twice the
                                                    pixels. */
                                                 sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 45vw"
                                                 quality={78} />
                                        : <RnDeviceMark className={s.cardArt} />}
                                    {/* The full stop is part of the mark on the live site and it
                                        is red. It is decoration, so it stays out of the text. */}
                                    <h3 className={s.cardName}>{p.name}<span aria-hidden="true">.</span></h3>
                                    <p className={s.cardTag}>{p.tagline}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
