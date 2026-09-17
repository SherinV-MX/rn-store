'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from './CartProvider';
import { formatMoney } from '@/lib/shopify/format';
import styles from './CartDrawer.module.css';

export interface CartDict {
    title: string;
    empty: string;
    subtotal: string;
    taxNote: string;
    checkout: string;
    remove: string;
    close: string;
    quantity: string;
}

export default function CartDrawer({ locale, dict }: { locale: string; dict: CartDict }) {
    const { cart, busy, open, setOpen, setQuantity, removeItem } = useCart();
    const panel = useRef<HTMLDivElement>(null);

    /* Escape closes, and the page behind stops scrolling while the panel is open — otherwise
       a flick on a phone scrolls the product page underneath the drawer. */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        panel.current?.focus();
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, setOpen]);

    const lines = cart?.lines ?? [];

    return (
        <>
            <div
                className={`${styles.scrim} ${open ? styles.scrimOn : ''}`}
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />
            {/* inert while closed: an off-screen panel that still takes focus is the classic
                way a keyboard user ends up somewhere they cannot see. */}
            <aside
                className={`${styles.drawer} ${open ? styles.drawerOn : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={dict.title}
                inert={!open}
            >
                <div className={styles.head} ref={panel} tabIndex={-1}>
                    <h2 className={styles.title}>{dict.title}</h2>
                    <button
                        type="button" className={styles.close}
                        onClick={() => setOpen(false)} aria-label={dict.close}
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {lines.length === 0 ? (
                    <p className={styles.empty}>{dict.empty}</p>
                ) : (
                    <ul className={styles.lines}>
                        {lines.map((line) => (
                            <li key={line.id} className={styles.line}>
                                {line.merchandise.image && (
                                    <Image
                                        className={styles.thumb}
                                        src={line.merchandise.image.url}
                                        alt={line.merchandise.image.altText ?? line.merchandise.product.title}
                                        width={72}
                                        height={72}
                                    />
                                )}
                                <div className={styles.lineBody}>
                                    <p className={styles.lineName}>{line.merchandise.product.title}</p>
                                    {/* "Default Title" is what Shopify calls the only variant of a
                                        product with no options — showing it would be noise. */}
                                    {line.merchandise.title !== 'Default Title' && (
                                        <p className={styles.lineVariant}>{line.merchandise.title}</p>
                                    )}

                                    <div className={styles.lineFoot}>
                                        <div className={styles.stepper} role="group" aria-label={dict.quantity}>
                                            <button
                                                type="button" className={styles.step} disabled={busy}
                                                onClick={() => setQuantity(line.id, line.quantity - 1)}
                                                aria-label="-"
                                            ><Minus size={14} aria-hidden="true" /></button>
                                            <span className={styles.qty}>{line.quantity}</span>
                                            <button
                                                type="button" className={styles.step} disabled={busy}
                                                onClick={() => setQuantity(line.id, line.quantity + 1)}
                                                aria-label="+"
                                            ><Plus size={14} aria-hidden="true" /></button>
                                        </div>
                                        <span className={styles.linePrice}>
                                            {formatMoney(line.cost.totalAmount, locale)}
                                        </span>
                                    </div>

                                    <button
                                        type="button" className={styles.remove} disabled={busy}
                                        onClick={() => removeItem(line.id)}
                                    >{dict.remove}</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {cart && lines.length > 0 && (
                    <div className={styles.foot}>
                        <div className={styles.subtotal}>
                            <span>{dict.subtotal}</span>
                            <strong>{formatMoney(cart.cost.subtotalAmount, locale)}</strong>
                        </div>
                        <p className={styles.taxNote}>{dict.taxNote}</p>
                        {/* Our own checkout, on this domain. cart.checkoutUrl still exists as the
                            escape hatch if completing here is ever refused. */}
                        <Link className={styles.checkout} href={`/${locale}/checkout`} onClick={() => setOpen(false)}>
                            {dict.checkout}
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
}
