'use client';

import { useCallback, useId, useState } from 'react';
import s from './RnSupportPage.module.css';

/* RN's supported circuits: fifty countries, 263 circuits, and under most of them a run of
   layout variants — Wachauring alone has fourteen.

   Live sorts them into four regions behind tabs standing on a red brush wash, which is the only
   structure the page has, so the tabs are here too — wearing the same band as the FAQ, since
   live gives both pages the identical treatment. Within a region each country is a block in a
   column layout, so the eye can find a country rather than scroll to it, and the variants sit
   under their circuit where they belong instead of running on as siblings.

   Unlike the FAQ tabs, the regions are wildly uneven — 152 circuits in Europe against 16 in
   Australia & Oceania — so there is no exit animation to sit through and no stacking to hold
   the tallest. The pane simply swaps. */

export type Country = {
    readonly name: string;
    readonly circuits: readonly { readonly name: string; readonly layouts: readonly string[] }[];
};

export type Region = {
    readonly label: string;
    readonly countries: readonly Country[];
};

export default function RnTrackList({ regions, label }: { regions: readonly Region[]; label: string }) {
    const base = useId();
    const [active, setActive] = useState(0);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        const last = regions.length - 1;
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
        document.getElementById(`${base}-region-${next}`)?.focus();
    }, [active, base, regions.length]);

    const region = regions[active];
    const circuits = region.countries.reduce((n, c) => n + c.circuits.length, 0);

    return (
        <div className={`${s.tracks} ${s.washBand}`}>
            <div
                className={s.bigTabs}
                role="tablist"
                aria-label={label}
                onKeyDown={onKeyDown}
            >
                {regions.map((r, i) => (
                    <button
                        key={r.label}
                        id={`${base}-region-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        aria-controls={`${base}-panel-${i}`}
                        tabIndex={i === active ? 0 : -1}
                        className={`${s.bigTab} ${i === active ? s.bigTabOn : ''}`}
                        onClick={() => setActive(i)}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <div
                id={`${base}-panel-${active}`}
                role="tabpanel"
                aria-labelledby={`${base}-region-${active}`}
                tabIndex={0}
                /* Keyed on the region so React rebuilds the columns rather than reconciling
                   one country list into another, which would otherwise carry a Japanese
                   circuit over into Andorra's block for a frame. */
                key={region.label}
                className={s.washPane}
            >
                <p className={s.trackCount}>
                    {region.countries.length} / {circuits}
                </p>

                <div className={s.trackGrid}>
                    {region.countries.map((country, ci) => (
                        <section className={s.country} key={`${country.name}-${ci}`}>
                            <h3 className={s.countryName}>{country.name}</h3>
                            <ul className={s.circuitList}>
                                {/* Keyed on position as well as name: circuit names repeat
                                    within a country — Australia lists Wakefield Park twice —
                                    and so do layout names like "Grand Prix" across circuits,
                                    so the name alone is not unique. */}
                                {country.circuits.map((circuit, i) => (
                                    <li key={`${circuit.name}-${i}`}>
                                        <span className={s.circuitName}>{circuit.name}</span>
                                        {circuit.layouts.length > 0 && (
                                            <ul className={s.layoutList}>
                                                {circuit.layouts.map((l, li) => (
                                                    <li key={`${l}-${li}`}>{l}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
