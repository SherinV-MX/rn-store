/* Bridges the Shopify cart to the rate calculation, so lib/shipping/rates stays pure
   arithmetic over the spec and knows nothing about Shopify's shapes. */

import type { Cart, CartLine } from '@/lib/shopify/types';
import type { CartItem } from './rates';

const TO_GRAMS: Record<string, number> = {
    GRAMS: 1,
    KILOGRAMS: 1000,
    POUNDS: 453.59237,
    OUNCES: 28.349523125,
};

/* Section 2 is precise to grams, so a weight arriving in another unit is converted and
   rounded once, here, rather than being carried as a fraction into the bracket comparison. */
function grams(line: CartLine): number {
    const { weight, weightUnit } = line.merchandise;
    if (weight == null) return 0;
    return Math.round(weight * (TO_GRAMS[weightUnit] ?? 1));
}

export function itemsFromCart(cart: Cart): CartItem[] {
    return cart.lines.map((line) => ({
        grams: grams(line),
        quantity: line.quantity,
        /* Section 2: the flag is a manual decision by staff and defaults to no, so anything
           other than an explicit "true" means the product does not qualify. */
        smallItem: line.merchandise.product.smallItem?.value === 'true',
        requiresShipping: line.merchandise.requiresShipping,
    }));
}

/* Prices are stored net — the store is configured tax-exclusive — so the line totals add up
   to the net goods figure the spec's section 10 calls "Goods net". */
export function goodsNetCents(cart: Cart): number {
    return cart.lines.reduce(
        (sum, line) => sum + Math.round(Number.parseFloat(line.cost.totalAmount.amount) * 100),
        0,
    );
}
