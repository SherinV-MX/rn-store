'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { rnNav } from '@/content/rn';
import { useCart } from '@/components/shop/CartProvider';
import s from './RnChrome.module.css';

/* The site header: sticky, with the nav collapsing to a sheet below 1000px.

   The language control is a real link to the other locale rather than a toggle, so it works
   without JavaScript and can be crawled — the store next door does the same. */
export default function RnHeader({ locale }: { locale: string }) {
    const t = rnNav(locale);
    const { cart, setOpen: setCartOpen } = useCart();
    const count = cart?.totalQuantity ?? 0;
    const [open, setOpen] = useState(false);
    /* Transparent over the hero, solid once past it. */
    const [solid, setSolid] = useState(false);
    const other = locale === 'de' ? 'en' : 'de';

    useEffect(() => {
        const onScroll = () => setSolid(window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

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
        /* The live site has a support section of its own; this rebuild does not, so the
           link goes to the footer rather than to an anchor that is not there. */
        { label: t.support, href: `/${locale}/rn#contact` },
        { label: t.partners, href: `/${locale}/rn#partners` },
        { label: t.contact, href: `/${locale}/rn#contact` },
    ];

    return (
        <header className={`${s.header} ${solid || open ? s.headerSolid : ''}`}>
            <div className={`rnRail ${s.bar}`}>
                {/* Wordmark and nav travel together as one block, so the bar can centre them
                    without the actions beside them having to leave the flow. */}
                <div className={s.group}>
                {/* Two marks, both in the markup and swapped by CSS: the symbol alone over the
                    hero, the full lockup once the bar turns white — the black wordmark would
                    be invisible on the picture and the symbol alone looks lost on the bar.
                    Swapping the src instead would fetch an image mid-scroll. */}
                <Link href={`/${locale}/rn`} className={s.brand} aria-label="Race Navigator">
                    <Image
                        className={`${s.markImg} ${s.markMark}`}
                        src="/rn/logo.png"
                        alt="Race Navigator"
                        width={168}
                        height={96}
                        priority
                    />
                    <Image
                        className={`${s.markImg} ${s.markLockup}`}
                        src="/rn/logo-lockup.png"
                        alt=""
                        width={340}
                        height={60}
                        priority
                    />
                </Link>

                <nav className={s.nav} aria-label="Primary">
                    {links.map((l) => (
                        <Link key={l.label} href={l.href} className={s.navLink}>{l.label}</Link>
                    ))}
                </nav>
                </div>

                <div className={s.actions}>
                    {/* The rebuild and the shop share one cart, so this opens the same drawer
                        the store does, over the same lines. Always in the bar, whether or not
                        there is anything in it — a control that comes and goes is one people
                        have to hunt for. The count rides the corner only when there is one. */}
                    <button
                        type="button"
                        className={s.cartBtn}
                        onClick={() => setCartOpen(true)}
                        aria-label={count > 0 ? `${t.cart} (${count})` : t.cart}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7z"
                                  stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            <path d="M9 7V5.5a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.8"
                                  strokeLinecap="round" />
                        </svg>
                        {count > 0 && <span className={s.cartCount}>{count}</span>}
                    </button>

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
                        <Link key={l.label} href={l.href} className={s.sheetLink} onClick={() => setOpen(false)}>
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
