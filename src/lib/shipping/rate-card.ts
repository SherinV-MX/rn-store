import 'server-only';
import { storefront } from '@/lib/shopify/client';
import type { RateCard, Zone, Bracket } from './rates';

/* The rate card, read from Shopify.

   Section 4: "Zone membership and the rate amounts must be changeable by staff without a code
   change, since carriers adjust prices annually." So the zones, the 66 brackets, the customs
   fee and the small item flat rate are metaobjects in the store, editable in the admin under
   Content -> Metaobjects, and this reads them.

   Created and seeded by scripts/shopify/ratecard.mjs. The definitions are storefront-readable,
   so the token the app already has is enough and no admin credential reaches production. */

const QUERY = `
    query RateCard {
        zones: metaobjects(type: "shipping_zone", first: 50) {
            nodes { fields { key value } }
        }
        rates: metaobjects(type: "shipping_rate", first: 250) {
            nodes { fields { key value } }
        }
        settings: metaobjects(type: "shipping_settings", first: 1) {
            nodes { fields { key value } }
        }
    }
`;

interface Node { fields: { key: string; value: string }[] }
interface Response {
    zones: { nodes: Node[] };
    rates: { nodes: Node[] };
    settings: { nodes: Node[] };
}

const flatten = (node: Node) => Object.fromEntries(node.fields.map((f) => [f.key, f.value]));

/* Metaobject values arrive as strings, so every one is parsed deliberately rather than
   coerced. A price is read through cents to keep section 9's exactness. */
const cents = (value: string | undefined) => Math.round(Number.parseFloat(value ?? '0') * 100);
const int = (value: string | undefined) => Math.trunc(Number.parseFloat(value ?? '0'));

function parseCountries(raw: string | undefined): string[] {
    if (!raw) return [];
    try {
        /* A list field comes back as a JSON array; a merchant typing into a plain text field
           would more likely use commas, so both are accepted. */
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    } catch {
        /* not JSON */
    }
    return raw.split(/[,\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
}

export function buildRateCard(data: Response): RateCard {
    const zones: Zone[] = data.zones.nodes
        .map(flatten)
        .map((z) => ({
            key: String(z.zone_key ?? '').trim(),
            label: String(z.label ?? '').trim(),
            countries: parseCountries(z.countries),
            eu: z.in_eu === 'true',
            sort: int(z.sort),
        }))
        .filter((z) => z.key && z.countries.length)
        .sort((a, b) => a.sort - b.sort);

    const brackets: Record<string, Bracket[]> = {};
    for (const row of data.rates.nodes.map(flatten)) {
        const key = String(row.zone_key ?? '').trim();
        if (!key) continue;
        (brackets[key] ??= []).push({ fromGrams: int(row.from_grams), netCents: cents(row.net_price) });
    }
    /* Sorting here means the admin can hold the rows in any order — a merchant adding a
       bracket in the middle of a table should not have to care where it lands. */
    for (const key of Object.keys(brackets)) brackets[key].sort((a, b) => a.fromGrams - b.fromGrams);

    const settings = data.settings.nodes.length ? flatten(data.settings.nodes[0]) : {};

    return {
        zones,
        brackets,
        customsFeeCents: cents(settings.customs_fee),
        smallItemFlatCents: cents(settings.small_item_flat),
        vatRate: Number.parseFloat(settings.vat_rate ?? '19'),
    };
}

export class RateCardError extends Error {}

/* Cached briefly. Carriers change prices once a year, so a minute of staleness costs nothing,
   while a rate request that waits on Shopify costs a checkout: the carrier callback has only
   a few seconds before Shopify gives up and shows no delivery options at all. */
const TTL_MS = 60_000;
let cached: { card: RateCard; at: number } | null = null;

export async function loadRateCard(): Promise<RateCard> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.card;

    let card: RateCard;
    try {
        card = buildRateCard(await storefront<Response>(QUERY, {}, { revalidate: 60 }));
    } catch (err) {
        /* Serving the last good card beats serving none: an expired copy still quotes the
           right price, where a failure quotes nothing and stops the sale. */
        if (cached) return cached.card;
        throw new RateCardError(`Could not read the rate card from Shopify: ${(err as Error).message}`);
    }

    if (card.zones.length === 0) {
        if (cached) return cached.card;
        throw new RateCardError('The rate card in Shopify has no zones — run scripts/shopify/ratecard.mjs seed.');
    }

    cached = { card, at: Date.now() };
    return card;
}
