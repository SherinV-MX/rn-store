/* Shipping and VAT, worked out here rather than asked of Shopify.

   Shopify's Cart API returns the most expensive rate in the destination's zone whatever the
   cart weighs — its weight conditions are stored and displayed but never evaluated — so the
   figures it quotes cannot be shown to a buyer. Everything below implements "Shipping and VAT
   Rules: Spec for Shopify PoC" directly: sections 4 and 5 for the zones and brackets, 6 for
   VAT, 7 for the small item flat rate and 8 for the customs surcharge.

   The numbers are not here. Section 4 requires staff to change zones and rates without a code
   change, so the whole rate card lives in Shopify as metaobjects and arrives as a parameter —
   see rate-card.ts. This file is the rules; Shopify holds the figures.

   Weight is in integer grams and money in integer cents throughout. Section 9 requires that a
   cart adding up to 3.3 kg land in the 3.3 bracket every single time, and floating point
   kilograms cannot promise that. */

export interface Zone {
    key: string;
    label: string;
    countries: string[];
    eu: boolean;
    sort: number;
}

export interface Bracket {
    fromGrams: number;
    netCents: number;
}

export interface RateCard {
    zones: Zone[];
    /* Keyed by zone key, ascending by weight. */
    brackets: Record<string, Bracket[]>;
    customsFeeCents: number;
    smallItemFlatCents: number;
    vatRate: number;
}

/* Section 9: money rounds to two decimals, half up. */
function halfUp(cents: number): number {
    return Math.floor(cents + 0.5);
}

export function addVat(netCents: number, vatRate: number): number {
    return halfUp(netCents * (100 + vatRate) / 100);
}

export function zoneFor(card: RateCard, countryCode: string): Zone | null {
    const code = countryCode.trim().toUpperCase();
    return card.zones.find((z) => z.countries.includes(code)) ?? null;
}

/* The highest bracket whose threshold the weight reaches. Section 5 puts no upper limit on
   the last one — "a 40 kg cart pays the top bracket, same as a 15 kg cart" — which falls out
   of reading the table downwards rather than needing a rule. */
function bracketFor(card: RateCard, zoneKey: string, grams: number): Bracket | null {
    const rows = card.brackets[zoneKey];
    if (!rows?.length || grams <= 0) return null;
    let found: Bracket | null = null;
    for (const row of rows) {
        if (grams >= row.fromGrams) found = row;
        else break;
    }
    return found;
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
    vatRate: number;
    /* Section 9: a weightless cart would ship for nothing, so checkout has to stop. */
    blocked: 'no-weight' | 'no-zone' | null;
}

/* Section 6.3 in one function. VAT is charged when the goods stay in Germany, or when they go
   to another EU country and no valid VAT number was given. Everything else — intra-community
   supply with a VAT number, and any export — is billed net. The customer never chooses this;
   it follows from the delivery country and the invoice address alone. */
export function vatApplies(zone: Zone | null, hasValidVatId: boolean): boolean {
    if (!zone) return true;
    /* The domestic zone is the one holding the country we are registered in, so a VAT number
       cannot exempt it: section 6.4's exemption needs the goods to cross an intra-EU border. */
    if (zone.sort === 0) return true;
    return zone.eu && !hasValidVatId;
}

/* Section 6.4. Real VIES validation comes later; for the PoC a correctly formatted number
   counts as valid. A German VAT number changes nothing, because the exemption only applies
   when the goods actually cross an intra-EU border.

   Note that Shopify's own checkout does validate against VIES, so an invented-but-well-formed
   number is accepted here and refused there. */
const VAT_ID = /^[A-Z]{2}[0-9A-Z]{8,12}$/;

export function vatIdLooksValid(raw: string | undefined | null): boolean {
    if (!raw) return false;
    const value = raw.replace(/[\s-]/g, '').toUpperCase();
    return VAT_ID.test(value) && !value.startsWith('DE');
}

export function quote(
    card: RateCard,
    items: CartItem[],
    countryCode: string,
    vatId?: string | null,
): Quote {
    const shippable = items.filter((i) => i.requiresShipping);
    const grams = shippable.reduce((sum, i) => sum + i.grams * i.quantity, 0);
    const zone = zoneFor(card, countryCode);
    const taxed = vatApplies(zone, vatIdLooksValid(vatId));
    const base = { grams, vatApplies: taxed, vatRate: card.vatRate };

    if (!zone) return { ...base, zone: null, options: [], blocked: 'no-zone' };
    if (grams <= 0) return { ...base, zone, options: [], blocked: 'no-weight' };

    const options: ShippingOption[] = [];

    const bracket = bracketFor(card, zone.key, grams);
    if (bracket) {
        /* Section 8 folds into the shipping line rather than showing separately, which the
           spec explicitly permits. It is zero for Germany and every EU country. */
        const customs = zone.eu ? 0 : card.customsFeeCents;
        options.push({ id: 'weight', label: zone.label, netCents: bracket.netCents + customs });
    }

    /* Section 7. Domestic only, and only when every shippable line carries the flag — one
       non-qualifying product removes it for the whole cart however small the rest is. It is
       an additional choice alongside the weight rate, never a replacement. */
    if (zone.sort === 0 && shippable.length > 0 && shippable.every((i) => i.smallItem)) {
        options.push({ id: 'small-item', label: 'Small item post', netCents: card.smallItemFlatCents });
    }

    return { ...base, zone, options, blocked: null };
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
export function totals(
    goodsNetCents: number,
    shippingNetCents: number,
    taxed: boolean,
    vatRate: number,
): Totals {
    const net = goodsNetCents + shippingNetCents;
    const vat = taxed ? addVat(net, vatRate) - net : 0;
    return { goodsNetCents, shippingNetCents, vatCents: vat, totalCents: net + vat };
}
