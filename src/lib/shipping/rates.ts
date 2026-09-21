/* Shipping and VAT, worked out here rather than asked of Shopify.

   Shopify's Cart API returns the most expensive rate in the destination's zone whatever the
   cart weighs, and no tax at all, so the figures it quotes mid-checkout cannot be shown to a
   buyer. Everything below implements "Shipping and VAT Rules: Spec for Shopify PoC" directly:
   sections 4 and 5 for the zones and brackets, 6 for VAT, 7 for the small item flat rate and
   8 for the customs surcharge.

   Weight is in integer grams and money in integer cents throughout. Section 9 requires that a
   cart adding up to 3.3 kg land in the 3.3 bracket every single time, and floating point
   kilograms cannot promise that. */

export const VAT_RATE = 19;

export type ZoneKey = 'domestic' | 'ww1' | 'ww2';

interface Zone {
    key: ZoneKey;
    label: string;
    countries: string[];
    eu: boolean;
}

/* Section 4. One country belongs to exactly one zone. Zone 1 is EU-only and Zone 2 non-EU
   only, which is what lets both VAT and the customs fee follow from the zone. */
export const ZONES: Zone[] = [
    { key: 'domestic', label: 'DHL Express',      countries: ['DE'],             eu: true  },
    { key: 'ww1',      label: 'Worldwide Zone 1', countries: ['BE', 'NL', 'FR'], eu: true  },
    { key: 'ww2',      label: 'Worldwide Zone 2', countries: ['ME', 'AL', 'GE'], eu: false },
];

/* Section 8. Flat 40.00 on every non-EU order, whatever the cart contains. */
export const CUSTOMS_FEE_CENTS = 4000;

/* Section 7. Available for German deliveries only, and only when every line qualifies. */
export const SMALL_ITEM_FLAT_CENTS = 1000;

interface Bracket {
    fromGrams: number;
    /* null on the top bracket: section 5 puts no upper limit on it. */
    toGrams: number | null;
    netCents: number;
}

/* Section 5.1. Four brackets, thresholds deliberately not round. */
const DOMESTIC: Bracket[] = [
    { fromGrams:    1, toGrams: 3299, netCents: 2100 },
    { fromGrams: 3300, toGrams: 5299, netCents: 2200 },
    { fromGrams: 5300, toGrams: 9899, netCents: 2700 },
    { fromGrams: 9900, toGrams: null, netCents: 3300 },
];

/* Section 5.2. 31 brackets in 0.5 kg steps, the first being "> 0, under 0.5". */
const WW1_NET = [51, 59, 61, 62, 64, 66, 68, 70, 72, 74, 76, 79, 81, 84, 86, 89, 91, 94, 96, 99,
                 101, 104, 107, 109, 112, 115, 118, 121, 123, 126, 129];
const WW2_NET = [65, 87, 89, 91, 94, 97, 100, 103, 106, 109, 112, 115, 119, 123, 126, 130, 134,
                 137, 141, 144, 148, 153, 158, 163, 168, 173, 177, 182, 187, 192, 197];

/* The upper bound of each row sits one gram below the next row's threshold, so a weight that
   exactly equals a threshold belongs to the higher bracket — section 9 — and no cart weight
   can fall between two rows. */
function halfKiloBrackets(net: number[]): Bracket[] {
    return net.map((value, i) => ({
        fromGrams: i === 0 ? 1 : i * 500,
        toGrams: i === net.length - 1 ? null : (i + 1) * 500 - 1,
        netCents: value * 100,
    }));
}

const TABLES: Record<ZoneKey, Bracket[]> = {
    domestic: DOMESTIC,
    ww1: halfKiloBrackets(WW1_NET),
    ww2: halfKiloBrackets(WW2_NET),
};

/* Section 9: money rounds to two decimals, half up. */
function halfUp(cents: number): number {
    return Math.floor(cents + 0.5);
}

export function addVat(netCents: number): number {
    return halfUp(netCents * (100 + VAT_RATE) / 100);
}

export function zoneFor(countryCode: string): Zone | null {
    return ZONES.find((z) => z.countries.includes(countryCode.toUpperCase())) ?? null;
}

/* The highest bracket whose threshold the weight reaches. */
function bracketFor(zone: ZoneKey, grams: number): Bracket | null {
    if (grams <= 0) return null;
    return TABLES[zone].find((b) => grams >= b.fromGrams && (b.toGrams === null || grams <= b.toGrams)) ?? null;
}

export interface CartItem {
    grams: number;
    quantity: number;
    smallItem: boolean;
    /* A line that ships nothing adds no weight and cannot block the small item rate. */
    requiresShipping: boolean;
}

export interface ShippingOption {
    id: 'weight' | 'small-item';
    label: string;
    netCents: number;
}

export interface Quote {
    /* Section 2: unit weight times quantity, summed over every line. */
    grams: number;
    zone: Zone | null;
    options: ShippingOption[];
    /* Section 6: whether this order is billed gross or net, and why. */
    vatApplies: boolean;
    /* Section 9: a weightless cart would ship for nothing, so checkout has to stop. */
    blocked: 'no-weight' | 'no-zone' | null;
}

/* Section 6.3 in one function. VAT is charged when the goods stay in Germany, or when they go
   to another EU country and no valid VAT number was given. Everything else — intra-community
   supply with a VAT number, and any export — is billed net. The customer never chooses this;
   it follows from the delivery country and the invoice address alone. */
export function vatApplies(zone: Zone | null, hasValidVatId: boolean): boolean {
    if (!zone) return true;
    if (zone.key === 'domestic') return true;
    return zone.eu && !hasValidVatId;
}

/* Section 6.4. Real VIES validation comes later; for the PoC a correctly formatted number
   counts as valid. A German VAT number changes nothing, because the exemption only applies
   when the goods actually cross an intra-EU border. */
const VAT_ID = /^[A-Z]{2}[0-9A-Z]{8,12}$/;

export function vatIdLooksValid(raw: string | undefined | null): boolean {
    if (!raw) return false;
    const value = raw.replace(/[\s-]/g, '').toUpperCase();
    return VAT_ID.test(value) && !value.startsWith('DE');
}

export function quote(items: CartItem[], countryCode: string, vatId?: string | null): Quote {
    const shippable = items.filter((i) => i.requiresShipping);
    const grams = shippable.reduce((sum, i) => sum + i.grams * i.quantity, 0);
    const zone = zoneFor(countryCode);
    const taxed = vatApplies(zone, vatIdLooksValid(vatId));

    if (!zone) return { grams, zone: null, options: [], vatApplies: taxed, blocked: 'no-zone' };
    if (grams <= 0) return { grams, zone, options: [], vatApplies: taxed, blocked: 'no-weight' };

    const options: ShippingOption[] = [];

    const bracket = bracketFor(zone.key, grams);
    if (bracket) {
        /* Section 8 folds into the shipping line rather than showing separately, which the
           spec explicitly permits. It is zero for Germany and every EU country. */
        const customs = zone.eu ? 0 : CUSTOMS_FEE_CENTS;
        options.push({ id: 'weight', label: zone.label, netCents: bracket.netCents + customs });
    }

    /* Section 7. Germany only, and only when every shippable line carries the flag — one
       non-qualifying product removes it for the whole cart however small the rest is. It is
       an additional choice alongside the weight rate, never a replacement. */
    if (zone.key === 'domestic' && shippable.length > 0 && shippable.every((i) => i.smallItem)) {
        options.push({ id: 'small-item', label: 'Small item post', netCents: SMALL_ITEM_FLAT_CENTS });
    }

    return { grams, zone, options, vatApplies: taxed, blocked: null };
}

export interface Totals {
    goodsNetCents: number;
    shippingNetCents: number;
    vatCents: number;
    totalCents: number;
}

/* Section 6: shipping is an ancillary service and is taxed exactly like the goods it carries.
   There is never a case where one is net and the other carries VAT, so the rate is applied to
   the sum rather than to each part. */
export function totals(goodsNetCents: number, shippingNetCents: number, taxed: boolean): Totals {
    const net = goodsNetCents + shippingNetCents;
    const vat = taxed ? addVat(net) - net : 0;
    return { goodsNetCents, shippingNetCents, vatCents: vat, totalCents: net + vat };
}
