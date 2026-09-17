import 'server-only';
import { storefront, ShopifyError } from './client';
import {
    PRODUCT_QUERY,
    CART_QUERY,
    CART_CREATE,
    CART_LINES_ADD,
    CART_LINES_UPDATE,
    CART_LINES_REMOVE,
    CART_BUYER_IDENTITY_UPDATE,
    CART_DELIVERY_ADDRESSES_ADD,
    CART_DELIVERY_OPTION_UPDATE,
    CART_DISCOUNT_CODES_UPDATE,
    CART_PREPARE_FOR_COMPLETION,
    CART_PAYMENT_UPDATE,
    CART_SUBMIT_FOR_COMPLETION,
    PRODUCTS_QUERY,
} from './queries';
import type { Address, Cart, Money, Product, ProductCard } from './types';

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
interface RawCart extends Omit<Cart, 'lines' | 'deliveryGroups'> {
    lines: Connection<Cart['lines'][number]>;
    deliveryGroups: Connection<Cart['deliveryGroups'][number]>;
}

function flattenProduct(raw: RawProduct): Product {
    return { ...raw, images: raw.images.nodes, variants: raw.variants.nodes };
}

function flattenCart(raw: RawCart): Cart {
    return { ...raw, lines: raw.lines.nodes, deliveryGroups: raw.deliveryGroups?.nodes ?? [] };
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

/* Everything published to the channel, newest catalogue state. Nothing here is per-product
   code: adding a product in Shopify is all it takes for it to appear. */
export async function getProducts(locale: string, first = 50): Promise<ProductCard[]> {
    const data = await storefront<{ products: Connection<ProductCard> }>(
        PRODUCTS_QUERY, { first, ...context(locale) }, { revalidate: 300 },
    );
    return data.products.nodes;
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

/* ── Checkout ─────────────────────────────────────────────────────────────── */

export async function setContact(
    cartId: string, buyerIdentity: { email?: string; phone?: string; countryCode?: string }, locale: string,
): Promise<Cart> {
    const data = await storefront<{ cartBuyerIdentityUpdate: Parameters<typeof unwrap>[0] }>(
        CART_BUYER_IDENTITY_UPDATE, { cartId, buyerIdentity, ...context(locale) },
    );
    return unwrap(data.cartBuyerIdentityUpdate);
}

export async function setAddress(cartId: string, address: Address, locale: string): Promise<Cart> {
    const data = await storefront<{ cartDeliveryAddressesAdd: Parameters<typeof unwrap>[0] }>(
        CART_DELIVERY_ADDRESSES_ADD,
        {
            cartId,
            /* selected: true makes this the address the delivery groups and taxes are
               calculated against; without it Shopify stores the address and quotes nothing. */
            addresses: [{ selected: true, address: { deliveryAddress: address } }],
            ...context(locale),
        },
    );
    return unwrap(data.cartDeliveryAddressesAdd);
}

export async function selectDelivery(
    cartId: string, deliveryGroupId: string, deliveryOptionHandle: string, locale: string,
): Promise<Cart> {
    const data = await storefront<{ cartSelectedDeliveryOptionsUpdate: Parameters<typeof unwrap>[0] }>(
        CART_DELIVERY_OPTION_UPDATE,
        { cartId, selected: [{ deliveryGroupId, deliveryOptionHandle }], ...context(locale) },
    );
    return unwrap(data.cartSelectedDeliveryOptionsUpdate);
}

export async function setDiscountCodes(cartId: string, codes: string[], locale: string): Promise<Cart> {
    const data = await storefront<{ cartDiscountCodesUpdate: Parameters<typeof unwrap>[0] }>(
        CART_DISCOUNT_CODES_UPDATE, { cartId, codes, ...context(locale) },
    );
    return unwrap(data.cartDiscountCodesUpdate);
}

export interface PrepareResult {
    status: 'ready' | 'not_ready' | 'throttled';
    total?: Money;
    /* Why it is not ready — an address Shopify cannot ship to, a line that went out of
       stock while the buyer was typing. Shown as-is; these messages are written for buyers. */
    errors?: string[];
    pollAfter?: string;
}

export async function prepareForCompletion(cartId: string, locale: string): Promise<PrepareResult> {
    const data = await storefront<{
        cartPrepareForCompletion: {
            result: {
                __typename: string;
                cart?: { cost: { totalAmount: Money } };
                errors?: { code: string; message: string }[];
                pollAfter?: string;
            } | null;
            userErrors: { message: string }[];
        } | null;
    }>(CART_PREPARE_FOR_COMPLETION, { cartId, ...context(locale) });

    const payload = data.cartPrepareForCompletion;
    if (!payload?.result) throw new ShopifyError('cartPrepareForCompletion returned nothing');
    const { result } = payload;

    if (result.__typename === 'CartStatusReady') {
        return { status: 'ready', total: result.cart?.cost.totalAmount };
    }
    if (result.__typename === 'CartThrottled') {
        return { status: 'throttled', pollAfter: result.pollAfter };
    }
    return { status: 'not_ready', errors: result.errors?.map((e) => e.message) ?? ['Cart is not ready'] };
}

/* The delivery address and the billing address are different input types in the Storefront
   schema: delivery takes countryCode/provinceCode, billing is a MailingAddressInput and takes
   country/province as names. Translating here keeps one Address shape in the app. */
const COUNTRY_NAMES: Record<string, string> = {
    DE: 'Germany', AT: 'Austria', CH: 'Switzerland', NL: 'Netherlands', BE: 'Belgium',
    FR: 'France', PL: 'Poland', IT: 'Italy', ES: 'Spain',
};

function toMailingAddress(address: Address) {
    const { countryCode, provinceCode, ...rest } = address;
    return {
        ...rest,
        ...(countryCode ? { country: COUNTRY_NAMES[countryCode] ?? countryCode } : {}),
        ...(provinceCode ? { province: provinceCode } : {}),
    };
}

export async function attachPayment(
    cartId: string,
    payment: { amount: Money; sessionId: string; billingAddress: Address },
    locale: string,
): Promise<void> {
    const data = await storefront<{ cartPaymentUpdate: { userErrors: { message: string }[] } | null }>(
        CART_PAYMENT_UPDATE,
        {
            cartId,
            payment: {
                amount: { amount: payment.amount.amount, currencyCode: payment.amount.currencyCode },
                directPaymentMethod: {
                    sessionId: payment.sessionId,
                    billingAddress: toMailingAddress(payment.billingAddress),
                    /* cardSource is only for a card Shopify already holds (SAVED_CREDIT_CARD).
                       A card the buyer just typed has no source — sending one is rejected. */
                },
            },
            ...context(locale),
        },
    );
    const errors = data.cartPaymentUpdate?.userErrors ?? [];
    if (errors.length) throw new ShopifyError(errors.map((e) => e.message).join('; '), errors);
}

export interface SubmitResult {
    status: 'success' | 'already_accepted' | 'failed' | 'throttled';
    redirectUrl?: string;
    attemptId?: string;
    checkoutUrl?: string;
    errors?: string[];
    pollAfter?: string;
}

export async function submitForCompletion(
    cartId: string, attemptToken: string, locale: string,
): Promise<SubmitResult> {
    const data = await storefront<{
        cartSubmitForCompletion: {
            result: {
                __typename: string;
                redirectUrl?: string;
                attemptId?: string;
                checkoutUrl?: string;
                errors?: { code: string; message: string }[];
                pollAfter?: string;
            } | null;
            userErrors: { message: string }[];
        } | null;
    }>(CART_SUBMIT_FOR_COMPLETION, { cartId, attemptToken, ...context(locale) });

    const payload = data.cartSubmitForCompletion;
    if (!payload?.result) {
        throw new ShopifyError(
            payload?.userErrors?.map((e) => e.message).join('; ') || 'cartSubmitForCompletion returned nothing',
        );
    }
    const { result } = payload;

    switch (result.__typename) {
        case 'SubmitSuccess':
            return { status: 'success', redirectUrl: result.redirectUrl, attemptId: result.attemptId };
        case 'SubmitAlreadyAccepted':
            return { status: 'already_accepted', attemptId: result.attemptId };
        case 'SubmitThrottled':
            return { status: 'throttled', pollAfter: result.pollAfter };
        default:
            return {
                status: 'failed',
                checkoutUrl: result.checkoutUrl,
                errors: result.errors?.map((e) => e.message) ?? ['Payment could not be completed'],
            };
    }
}
