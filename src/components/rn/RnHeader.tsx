'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { rnNav } from '@/content/rn';
import s from './RnChrome.module.css';

/* The site header: sticky, with the nav collapsing to a sheet below 1000px.

   The language control is a real link to the other locale rather than a toggle, so it works
   without JavaScript and can be crawled — the store next door does the same. */
export default function RnHeader({ locale }: { locale: string }) {
    const t = rnNav(locale);
    const [open, setOpen] = useState(false);
    const other = locale === 'de' ? 'en' : 'de';

    /* A sheet that stays open while the page scrolls underneath is a trap on a phone. */
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('resize', close);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const links = [
        { label: t.products, href: `/${locale}/rn#systems` },
        { label: t.support, href: `/${locale}/rn#support` },
        { label: t.partners, href: `/${locale}/rn#partners` },
        { label: t.contact, href: `/${locale}/rn#contact` },
    ];

    return (
        <header className={s.header}>
            <div className={`rnRail ${s.bar}`}>
                <Link href={`/${locale}/rn`} className={s.brand} aria-label="Race Navigator">
                    <span className={s.mark}>
                        <span className={s.markGlyph} aria-hidden="true">RN</span>
                        <span className={s.markWord}>
                            Race
                            <small>Navigator</small>
                        </span>
                    </span>
                </Link>

                <nav className={s.nav} aria-label="Primary">
                    {links.map((l) => (
                        <Link key={l.href} href={l.href} className={s.navLink}>{l.label}</Link>
                    ))}
                </nav>

                <div className={s.actions}>
                    <Link href={`/${other}/rn`} className={s.lang} hrefLang={other} title={t.switchTo}>
                        {other}
                    </Link>
                    <Link href={`/${locale}/products`} className={`rnBtn rnBtnSolid ${s.store}`}>
                        {t.store}
                    </Link>
                    <button
                        type="button"
                        className={`${s.burger} ${open ? s.burgerOpen : ''}`}
                        aria-expanded={open}
                        aria-controls="rn-menu"
                        aria-label={open ? t.close : t.menu}
                        onClick={() => setOpen((v) => !v)}
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </div>

            <div id="rn-menu" className={s.sheet} hidden={!open}>
                <div className={`rnRail ${s.sheetInner}`}>
                    {links.map((l) => (
                        <Link key={l.href} href={l.href} className={s.sheetLink} onClick={() => setOpen(false)}>
                            {l.label}
                        </Link>
                    ))}
                    <div className={s.sheetActions}>
                        <Link href={`/${locale}/products`} className="rnBtn rnBtnSolid" onClick={() => setOpen(false)}>
                            {t.store}
                        </Link>
                        <Link href={`/${other}/rn`} className="rnBtn rnBtnGhost" hrefLang={other}>
                            {other === 'de' ? 'Deutsch' : 'English'}
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
