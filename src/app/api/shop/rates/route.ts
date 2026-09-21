import { NextRequest, NextResponse } from 'next/server';
import { quote } from '@/lib/shipping/rates';
import { smallItemFlags } from '@/lib/shipping/small-items';

/* Shopify's carrier service callback.

   Shopify's own weight-based rates do not work on this store: whatever the cart weighs, its
   Cart API and cartPrepareForCompletion both return the dearest rate in the destination's
   zone. A carrier service replaces them — Shopify asks us for the rates at checkout and uses
   what we return, so the figure the buyer sees on our checkout page and the figure Shopify
   charges come from the same code in lib/shipping/rates.

   It also makes sections 7 and 8 real rules rather than workarounds: the small item flat rate
   can depend on a product metafield, which a Shopify rate cannot, and the customs surcharge
   is added on top instead of being baked into the Zone 2 table.

   Registered with scripts/shopify/setup.mjs carrier. Shopify sends no signature with these
   callbacks, so the endpoint is readable by anyone who finds it — it exposes nothing but our
   published rate card, which is the same thing the checkout shows. */

interface CarrierItem {
    name: string;
    sku: string | null;
    quantity: number;
    grams: number;
    price: number;
    requires_shipping: boolean;
    product_id: number | null;
    variant_id: number | null;
}

interface CarrierRequest {
    rate?: {
        destination?: { country?: string | null };
        items?: CarrierItem[];
        currency?: string;
    };
}

export async function POST(request: NextRequest) {
    let body: CarrierRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ rates: [] });
    }

    const rate = body.rate;
    const country = rate?.destination?.country ?? '';
    const items = rate?.items ?? [];
    const currency = rate?.currency || 'EUR';

    /* Section 7's flag lives in a product metafield, which the callback payload does not
       carry, so it is looked up by variant and cached. */
    const flags = await smallItemFlags(items.map((i) => i.variant_id).filter((id): id is number => id != null));

    const result = quote(
        items.map((item) => ({
            grams: item.grams,
            quantity: item.quantity,
            smallItem: flags.get(item.variant_id ?? -1) === true,
            requiresShipping: item.requires_shipping,
        })),
        country,
    );

    /* Returning no rates is how a carrier service says "we cannot ship this". Shopify then
       stops the buyer at the delivery step, which is what section 9 asks for when a cart has
       no shipping weight at all. */
    if (result.blocked || result.options.length === 0) return NextResponse.json({ rates: [] });

    return NextResponse.json({
        rates: result.options.map((option) => ({
            service_name: option.label,
            service_code: option.id,
            /* Shopify wants the amount in the currency's subunit, as a string, and net —
               it applies VAT itself according to the store's tax settings, which is what
               keeps section 6's "shipping is taxed like the goods" true. */
            total_price: String(option.netCents),
            currency,
            description: option.id === 'small-item' ? 'Sent by normal post' : undefined,
        })),
    });
}

/* Shopify probes the callback with a GET when the service is registered. */
export function GET() {
    return NextResponse.json({ ok: true, service: 'bss-shop rates' });
}
