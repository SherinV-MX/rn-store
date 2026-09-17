'use client';

import { useMemo, useState } from 'react';
import { useCart } from './CartProvider';
import { formatMoney } from '@/lib/shopify/format';
import type { Product, ProductVariant } from '@/lib/shopify/types';
import styles from './BuyBox.module.css';

export interface ShopDict {
    addToCart: string;
    adding: string;
    soldOut: string;
    unavailable: string;
    quantity: string;
    inStock: string;
    lowStock: string;   /* takes {count} */
    taxNote: string;
}

/* Shopify gives a product with no options a single variant called "Default Title". Showing
   that as a choice would be nonsense, so the picker is hidden and the variant used directly. */
function hasRealOptions(product: Product): boolean {
    return !(product.options.length === 1 && product.options[0].values.length === 1
        && product.options[0].values[0] === 'Default Title');
}

function matchVariant(product: Product, chosen: Record<string, string>): ProductVariant | undefined {
    return product.variants.find((v) =>
        v.selectedOptions.every((o) => chosen[o.name] === o.value));
}

export default function BuyBox({
    product, locale, dict,
}: {
    product: Product;
    locale: string;
    dict: ShopDict;
}) {
    const { addItem, busy, error } = useCart();

    /* Start on something buyable: the first variant in stock, or the first one at all so the
       page still shows a price when everything is sold out. */
    const initial = useMemo(() => {
        const first = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
        return Object.fromEntries(first?.selectedOptions.map((o) => [o.name, o.value]) ?? []);
    }, [product]);

    const [chosen, setChosen] = useState<Record<string, string>>(initial);
    const [qty, setQty] = useState(1);

    const variant = matchVariant(product, chosen);
    const showOptions = hasRealOptions(product);
    /* quantityAvailable is null when the shop does not track inventory — then the only cap
       is our own sanity limit. */
    const max = Math.min(99, variant?.quantityAvailable ?? 99);
    const canBuy = Boolean(variant?.availableForSale) && !busy;

    const price = variant?.price ?? product.priceRange.minVariantPrice;
    const wasPrice = variant?.compareAtPrice ?? null;

    return (
        <div className={styles.box}>
            <div className={styles.priceRow}>
                <span className={styles.price}>{formatMoney(price, locale)}</span>
                {wasPrice && Number(wasPrice.amount) > Number(price.amount) && (
                    <span className={styles.was}>{formatMoney(wasPrice, locale)}</span>
                )}
            </div>
            <p className={styles.taxNote}>{dict.taxNote}</p>

            {showOptions && product.options.map((option) => (
                <fieldset key={option.id} className={styles.option}>
                    <legend className={styles.optionName}>{option.name}</legend>
                    <div className={styles.values}>
                        {option.values.map((value) => {
                            const candidate = matchVariant(product, { ...chosen, [option.name]: value });
                            const selected = chosen[option.name] === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    className={`${styles.value} ${selected ? styles.valueOn : ''}`}
                                    /* A combination the shop does not carry is disabled rather than
                                       hidden — a gap in the row tells the buyer more than a missing
                                       button does. */
                                    disabled={!candidate}
                                    aria-pressed={selected}
                                    onClick={() => setChosen((c) => ({ ...c, [option.name]: value }))}
                                >
                                    {value}
                                    {candidate && !candidate.availableForSale && (
                                        <span className={styles.valueOut}>{dict.soldOut}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            ))}

            <div className={styles.actions}>
                <div className={styles.stepper} role="group" aria-label={dict.quantity}>
                    <button
                        type="button" className={styles.step}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1} aria-label="−"
                    >−</button>
                    <span className={styles.qty} aria-live="polite">{qty}</span>
                    <button
                        type="button" className={styles.step}
                        onClick={() => setQty((q) => Math.min(max, q + 1))}
                        disabled={qty >= max} aria-label="+"
                    >+</button>
                </div>

                <button
                    type="button"
                    className={styles.add}
                    disabled={!canBuy}
                    onClick={() => variant && addItem(variant.id, qty)}
                >
                    {busy ? dict.adding : variant?.availableForSale ? dict.addToCart : dict.soldOut}
                </button>
            </div>

            {variant?.availableForSale && variant.quantityAvailable !== null && variant.quantityAvailable <= 5 && (
                <p className={styles.stock}>{dict.lowStock.replace('{count}', String(variant.quantityAvailable))}</p>
            )}

            {!variant && <p className={styles.error}>{dict.unavailable}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
    );
}
