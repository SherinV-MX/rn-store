import { NextRequest, NextResponse } from 'next/server';
import { createCart, getCart, addLines, updateLine, removeLine, ShopifyError } from '@/lib/shopify';
import type { Cart } from '@/lib/shopify';

/* The browser's only door to the cart. It never sees the Storefront token and never holds
   the cart id — that lives in an httpOnly cookie, so a script on the page cannot read it
   and the cart survives a reload without localStorage. */

const COOKIE = 'logisq_cart';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; /* 30 days, matching Shopify's own cart lifetime */

function withCart(cart: Cart | null, status = 200) {
    const res = NextResponse.json({ cart }, { status });
    if (cart) {
        res.cookies.set(COOKIE, cart.id, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });
    } else {
        res.cookies.delete(COOKIE);
    }
    return res;
}

function failed(err: unknown) {
    /* A ShopifyError carrying userErrors is the buyer's problem — sold out, too many — and
       its message is safe to show. Anything else is ours and stays in the log. */
    if (err instanceof ShopifyError) {
        console.error('Shopify cart error:', err.message, err.detail ?? '');
        return NextResponse.json({ error: 'cart_error', message: err.message }, { status: 409 });
    }
    console.error('Cart route error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
}

function localeOf(request: NextRequest, body?: { locale?: string }) {
    const value = body?.locale ?? request.nextUrl.searchParams.get('locale');
    return value === 'de' ? 'de' : 'en';
}

/* Read the current cart. Returns { cart: null } when there is none, which is the normal
   state for a first-time visitor, not an error. */
export async function GET(request: NextRequest) {
    const id = request.cookies.get(COOKIE)?.value;
    if (!id) return NextResponse.json({ cart: null });
    try {
        /* getCart returns null for an expired or already-checked-out cart; withCart then
           clears the stale cookie so the next add starts clean. */
        return withCart(await getCart(id, localeOf(request)));
    } catch (err) {
        return failed(err);
    }
}

/* Add a variant. Creates the cart if this is the first thing the visitor picks. */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { merchandiseId } = body;
        const quantity = Number(body.quantity ?? 1);

        if (typeof merchandiseId !== 'string' || !merchandiseId.startsWith('gid://shopify/ProductVariant/')) {
            return NextResponse.json({ error: 'invalid_variant' }, { status: 400 });
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 });
        }

        const locale = localeOf(request, body);
        const lines = [{ merchandiseId, quantity }];
        const existing = request.cookies.get(COOKIE)?.value;

        if (existing) {
            try {
                return withCart(await addLines(existing, lines, locale));
            } catch {
                /* The held cart was expired or completed. Falling through to a fresh one is
                   better than telling someone their click failed. */
            }
        }
        return withCart(await createCart(lines, locale));
    } catch (err) {
        return failed(err);
    }
}

/* Change a line's quantity. Zero removes it, which is what the minus button does at 1. */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { lineId } = body;
        const quantity = Number(body.quantity);
        const id = request.cookies.get(COOKIE)?.value;

        if (!id) return NextResponse.json({ error: 'no_cart' }, { status: 404 });
        if (typeof lineId !== 'string' || !lineId) {
            return NextResponse.json({ error: 'invalid_line' }, { status: 400 });
        }
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
            return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 });
        }

        const locale = localeOf(request, body);
        return withCart(
            quantity === 0
                ? await removeLine(id, lineId, locale)
                : await updateLine(id, lineId, quantity, locale),
        );
    } catch (err) {
        return failed(err);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const lineId = body.lineId ?? request.nextUrl.searchParams.get('lineId');
        const id = request.cookies.get(COOKIE)?.value;

        if (!id) return NextResponse.json({ error: 'no_cart' }, { status: 404 });
        if (typeof lineId !== 'string' || !lineId) {
            return NextResponse.json({ error: 'invalid_line' }, { status: 400 });
        }

        return withCart(await removeLine(id, lineId, localeOf(request, body)));
    } catch (err) {
        return failed(err);
    }
}
