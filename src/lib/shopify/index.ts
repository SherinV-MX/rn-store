import 'server-only';
import { storefront, ShopifyError } from './client';
import {
    PRODUCT_QUERY,
    CART_QUERY,
    CART_CREATE,
    CART_LINES_ADD,
    CART_LINES_UPDATE,
    CART_LINES_REMOVE,
} from './queries';
import type { Cart, Product } from './types';

export { ShopifyError } from './client';
export { shopIsConfigured } from './client';
export type * from './types';

export interface LineInput {
    merchandiseId: string;
    quantity: number;
}

/* Shopify's @inContext decides currency and translated content. Country drives the price,
   language drives the words, and they are not the same choice: an English reader buying
   from Germany still pays in euro. The shop's home country is the default, overridable
   once the store is live and its markets are known. */
function context(locale: string) {
    return {
        country: (process.env.SHOPIFY_DEFAULT_COUNTRY ?? 'DE').toUpperCase(),
        language: locale === 'de' ? 'DE' : 'EN',
    };
}

interface Connection<T> { nodes: T[] }
interface RawProduct extends Omit<Product, 'images' | 'variants'> {
    images: Connection<Product['images'][number]>;
    variants: Connection<Product['variants'][number]>;
}
interface RawCart extends Omit<Cart, 'lines'> {
    lines: Connection<Cart['lines'][number]>;
}

function flattenProduct(raw: RawProduct): Product {
    return { ...raw, images: raw.images.nodes, variants: raw.variants.nodes };
}

function flattenCart(raw: RawCart): Cart {
    return { ...raw, lines: raw.lines.nodes };
}

/* A mutation can fail while the HTTP call succeeds — a sold-out variant, a quantity above
   the stock limit. Those come back as userErrors, and they are the buyer's problem to see,
   not a 500. */
function unwrap(payload: { cart: RawCart | null; userErrors: { message: string }[] } | null): Cart {
    if (!payload) throw new ShopifyError('Cart mutation returned nothing');
    if (payload.userErrors?.length) {
        throw new ShopifyError(payload.userErrors.map((e) => e.message).join('; '), payload.userErrors);
    }
    if (!payload.cart) throw new ShopifyError('Cart mutation returned no cart');
    return flattenCart(payload.cart);
}

export async function getProduct(handle: string, locale: string): Promise<Product | null> {
    const data = await storefront<{ product: RawProduct | null }>(
        PRODUCT_QUERY,
        { handle, ...context(locale) },
        /* Product copy and prices change rarely and a stale minute is harmless; the cart is
           what has to be live. */
        { revalidate: 300 },
    );
    return data.product ? flattenProduct(data.product) : null;
}

/* Returns null rather than throwing when the cart is gone: Shopify expires carts and
   discards them once checkout completes, and the caller's answer to both is the same —
   start a new one. */
export async function getCart(cartId: string, locale: string): Promise<Cart | null> {
    const data = await storefront<{ cart: RawCart | null }>(CART_QUERY, { id: cartId, ...context(locale) });
    return data.cart ? flattenCart(data.cart) : null;
}

export async function createCart(lines: LineInput[], locale: string): Promise<Cart> {
    const data = await storefront<{ cartCreate: Parameters<typeof unwrap>[0] }>(
        CART_CREATE, { lines, ...context(locale) },
    );
    return unwrap(data.cartCreate);
}

export async function addLines(cartId: string, lines: LineInput[], locale: string): Promise<Cart> {
    const data = await storefront<{ cartLinesAdd: Parameters<typeof unwrap>[0] }>(
        CART_LINES_ADD, { cartId, lines, ...context(locale) },
    );
    return unwrap(data.cartLinesAdd);
}

export async function updateLine(cartId: string, id: string, quantity: number, locale: string): Promise<Cart> {
    const data = await storefront<{ cartLinesUpdate: Parameters<typeof unwrap>[0] }>(
        CART_LINES_UPDATE, { cartId, lines: [{ id, quantity }], ...context(locale) },
    );
    return unwrap(data.cartLinesUpdate);
}

export async function removeLine(cartId: string, lineId: string, locale: string): Promise<Cart> {
    const data = await storefront<{ cartLinesRemove: Parameters<typeof unwrap>[0] }>(
        CART_LINES_REMOVE, { cartId, lineIds: [lineId], ...context(locale) },
    );
    return unwrap(data.cartLinesRemove);
}
