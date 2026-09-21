/* Provisions the PoC store from the spec. Run stages one at a time:

     node scripts/shopify/setup.mjs inspect     what the store looks like now, changes nothing
     node scripts/shopify/setup.mjs metafield   the small item flag (section 2)
     node scripts/shopify/setup.mjs products    the eight test articles (section 2.1)
     node scripts/shopify/setup.mjs shipping    zones and the 66 weight brackets (sections 4, 5, 8)
     node scripts/shopify/setup.mjs verify      reads the store back and replays section 10

   `all` runs metafield, products, shipping, verify in that order. Every write stage is safe to
   re-run: products upsert by handle, and shipping refuses to touch a profile that already has
   zones unless you pass --replace-zones. */

import { loadEnv, admin, money, grantedScopes, AdminError } from './admin.mjs';
import {
    ARTICLES, ZONES, RATE_TABLES, TEST_CASES, CUSTOMS_FEE_CENTS,
    checkTranscription, grossCents, rateFor, bySku,
} from './spec-data.mjs';

loadEnv();

const CURRENCY = process.env.SHOPIFY_CURRENCY ?? 'EUR';
const NS = 'custom';
const KEY = 'small_item';
const handleOf = a => `ta-${a.sku.slice(3)}-${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const kg = g => (g / 1000).toFixed(3);

const log = (...a) => console.log(...a);
const step = s => log(`\n=== ${s} ===`);

/* ---------------------------------------------------------------- inspect */

async function inspect() {
    step('Shop');
    const shop = await admin(`{ shop { name myshopifyDomain currencyCode billingAddress { countryCodeV2 } } }`);
    log(`  ${shop.shop.name}  ${shop.shop.myshopifyDomain}  ${shop.shop.currencyCode}  ${shop.shop.billingAddress?.countryCodeV2 ?? '?'}`);

    const scopes = grantedScopes();
    if (scopes) {
        const have = scopes.split(',').map(s => s.trim());
        const need = ['write_products', 'write_inventory', 'write_shipping', 'write_publications'];
        const missing = need.filter(s => !have.includes(s));
        log(`  token scopes: ${have.join(', ')}`);
        if (missing.length) log(`  MISSING: ${missing.join(', ')} — release a version granting these before writing anything`);
    }

    step('Sales channels');
    const pubs = await admin(`{ publications(first: 20) { nodes { id name } } }`);
    pubs.publications.nodes.forEach(p => log(`  ${p.name.padEnd(24)} ${p.id}`));

    step('Markets (which countries can actually check out)');
    try {
        const m = await admin(`{ markets(first: 20) { nodes { id name } } }`);
        for (const mk of m.markets.nodes) log(`  ${mk.name}`);
    } catch {
        log('  not readable — needs the read_markets scope, which this app was not granted.');
        log('  Markets stay a job for the admin UI anyway (Settings -> Markets).');
    }

    step('Small item metafield definition');
    const defs = await admin(
        `query($ns: String!, $key: String!) {
            metafieldDefinitions(first: 5, ownerType: PRODUCT, namespace: $ns, key: $key) {
                nodes { id name type { name } }
            }
        }`,
        { ns: NS, key: KEY },
    );
    const def = defs.metafieldDefinitions.nodes[0];
    log(def ? `  present: ${def.name} (${def.type.name})` : '  not defined yet');

    step('Test articles');
    for (const a of ARTICLES) {
        const r = await admin(
            `query($h: String!) {
                productByIdentifier(identifier: { handle: $h }) {
                    id title status
                    metafield(namespace: "${NS}", key: "${KEY}") { value }
                    variants(first: 1) { nodes { sku price inventoryItem { tracked measurement { weight { value unit } } } } }
                }
            }`,
            { h: handleOf(a) },
        );
        const p = r.productByIdentifier;
        if (!p) { log(`  ${a.sku}  missing`); continue; }
        const v = p.variants.nodes[0];
        const w = v?.inventoryItem?.measurement?.weight;
        log(`  ${a.sku}  ${p.status.padEnd(7)} ${String(v?.price).padStart(9)}  ${w ? w.value + ' ' + w.unit : 'no weight'}  small=${p.metafield?.value ?? '-'}`);
    }

    step('Delivery profiles');
    const profile = await readProfile();
    log(`  profile: ${profile.name} (default=${profile.default})`);
    for (const z of profile.zones) {
        const countries = z.countries.map(c => c.code.restOfWorld ? 'REST-OF-WORLD' : c.code.countryCode).join(', ');
        log(`  zone "${z.name}" [${countries}] — ${z.rates.length} rate(s)`);
        for (const r of z.rates.slice(0, 3)) log(`      ${r.name} ${r.price ? money(r.price) : '?'} ${describeConditions(r)}`);
        if (z.rates.length > 3) log(`      ... and ${z.rates.length - 3} more`);
    }
}

function describeConditions(rate) {
    return rate.conditions
        .map(c => `${c.operator === 'GREATER_THAN_OR_EQUAL_TO' ? '>=' : '<='} ${c.grams}g`)
        .join(' and ');
}

/* Reads the default delivery profile into a shape the rest of the script can use.

   Split into two calls on purpose: asking for profiles, zones and rates in one query
   multiplies the connection sizes together and Shopify rejects it over the 1000-point
   cost limit. The first call is cheap and only finds which profile we want. */
async function readProfile() {
    const list = await admin(`{ deliveryProfiles(first: 10) { nodes { id name default } } }`);
    const chosen = list.deliveryProfiles.nodes.find(p => p.default) ?? list.deliveryProfiles.nodes[0];
    if (!chosen) throw new AdminError('This store has no delivery profile at all.');

    const d = await admin(
        `query($id: ID!) {
            node(id: $id) {
                ... on DeliveryProfile {
                    id name default
                    profileLocationGroups {
                        locationGroup { id }
                        locationGroupZones(first: 10) {
                            nodes {
                                zone { id name countries { code { countryCode restOfWorld } } }
                                methodDefinitions(first: 40) {
                                    nodes {
                                        id name active
                                        rateProvider { ... on DeliveryRateDefinition { id price { amount currencyCode } } }
                                        methodConditions {
                                            operator
                                            conditionCriteria { ... on Weight { value unit } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }`,
        { id: chosen.id },
    );

    const node = d.node;
    const group = node.profileLocationGroups[0];
    if (!group) throw new AdminError('The default delivery profile has no location group — add a shipping origin in the admin first.');

    const zones = group.locationGroupZones.nodes.map(n => ({
        id: n.zone.id,
        name: n.zone.name,
        countries: n.zone.countries,
        rates: n.methodDefinitions.nodes.map(m => ({
            id: m.id,
            name: m.name,
            price: m.rateProvider?.price ? Math.round(Number(m.rateProvider.price.amount) * 100) : null,
            conditions: (m.methodConditions ?? []).map(c => ({
                operator: c.operator,
                grams: toGrams(c.conditionCriteria),
            })),
        })),
    }));

    return { id: node.id, name: node.name, default: node.default, locationGroupId: group.locationGroup.id, zones };
}

function toGrams(criteria) {
    if (!criteria || criteria.value == null) return null;
    const factor = { GRAMS: 1, KILOGRAMS: 1000, POUNDS: 453.59237, OUNCES: 28.349523125 }[criteria.unit] ?? 1;
    return Math.round(criteria.value * factor);
}

/* ------------------------------------------------------------- metafield */

async function metafield() {
    step('Small item metafield definition (section 2)');
    const existing = await admin(
        `query($ns: String!, $key: String!) {
            metafieldDefinitions(first: 5, ownerType: PRODUCT, namespace: $ns, key: $key) { nodes { id } }
        }`,
        { ns: NS, key: KEY },
    );
    if (existing.metafieldDefinitions.nodes.length) {
        /* A definition created without storefront access is invisible to the Storefront API,
           so the cart cannot see which lines qualify and section 7's flat rate never appears.
           Granting it is idempotent, so it runs on every pass. */
        await admin(
            `mutation($definition: MetafieldDefinitionUpdateInput!) {
                metafieldDefinitionUpdate(definition: $definition) {
                    updatedDefinition { id }
                    userErrors { field message code }
                }
            }`,
            {
                definition: {
                    namespace: NS, key: KEY, ownerType: 'PRODUCT',
                    access: { storefront: 'PUBLIC_READ' },
                },
            },
            ['metafieldDefinitionUpdate'],
        );
        log(`  already defined: ${NS}.${KEY} (storefront read access confirmed)`);
        return;
    }
    await admin(
        `mutation($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
                createdDefinition { id }
                userErrors { field message code }
            }
        }`,
        {
            definition: {
                name: 'Small item',
                namespace: NS,
                key: KEY,
                description: 'Goes by normal post instead of DHL Express. A manual decision by staff, never derived from weight: a 300 g product in a bulky box does not qualify, a 300 g product in an envelope does.',
                type: 'boolean',
                ownerType: 'PRODUCT',
                pin: true,
                /* The cart reads this flag to decide whether section 7's flat rate applies,
                   and the cart is a Storefront API client. */
                access: { storefront: 'PUBLIC_READ' },
            },
        },
        ['metafieldDefinitionCreate'],
    );
    log(`  created and pinned ${NS}.${KEY} (boolean, defaults to no)`);
}

/* -------------------------------------------------------------- products */

async function products() {
    step('Test articles (section 2.1)');

    const pubs = await admin(`{ publications(first: 20) { nodes { id name } } }`);
    const publicationIds = pubs.publications.nodes.map(p => ({ publicationId: p.id }));

    for (const a of ARTICLES) {
        const handle = handleOf(a);
        const data = await admin(
            `mutation($input: ProductSetInput!) {
                productSet(synchronous: true, input: $input) {
                    product { id handle variants(first: 1) { nodes { id sku } } }
                    userErrors { field message }
                }
            }`,
            {
                input: {
                    handle,
                    title: `${a.sku} ${a.name}`,
                    status: 'ACTIVE',
                    vendor: 'PoC',
                    productType: 'Test article',
                    productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
                    metafields: [{ namespace: NS, key: KEY, type: 'boolean', value: String(a.smallItem) }],
                    variants: [{
                        optionValues: [{ optionName: 'Title', name: 'Default Title' }],
                        sku: a.sku,
                        price: money(a.netCents),
                        inventoryItem: {
                            /* Untracked, so a PoC cart is never blocked by stock levels.
                               requiresShipping matters: a weightless, non-shippable item would
                               skip the rate tables entirely. */
                            tracked: false,
                            requiresShipping: true,
                            measurement: { weight: { unit: 'GRAMS', value: a.grams } },
                        },
                    }],
                },
            },
            ['productSet'],
        );

        const id = data.productSet.product.id;
        await admin(
            `mutation($id: ID!, $input: [PublicationInput!]!) {
                publishablePublish(id: $id, input: $input) { userErrors { field message } }
            }`,
            { id, input: publicationIds },
            ['publishablePublish'],
        ).catch(e => log(`      (publish warning: ${e.message})`));

        log(`  ${a.sku}  ${a.name.padEnd(18)} ${kg(a.grams)} kg  net ${money(a.netCents).padStart(9)}  small item: ${a.smallItem ? 'yes' : 'no'}`);
    }
    log(`\n  ${ARTICLES.length} articles upserted and published.`);
}

/* Every rate in a zone needs its own name. Shopify merges method definitions that share one
   and keeps only the last, which silently defeats all 31 weight brackets: whatever the cart
   weighs, checkout offers the final bracket's price. The label doubles as the line the
   customer reads at checkout, so it says the range in kilograms rather than a bracket index. */
function bracketLabel(row) {
    const kg = g => (g / 1000).toFixed(3).replace(/\.?0+$/, '');
    if (row.toGrams === null) return `(${kg(row.fromGrams)} kg and over)`;
    if (row.fromGrams === 1) return `(up to ${kg(row.toGrams + 1)} kg)`;
    return `(${kg(row.fromGrams)}–${kg(row.toGrams + 1)} kg)`;
}

/* -------------------------------------------------------------- shipping */

async function shipping({ replaceZones, carrierOnly }) {
    step('Zones and rate tables (sections 4, 5, 8)');

    const problems = checkTranscription();
    if (problems.length) throw new AdminError('Rate tables do not reconcile with the spec:\n' + problems.join('\n'));
    log('  transcription check: all 66 brackets gross up to the spec figures');

    const profile = await readProfile();
    const wanted = new Set(ZONES.map(z => z.name));
    const clashing = profile.zones.filter(z => wanted.has(z.name));
    const others = profile.zones.filter(z => !wanted.has(z.name));

    if ((clashing.length || others.length) && !replaceZones) {
        log(`\n  The default profile already has ${profile.zones.length} zone(s):`);
        for (const z of profile.zones) log(`    "${z.name}" with ${z.rates.length} rate(s)`);
        log('\n  Re-run with --replace-zones to delete these and write the spec tables in their place.');
        return;
    }

    if (replaceZones && profile.zones.length) {
        await admin(
            `mutation($id: ID!, $profile: DeliveryProfileInput!) {
                deliveryProfileUpdate(id: $id, profile: $profile) { profile { id } userErrors { field message } }
            }`,
            { id: profile.id, profile: { zonesToDelete: profile.zones.map(z => z.id) } },
            ['deliveryProfileUpdate'],
        );
        log(`  removed ${profile.zones.length} existing zone(s)`);
    }

    /* One call per zone: 31 method definitions in a single mutation is already a heavy query,
       and a failure is far easier to read when it names one zone. */
    for (const zone of ZONES) {
        const rows = RATE_TABLES[zone.key];
        const methodDefinitionsToCreate = rows.map(row => ({
            name: `${zone.rateLabel} ${bracketLabel(row)}`,
            active: true,
            rateDefinition: { price: { amount: money(row.netCents), currencyCode: CURRENCY } },
            /* Kilograms, not grams. The API accepts GRAMS and echoes it back faithfully, but
               the rate engine compares the cart weight in the shop's own unit against the
               bare number, so a 4.2 kg cart tested "4200 >= 9.9" and matched the top bracket
               every time. Expressed in kilograms both sides agree. Three decimals is exactly
               gram precision, which is what section 9 asks for. */
            weightConditionsToCreate: [
                { criteria: { unit: 'KILOGRAMS', value: row.fromGrams / 1000 }, operator: 'GREATER_THAN_OR_EQUAL_TO' },
                ...(row.toGrams === null ? [] : [{ criteria: { unit: 'KILOGRAMS', value: row.toGrams / 1000 }, operator: 'LESS_THAN_OR_EQUAL_TO' }]),
            ],
        }));

        await admin(
            `mutation($id: ID!, $profile: DeliveryProfileInput!) {
                deliveryProfileUpdate(id: $id, profile: $profile) { profile { id } userErrors { field message } }
            }`,
            {
                id: profile.id,
                profile: {
                    locationGroupsToUpdate: [{
                        id: profile.locationGroupId,
                        zonesToCreate: [{
                            name: zone.name,
                            countries: zone.countries.map(code => ({ code })),
                            /* With a carrier service the zone still has to exist, because
                               Shopify only asks us for rates to countries it already serves.
                               The brackets themselves come from our endpoint instead. */
                            methodDefinitionsToCreate: carrierOnly ? [] : methodDefinitionsToCreate,
                        }],
                    }],
                },
            },
            ['deliveryProfileUpdate'],
        );

        if (carrierOnly) {
            log(`  ${zone.name.padEnd(18)} ${zone.countries.join(', ').padEnd(12)} zone only — rates come from /api/shop/rates`);
            continue;
        }
        const first = rows[0], last = rows[rows.length - 1];
        const note = zone.key === 'ww2' ? `  (each bracket carries the ${money(CUSTOMS_FEE_CENTS)} customs fee)` : '';
        log(`  ${zone.name.padEnd(18)} ${zone.countries.join(', ').padEnd(12)} ${rows.length} brackets, ${money(first.netCents)} to ${money(last.netCents)} net${note}`);
    }

    log('\n  A cart weighing 0 g now matches no bracket at all, so checkout stops with');
    log('  "no shipping available" rather than shipping for nothing (section 9).');
}

/* --------------------------------------------------------------- carrier */

/* Points Shopify at our own rate endpoint. Shopify then asks us for the rates at checkout
   instead of reading its own tables, so what the checkout page shows and what Shopify charges
   come from one piece of code. The URL has to be publicly reachable — Shopify calls it from
   its own servers, so localhost is no use. */
async function carrier({ url }) {
    step('Carrier service (our own rates)');

    if (!url) {
        log('  Needs the deployed origin, for example:');
        log('    node scripts/shopify/setup.mjs carrier --url=https://bss-shop.vercel.app');
        const existing = await admin(`{ carrierServices(first: 20) { nodes { id name callbackUrl active } } }`);
        if (existing.carrierServices.nodes.length) {
            log('\n  Registered right now:');
            for (const c of existing.carrierServices.nodes) {
                log(`    ${c.name} -> ${c.callbackUrl} (active=${c.active})`);
            }
        }
        return;
    }

    const origin = url.replace(/\/$/, '');
    if (!/^https:\/\//.test(origin)) throw new AdminError('The callback URL must be https.');
    const callbackUrl = `${origin}/api/shop/rates`;

    /* Check it answers before handing it to Shopify — a carrier service that times out makes
       checkout show no delivery options at all. */
    try {
        const probe = await fetch(callbackUrl, { method: 'GET' });
        log(`  probe GET ${callbackUrl} -> HTTP ${probe.status}`);
        if (!probe.ok) log('  (a non-200 here usually means the deploy has not finished)');
    } catch (err) {
        throw new AdminError(`Could not reach ${callbackUrl} — is it deployed and public?`, String(err));
    }

    const existing = await admin(`{ carrierServices(first: 20) { nodes { id name callbackUrl } } }`);
    for (const c of existing.carrierServices.nodes.filter((n) => n.name === CARRIER_NAME)) {
        await admin(
            `mutation($id: ID!) { carrierServiceDelete(id: $id) { deletedId userErrors { message } } }`,
            { id: c.id }, ['carrierServiceDelete'],
        );
        log(`  removed previous registration (${c.callbackUrl})`);
    }

    const created = await admin(
        `mutation($input: DeliveryCarrierServiceCreateInput!) {
            carrierServiceCreate(input: $input) {
                carrierService { id name callbackUrl active }
                userErrors { field message }
            }
        }`,
        { input: { name: CARRIER_NAME, callbackUrl, supportsServiceDiscovery: true, active: true } },
        ['carrierServiceCreate'],
    );

    const service = created.carrierServiceCreate.carrierService;
    log(`  registered "${service.name}" -> ${service.callbackUrl} (active=${service.active})`);
    log('\n  Now run the shipping stage with --carrier-only to clear the 66 static brackets,');
    log('  otherwise Shopify offers both its own rates and ours side by side.');
}

const CARRIER_NAME = 'BSS LogisQ rates';

/* ---------------------------------------------------------------- verify */

async function verify() {
    step('Replaying section 10 against what is actually in the store');

    /* Pull the real weights, prices and flags back out of Shopify rather than trusting the
       spec file — the point is to test the store, not our own arithmetic. */
    const live = {};
    for (const a of ARTICLES) {
        const r = await admin(
            `query($h: String!) {
                productByIdentifier(identifier: { handle: $h }) {
                    metafield(namespace: "${NS}", key: "${KEY}") { value }
                    variants(first: 1) { nodes { sku price inventoryItem { requiresShipping measurement { weight { value unit } } } } }
                }
            }`,
            { h: handleOf(a) },
        );
        const v = r.productByIdentifier?.variants.nodes[0];
        if (!v) { log(`  ${a.sku} is missing from the store — run the products stage first.`); return; }
        live[a.sku] = {
            grams: toGrams(v.inventoryItem?.measurement?.weight),
            netCents: Math.round(Number(v.price) * 100),
            smallItem: r.productByIdentifier.metafield?.value === 'true',
            requiresShipping: v.inventoryItem?.requiresShipping,
        };
    }

    const drift = ARTICLES.filter(a =>
        live[a.sku].grams !== a.grams ||
        live[a.sku].netCents !== a.netCents ||
        live[a.sku].smallItem !== a.smallItem);
    if (drift.length) {
        log('  Store data disagrees with the spec:');
        for (const a of drift) {
            log(`    ${a.sku}: store has ${kg(live[a.sku].grams)} kg / ${money(live[a.sku].netCents)} / small=${live[a.sku].smallItem},` +
                ` spec says ${kg(a.grams)} kg / ${money(a.netCents)} / small=${a.smallItem}`);
        }
    } else {
        log('  All eight articles match the spec on weight, net price and the small item flag.');
    }

    /* And the rate tables, read back from the delivery profile. */
    const profile = await readProfile();
    const zoneByCountry = {};
    for (const z of profile.zones) {
        for (const c of z.countries) {
            if (!c.code.restOfWorld) zoneByCountry[c.code.countryCode] = z;
        }
    }

    const liveRate = (country, grams) => {
        const z = zoneByCountry[country];
        if (!z) return { error: `no zone covers ${country}` };
        const matches = z.rates.filter(r => {
            const min = r.conditions.find(c => c.operator === 'GREATER_THAN_OR_EQUAL_TO');
            const max = r.conditions.find(c => c.operator === 'LESS_THAN_OR_EQUAL_TO');
            return (!min || grams >= min.grams) && (!max || grams <= max.grams);
        });
        if (!matches.length) return { error: 'no rate matches this weight' };
        if (matches.length > 1) return { error: `${matches.length} rates match — brackets overlap`, cents: matches[0].price };
        return { cents: matches[0].price };
    };

    log('');
    let pass = 0, skipped = 0;
    for (const t of TEST_CASES) {
        const grams = Object.entries(t.cart).reduce((s, [sku, q]) => s + live[sku].grams * q, 0);
        const goods = Object.entries(t.cart).reduce((s, [sku, q]) => s + live[sku].netCents * q, 0);

        if (t.needsFlatRate) {
            const allSmall = Object.keys(t.cart).every(sku => live[sku].smallItem);
            log(`  SKIP  ${t.id}  flat rate not implemented — Shopify cannot condition a rate on a metafield.` +
                ` Every item qualifies: ${allSmall ? 'yes' : 'no'} (the flag itself is correct).`);
            skipped++;
            continue;
        }
        if (t.needsVatId) {
            log(`  SKIP  ${t.id}  EU reverse charge needs Plus B2B or an app; nothing to assert here yet.`);
            skipped++;
            continue;
        }

        const rate = liveRate(t.country, grams);
        if (rate.error) { log(`  FAIL  ${t.id}  ${rate.error}`); continue; }

        const net = goods + rate.cents;
        const vat = t.vat ? grossCents(net) - net : 0;
        const total = net + vat;
        const ok = grams === t.grams && goods === t.goodsNet && rate.cents === t.shipNet + t.customs
            && vat === t.vatCents && total === t.total;
        if (ok) pass++;

        log(`  ${ok ? 'PASS' : 'FAIL'}  ${t.id}  ${t.country}  ${kg(grams).padStart(7)} kg  goods ${money(goods).padStart(9)}` +
            `  ship ${money(rate.cents).padStart(7)}  vat ${money(vat).padStart(8)}  total ${money(total).padStart(9)}` +
            (ok ? '' : `   expected total ${money(t.total)}, ship ${money(t.shipNet + t.customs)}`));
    }

    const asserted = TEST_CASES.length - skipped;
    log(`\n  ${pass}/${asserted} asserted scenarios pass; ${skipped} skipped (T4 flat rate, T7 reverse charge).`);
    log('  Note: this replays the rate tables. VAT here is computed from the spec, not read from');
    log('  a real Shopify checkout — tax settings still have to be confirmed in the admin.');
}

/* ------------------------------------------------------------------ main */

const STAGES = { inspect, metafield, products, shipping, carrier, verify };

async function main() {
    const args = process.argv.slice(2);
    const replaceZones = args.includes('--replace-zones');
    const url = (args.find(a => a.startsWith('--url=')) ?? '').slice(6);
    const carrierOnly = args.includes('--carrier-only');
    const names = args.filter(a => !a.startsWith('--'));
    const stage = names[0] ?? 'inspect';

    const order = stage === 'all' ? ['metafield', 'products', 'shipping', 'verify'] : [stage];
    for (const s of order) {
        if (!STAGES[s]) {
            console.error(`Unknown stage "${s}". One of: ${Object.keys(STAGES).join(', ')}, all`);
            process.exit(1);
        }
    }
    for (const s of order) await STAGES[s]({ replaceZones, url, carrierOnly });
    log('');
}

main().catch(err => {
    console.error(`\n${err.name === 'AdminError' ? 'Shopify rejected this' : 'Failed'}: ${err.message}`);
    if (err.detail) console.error(JSON.stringify(err.detail, null, 2));
    process.exit(1);
});
