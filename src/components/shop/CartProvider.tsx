'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Cart } from '@/lib/shopify/types';

/* Cart state for the whole page. Every mutation returns the new cart from the server, so
   this holds no derived state of its own — nothing to get out of step with Shopify. */

interface CartContextValue {
    cart: Cart | null;
    /* An add/update is in flight. Buttons disable on this rather than on a per-button flag,
       because two clicks racing each other on the same cart is how quantities go wrong. */
    busy: boolean;
    /* False until the first load has settled. Without it a page cannot tell "no cart" from
       "not asked yet", and the checkout announces an empty cart a beat before the real one
       arrives. */
    ready: boolean;
    /* A message the buyer should see — sold out, quantity above stock. Null otherwise. */
    error: string | null;
    open: boolean;
    setOpen: (open: boolean) => void;
    /* For the checkout, which drives its own mutations through /api/shop/checkout and hands
       the resulting cart back so the header count and drawer stay in step. */
    setCart: (cart: Cart | null) => void;
    addItem: (merchandiseId: string, quantity?: number) => Promise<void>;
    setQuantity: (lineId: string, quantity: number) => Promise<void>;
    removeItem: (lineId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}

export default function CartProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
    const [cart, setCart] = useState<Cart | null>(null);
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    /* Guards against a slow first response overwriting a newer one — the visitor who adds
       something before the initial GET lands would otherwise watch it disappear. */
    const seq = useRef(0);

    const call = useCallback(
        async (init: RequestInit & { method: string }, body?: Record<string, unknown>) => {
            const ticket = ++seq.current;
            setBusy(true);
            setError(null);
            try {
                const res = await fetch('/api/shop/cart', {
                    ...init,
                    headers: { 'Content-Type': 'application/json' },
                    body: body ? JSON.stringify({ ...body, locale }) : undefined,
                });
                const data = await res.json().catch(() => ({}));
                if (ticket !== seq.current) return;
                if (!res.ok) {
                    setError(data.message ?? 'cart_error');
                    return;
                }
                setCart(data.cart ?? null);
            } catch {
                if (ticket === seq.current) setError('network');
            } finally {
                if (ticket === seq.current) setBusy(false);
            }
        },
        [locale],
    );

    /* Pick up a cart left from an earlier visit. Silent: a visitor who has nothing in the
       cart must never see a spinner for it. */
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/shop/cart?locale=${locale}`)
            .then((res) => res.json())
            .then((data) => { if (!cancelled) setCart(data.cart ?? null); })
            .catch(() => { /* no cart is the normal case, not an error worth showing */ })
            .finally(() => { if (!cancelled) setReady(true); });
        return () => { cancelled = true; };
    }, [locale]);

    const addItem = useCallback(
        async (merchandiseId: string, quantity = 1) => {
            await call({ method: 'POST' }, { merchandiseId, quantity });
            setOpen(true);
        },
        [call],
    );

    const setQuantity = useCallback(
        async (lineId: string, quantity: number) => { await call({ method: 'PATCH' }, { lineId, quantity }); },
        [call],
    );

    const removeItem = useCallback(
        async (lineId: string) => { await call({ method: 'DELETE' }, { lineId }); },
        [call],
    );

    const value = useMemo(
        () => ({ cart, busy, ready, error, open, setOpen, setCart, addItem, setQuantity, removeItem }),
        [cart, busy, ready, error, open, addItem, setQuantity, removeItem],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
