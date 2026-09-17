'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/components/shop/CartProvider';
import styles from './StoreHeader.module.css';

export interface HeaderDict {
    store: string;
    support: string;
    cart: string;
}

export default function StoreHeader({ locale, dict }: { locale: string; dict: HeaderDict }) {
    const { cart, setOpen } = useCart();
    const count = cart?.totalQuantity ?? 0;

    return (
        <header className={styles.header}>
            <div className={`shell ${styles.inner}`}>
                <Link href={`/${locale}`} className={styles.brand}>
                    BSS <span className={styles.brandMark}>LogisQ</span>
                </Link>

                <nav className={styles.nav}>
                    <Link href={`/${locale}`} className={styles.link}>{dict.store}</Link>
                    <a href="https://bss-logisq.com/en/contact" className={styles.link}>{dict.support}</a>
                </nav>

                <button
                    type="button"
                    className={styles.cartBtn}
                    onClick={() => setOpen(true)}
                    /* The count belongs in the label, not only in the badge — a screen reader
                       otherwise hears "Cart" whether it holds nothing or nine things. */
                    aria-label={`${dict.cart} (${count})`}
                >
                    <ShoppingCart size={18} aria-hidden="true" />
                    <span className={styles.cartText}>{dict.cart}</span>
                    {count > 0 && <span className={styles.badge}>{count}</span>}
                </button>
            </div>
        </header>
    );
}
