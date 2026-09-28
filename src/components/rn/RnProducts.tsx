'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { rnCategories, rnHome } from '@/content/rn';
import { RnDeviceMark } from './RnArt';
import s from './RnHome.module.css';

/* The four product families, as tabs.

   Built as a real tablist — arrow keys move between tabs, Home and End jump to the ends — so
   it behaves the way a keyboard user expects rather than only responding to clicks. */
export default function RnProducts({ locale }: { locale: string }) {
    const categories = rnCategories(locale);
    const copy = rnHome(locale);
    const [active, setActive] = useState(0);
    const base = useId();

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
        setActive(next);
        document.getElementById(`${base}-tab-${next}`)?.focus();
    };

    const category = categories[active];

    return (
        <section className="rnSection rnLight" id="systems">
            <div className="rnRail">
                <div className={s.head}>
                    <p className="rnEyebrow">{copy.productsEyebrow}</p>
                    <h2 className="rnH2 rnUnderline">{copy.productsHead}</h2>
                    <p className="rnLead">{copy.productsIntro}</p>
                </div>

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
                            onClick={() => setActive(i)}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                <div
                    id={`${base}-panel-${active}`}
                    role="tabpanel"
                    aria-labelledby={`${base}-tab-${active}`}
                    tabIndex={0}
                >
                    <p className={s.blurb}>{category.blurb}</p>

                    <div className={s.cards}>
                        {category.products.map((p) => {
                            const internal = p.href !== '#';
                            const href = internal ? `/${locale}/rn/${p.href}` : '#';
                            return (
                                <Link key={p.name} href={href} className={s.card}>
                                    {p.image
                                        ? <Image className={s.cardShot} src={p.image} alt="" fill
                                                 sizes="(max-width: 700px) 100vw, 33vw" quality={78} />
                                        : <RnDeviceMark className={s.cardArt} />}
                                    {p.badge && <span className={s.cardBadge}>{p.badge}</span>}
                                    <h3 className={s.cardName}>{p.name}</h3>
                                    <p className={s.cardTag}>{p.tagline}</p>
                                    <span className={s.cardGo}>
                                        {internal
                                            ? (locale === 'de' ? 'Ansehen' : 'View')
                                            : (locale === 'de' ? 'Bald' : 'Soon')}
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2"
                                                  strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
