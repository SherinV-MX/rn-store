/* Puts the rate card into Shopify, where staff can edit it.

     node scripts/shopify/ratecard.mjs define    # create the metaobject definitions
     node scripts/shopify/ratecard.mjs seed      # fill them from the spec
     node scripts/shopify/ratecard.mjs show      # read back what the store now holds
     node scripts/shopify/ratecard.mjs clear     # delete every entry (definitions stay)

   Section 4: "Zone membership and the rate amounts must be changeable by staff without a code
   change, since carriers adjust prices annually." Holding the tables in the app's source
   satisfied everything except that sentence, so they live here instead — as metaobjects,
   which the admin renders as an editable list under Content -> Metaobjects.

   The definitions are readable by the Storefront API, so the rate endpoint can fetch them
   with the token the app already has and no admin credential ever reaches production. */

import { loadEnv, admin, AdminError } from './admin.mjs';
import { ZONES, RATE_TABLES, CUSTOMS_FEE_CENTS, VAT_RATE } from './spec-data.mjs';

loadEnv();

const ZONE_TYPE = 'shipping_zone';
const RATE_TYPE = 'shipping_rate';
const SETTINGS_TYPE = 'shipping_settings';

/* Section 7's flat rate, which spec-data does not carry because the static tables never
   offered it. */
const SMALL_ITEM_FLAT_CENTS = 1000;

const log = (...a) => console.log(...a);
const step = s => log(`\n=== ${s} ===`);
const money = c => (c / 100).toFixed(2);

/* Admin access cannot be set on a type the app does not reserve; merchants get read-write
   on their own definitions by default, which is exactly what section 4 asks for. */
const ACCESS = { storefront: 'PUBLIC_READ' };

const DEFINITIONS = [
    {
        type: ZONE_TYPE,
        name: 'Shipping zone',
        description: 'A group of countries that share one rate table. One country belongs to exactly one zone.',
        displayNameKey: 'label',
        fieldDefinitions: [
            { key: 'zone_key', name: 'Key', type: 'single_line_text_field', required: true,
              description: 'Short identifier the rate rows point at. Do not change once rates exist.' },
            { key: 'label', name: 'Label', type: 'single_line_text_field', required: true,
              description: 'What the customer sees at checkout, e.g. "DHL Express".' },
            { key: 'countries', name: 'Countries', type: 'list.single_line_text_field', required: true,
              description: 'Two-letter country codes, e.g. DE. A country may appear in only one zone.' },
            { key: 'in_eu', name: 'Inside the EU', type: 'boolean', required: true,
              description: 'Drives VAT and whether the customs handling fee applies.' },
            { key: 'sort', name: 'Sort order', type: 'number_integer', required: false },
        ],
    },
    {
        type: RATE_TYPE,
        name: 'Shipping rate',
        description: 'One weight bracket. The price applies from this weight up to the next bracket in the same zone.',
        displayNameKey: 'label',
        fieldDefinitions: [
            { key: 'label', name: 'Label', type: 'single_line_text_field', required: true },
            { key: 'zone_key', name: 'Zone', type: 'single_line_text_field', required: true,
              description: 'Matches the Key of a shipping zone.' },
            { key: 'from_grams', name: 'From (grams)', type: 'number_integer', required: true,
              description: 'A cart at exactly this weight pays this price. Use 1 for the lightest bracket so a weightless cart matches nothing.' },
            { key: 'net_price', name: 'Net price', type: 'number_decimal', required: true,
              description: 'Excluding VAT. Shopify adds the tax at checkout.' },
        ],
    },
    {
        type: SETTINGS_TYPE,
        name: 'Shipping settings',
        description: 'The figures that are not per-bracket. One entry only.',
        displayNameKey: 'label',
        fieldDefinitions: [
            { key: 'label', name: 'Label', type: 'single_line_text_field', required: true },
            { key: 'customs_fee', name: 'Customs handling fee', type: 'number_decimal', required: true,
              description: 'Added to shipping for non-EU destinations. Net.' },
            { key: 'small_item_flat', name: 'Small item flat rate', type: 'number_decimal', required: true,
              description: 'Domestic only, and only when every item in the cart carries the small item flag. Net.' },
            { key: 'vat_rate', name: 'VAT rate (%)', type: 'number_decimal', required: true },
        ],
    },
];

/* ------------------------------------------------------------------- define */

async function define() {
    step('Metaobject definitions');

    const existing = await admin(`{ metaobjectDefinitions(first: 50) { nodes { id type } } }`);
    const have = new Set(existing.metaobjectDefinitions.nodes.map(n => n.type));

    for (const def of DEFINITIONS) {
        if (have.has(def.type)) { log(`  ${def.type} already defined`); continue; }
        await admin(
            `mutation($definition: MetaobjectDefinitionCreateInput!) {
                metaobjectDefinitionCreate(definition: $definition) {
                    metaobjectDefinition { id type }
                    userErrors { field message code }
                }
            }`,
            { definition: { ...def, access: ACCESS } },
            ['metaobjectDefinitionCreate'],
        );
        log(`  created ${def.type} (${def.fieldDefinitions.length} fields)`);
    }
}

/* --------------------------------------------------------------------- seed */

/* Handles are stable, so re-seeding updates in place rather than piling up duplicates. */
async function upsert(type, handle, fields) {
    const list = Object.entries(fields).map(([key, value]) => ({ key, value: String(value) }));
    const data = await admin(
        `mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
            metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
                metaobject { id handle }
                userErrors { field message code }
            }
        }`,
        { handle: { type, handle }, metaobject: { fields: list } },
        ['metaobjectUpsert'],
    );
    return data.metaobjectUpsert.metaobject;
}

async function seed() {
    step('Zones');
    for (const [i, zone] of ZONES.entries()) {
        await upsert(ZONE_TYPE, zone.key.replace(/_/g, '-'), {
            zone_key: zone.key,
            label: zone.rateLabel,
            countries: JSON.stringify(zone.countries),
            in_eu: zone.eu,
            sort: i,
        });
        log(`  ${zone.rateLabel.padEnd(18)} ${zone.countries.join(', ').padEnd(12)} eu=${zone.eu}`);
    }

    step('Rate brackets');
    for (const zone of ZONES) {
        const rows = RATE_TABLES[zone.key];
        for (const [i, row] of rows.entries()) {
            /* Zone 2's table has the customs fee folded in; the fee is a rule of its own now,
               so it is stripped back out before the bracket is stored. */
            const net = zone.eu ? row.netCents : row.netCents - CUSTOMS_FEE_CENTS;
            const from = (row.fromGrams / 1000).toFixed(3).replace(/\.?0+$/, '');
            await upsert(RATE_TYPE, `${zone.key.replace(/_/g, '-')}-${String(i).padStart(2, '0')}`, {
                label: `${zone.rateLabel} from ${from} kg`,
                zone_key: zone.key,
                from_grams: row.fromGrams,
                net_price: (net / 100).toFixed(2),
            });
        }
        log(`  ${zone.rateLabel.padEnd(18)} ${rows.length} brackets`);
    }

    step('Settings');
    await upsert(SETTINGS_TYPE, 'default', {
        label: 'Shipping settings',
        customs_fee: (CUSTOMS_FEE_CENTS / 100).toFixed(2),
        small_item_flat: (SMALL_ITEM_FLAT_CENTS / 100).toFixed(2),
        vat_rate: VAT_RATE.toFixed(2),
    });
    log(`  customs ${money(CUSTOMS_FEE_CENTS)}   small item ${money(SMALL_ITEM_FLAT_CENTS)}   VAT ${VAT_RATE}%`);
    log(`\n  Staff can now edit all of this under Content -> Metaobjects in the admin.`);
}

/* --------------------------------------------------------------------- show */

async function entries(type) {
    const out = [];
    let after = null;
    for (;;) {
        const d = await admin(
            `query($type: String!, $after: String) {
                metaobjects(type: $type, first: 100, after: $after) {
                    nodes { handle fields { key value } }
                    pageInfo { hasNextPage endCursor }
                }
            }`,
            { type, after },
        );
        out.push(...d.metaobjects.nodes.map(n => ({
            handle: n.handle,
            ...Object.fromEntries(n.fields.map(f => [f.key, f.value])),
        })));
        if (!d.metaobjects.pageInfo.hasNextPage) return out;
        after = d.metaobjects.pageInfo.endCursor;
    }
}

async function show() {
    step('What the store holds');

    const zones = await entries(ZONE_TYPE);
    const rates = await entries(RATE_TYPE);
    const settings = await entries(SETTINGS_TYPE);

    for (const z of zones.sort((a, b) => Number(a.sort) - Number(b.sort))) {
        const mine = rates.filter(r => r.zone_key === z.zone_key)
            .sort((a, b) => Number(a.from_grams) - Number(b.from_grams));
        log(`\n  ${z.label}  [${JSON.parse(z.countries).join(', ')}]  eu=${z.in_eu}  — ${mine.length} brackets`);
        for (const r of mine.slice(0, 3)) log(`      from ${String(r.from_grams).padStart(6)} g  ${r.net_price}`);
        if (mine.length > 3) log(`      ... and ${mine.length - 3} more, up to ${mine[mine.length - 1].net_price}`);
    }

    const s = settings[0];
    log(s
        ? `\n  settings: customs ${s.customs_fee}, small item ${s.small_item_flat}, VAT ${s.vat_rate}%`
        : '\n  settings: MISSING');
}

/* -------------------------------------------------------------------- clear */

async function clear() {
    step('Deleting every rate card entry');
    for (const type of [RATE_TYPE, ZONE_TYPE, SETTINGS_TYPE]) {
        const rows = await admin(
            `query($type: String!) { metaobjects(type: $type, first: 250) { nodes { id } } }`,
            { type },
        );
        const ids = rows.metaobjects.nodes.map(n => n.id);
        for (const id of ids) {
            await admin(
                `mutation($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { message } } }`,
                { id }, ['metaobjectDelete'],
            );
        }
        log(`  ${type}: removed ${ids.length}`);
    }
}

/* --------------------------------------------------------------------- main */

const STAGES = { define, seed, show, clear };

async function main() {
    const stage = process.argv[2] ?? 'show';
    const order = stage === 'all' ? ['define', 'seed', 'show'] : [stage];
    for (const s of order) {
        if (!STAGES[s]) {
            console.error(`Unknown stage "${s}". One of: ${Object.keys(STAGES).join(', ')}, all`);
            process.exit(1);
        }
    }
    for (const s of order) await STAGES[s]();
    log('');
}

main().catch(err => {
    console.error(`\n${err instanceof AdminError ? 'Shopify rejected this' : 'Failed'}: ${err.message}`);
    if (err.detail) console.error(JSON.stringify(err.detail, null, 2));
    process.exit(1);
});

