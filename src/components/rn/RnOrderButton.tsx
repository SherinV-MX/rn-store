'use client';

import { useState } from 'react';
import { useCart } from '@/components/shop/CartProvider';

/* "Order now" on the RN ONE page.

   It used to be a link to the catalogue, which made the visitor find the product again on a
   page that looks nothing like this one. Now it puts RN ONE in the cart and opens the drawer
   over the page they are already reading — the store and this rebuild share one cart, so the
   line is waiting for them whichever side they carry on from.

   The variant comes from Shopify on the server, so the button has nothing to look up and the
   click is a single request. If the product is missing from the shop the page falls back to
   the old link rather than rendering a button that cannot work. */
export default function RnOrderButton({
    variantId, label, busyLabel, className,
}: {
    variantId: string;
    label: string;
    busyLabel: string;
    className: string;
}) {
    const { addItem, setOpen, busy } = useCart();
    const [mine, setMine] = useState(false);

    const order = async () => {
        setMine(true);
        try {
            await addItem(variantId, 1);
            setOpen(true);
        } finally {
            setMine(false);
        }
    };

    return (
        <button type="button" className={className} onClick={order} disabled={busy}>
            {mine && busy ? busyLabel : label}
        </button>
    );
}
