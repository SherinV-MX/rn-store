import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
    setContact, setAddress, selectDelivery, setDiscountCodes,
    prepareForCompletion, attachPayment, submitForCompletion, getCart, ShopifyError,
} from '@/lib/shopify';
import type { Address } from '@/lib/shopify';

/* Every checkout step the buyer takes, on our own domain.

   Contact, address, delivery and discounts are cart mutations, so the UI above them is ours.
   Payment is deliberately split: the browser sends the card straight to Shopify's vault and
   gets back a session id, and only that id arrives here. No card number ever touches this
   server, which is the whole reason the card form can live in our page at all. */

const COOKIE = 'logisq_cart';

function cartIdFrom(request: NextRequest): string | null {
    return request.cookies.get(COOKIE)?.value ?? null;
}

function failed(err: unknown) {
    if (err instanceof ShopifyError) {
        console.error('Checkout error:', err.message, err.detail ?? '');
        return NextResponse.json({ error: 'checkout_error', message: err.message }, { status: 409 });
    }
    console.error('Checkout route error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
}

/* Trims the address to the fields Shopify accepts. Anything else the form collects is
   dropped here rather than being passed through and rejected by the API. */
function cleanAddress(input: Record<string, unknown>): Address {
    const keys = [
        'firstName', 'lastName', 'company', 'address1', 'address2',
        'city', 'zip', 'countryCode', 'provinceCode', 'phone',
    ] as const;
    const out: Record<string, string> = {};
    for (const key of keys) {
        const value = input[key];
        if (typeof value === 'string' && value.trim()) out[key] = value.trim();
    }
    return out as Address;
}

export async function POST(request: NextRequest) {
    const cartId = cartIdFrom(request);
    if (!cartId) return NextResponse.json({ error: 'no_cart' }, { status: 404 });

    try {
        const body = await request.json();
        const locale = body.locale === 'de' ? 'de' : 'en';

        switch (body.action) {
            case 'contact': {
                if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
                    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
                }
                const cart = await setContact(
                    cartId,
                    { email: body.email, phone: body.phone || undefined, countryCode: body.countryCode || 'DE' },
                    locale,
                );
                return NextResponse.json({ cart });
            }

            case 'address': {
                const cart = await setAddress(cartId, cleanAddress(body.address ?? {}), locale);
                return NextResponse.json({ cart });
            }

            case 'delivery': {
                if (!body.groupId || !body.handle) {
                    return NextResponse.json({ error: 'invalid_delivery' }, { status: 400 });
                }
                const cart = await selectDelivery(cartId, body.groupId, body.handle, locale);
                return NextResponse.json({ cart });
            }

            case 'discount': {
                const codes = Array.isArray(body.codes)
                    ? body.codes.filter((c: unknown) => typeof c === 'string').slice(0, 5)
                    : [];
                const cart = await setDiscountCodes(cartId, codes, locale);
                return NextResponse.json({ cart });
            }

            case 'prepare': {
                const result = await prepareForCompletion(cartId, locale);
                return NextResponse.json({ result });
            }

            /* The last step. Prepare first so the amount charged is the amount Shopify has
               just recalculated — never a total the browser worked out. */
            case 'pay': {
                if (typeof body.sessionId !== 'string' || !body.sessionId) {
                    return NextResponse.json({ error: 'missing_session' }, { status: 400 });
                }

                const prepared = await prepareForCompletion(cartId, locale);
                if (prepared.status !== 'ready' || !prepared.total) {
                    return NextResponse.json({ result: { status: prepared.status, errors: prepared.errors } });
                }

                await attachPayment(
                    cartId,
                    {
                        amount: prepared.total,
                        sessionId: body.sessionId,
                        billingAddress: cleanAddress(body.billingAddress ?? {}),
                    },
                    locale,
                );

                /* The attempt token makes the submission idempotent: a retry after a dropped
                   connection re-reads the same attempt instead of charging twice. */
                const result = await submitForCompletion(cartId, body.attemptToken || randomUUID(), locale);
                return NextResponse.json({ result });
            }

            case 'cart': {
                return NextResponse.json({ cart: await getCart(cartId, locale) });
            }

            default:
                return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
        }
    } catch (err) {
        return failed(err);
    }
}
