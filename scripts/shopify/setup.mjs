/* Provisions the PoC store from the spec. Run stages one at a time:

     node scripts/shopify/setup.mjs inspect     what the store looks like now, changes nothing
     node scripts/shopify/setup.mjs metafield   the small item flag (section 2)
     node scripts/shopify/setup.mjs products    the eight test articles (section 2.1)
     node scripts/shopify/setup.mjs inventory   tracks them and stocks 1000 of each
     node scripts/shopify/setup.mjs categories  sets each article's Shopify category
     node scripts/shopify/setup.mjs shipping    zones and the 66 weight brackets (sections 4, 5, 8)
     node scripts/shopify/setup.mjs verify      reads the store back and replays section 10

   And scripts/shopify/spec-test.mjs runs the whole spec against the deployed rate endpoint.

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

/* One method definition per zone whose rates come from our endpoint rather than a fixed
   price. adaptToNewServices means a service we start returning later — the small item flat
   rate, say — is offered without anyone having to tick it on here. */
function participantFor(carrierServiceId) {
    return {
        name: CARRIER_NAME,
        active: true,
        participant: { carrierServiceId, adaptToNewServices: true, participantServices: [] },
    };
}

async function shipping({ replaceZones, carrierOnly }) {
    step(carrierOnly ? 'Zones served by our own rate endpoint' : 'Zones and rate tables (sections 4, 5, 8)');

    let carrierServiceId = null;
    if (carrierOnly) {
        const found = await admin(`{ carrierServices(first: 20) { nodes { id name active } } }`);
        const service = found.carrierServices.nodes.find(c => c.name === CARRIER_NAME);
        if (!service) throw new AdminError(`No carrier service called "${CARRIER_NAME}" — run the carrier stage first.`);
        if (!service.active) throw new AdminError(`"${CARRIER_NAME}" is registered but inactive; Shopify will never call it.`);
        carrierServiceId = service.id;
        log(`  rates will come from "${service.name}"`);
    }

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
                               Shopify only asks us for rates to countries it already serves —
                               and it only asks at all once the zone carries a participant
                               pointing at the service. Activating the service is not enough
                               on its own: a zone holding no method definitions is quoted
                               nothing, which looks exactly like a broken endpoint. */
                            methodDefinitionsToCreate: carrierOnly ? [participantFor(carrierServiceId)] : methodDefinitionsToCreate,
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

    const CREATE = `mutation($input: DeliveryCarrierServiceCreateInput!) {
        carrierServiceCreate(input: $input) {
            carrierService { id name callbackUrl active }
            userErrors { field message }
        }
    }`;
    const input = { name: CARRIER_NAME, callbackUrl, supportsServiceDiscovery: true };

    /* Registering the service is allowed on any plan; switching it on is not. "Carrier
       Calculated Shipping" comes with the Advanced plan, or with any plan billed annually.
       Without it Shopify never calls this endpoint and keeps quoting its own tables, so an
       inactive registration is reported as a blocker rather than a success. */
    let service;
    try {
        service = (await admin(CREATE, { input: { ...input, active: true } }, ['carrierServiceCreate']))
            .carrierServiceCreate.carrierService;
    } catch (err) {
        if (!JSON.stringify(err.detail ?? '').includes('Carrier Calculated Shipping')) throw err;

        service = (await admin(CREATE, { input: { ...input, active: false } }, ['carrierServiceCreate']))
            .carrierServiceCreate.carrierService;

        log(`  registered "${service.name}" -> ${service.callbackUrl}`);
        log('  but INACTIVE: this plan does not include Carrier Calculated Shipping.');
        log('');
        log('  Shopify will not call the endpoint until that is enabled — the Advanced plan,');
        log('  or the current plan switched to annual billing. Until then the store quotes its');
        log('  own tables while the checkout page shows the correct figures, so the two still');
        log('  disagree and no order should be taken.');
        log('');
        log('  Once enabled, run:');
        log('    node scripts/shopify/setup.mjs shipping --replace-zones --carrier-only');
        return;
    }

    log(`  registered "${service.name}" -> ${service.callbackUrl} (active=${service.active})`);
    log('');
    log('  Now clear the 66 static brackets, or Shopify offers its rates beside ours:');
    log('    node scripts/shopify/setup.mjs shipping --replace-zones --carrier-only');
}

const CARRIER_NAME = 'BSS LogisQ rates';

/* ------------------------------------------------------------- inventory */

/* Turns tracking on and stocks every test article.

   The articles were created untracked on purpose, so a PoC cart could never be blocked by
   stock levels. Tracking them makes the admin read like a real catalogue instead of showing
   "Inventory not tracked" on every row — at the price that an article can now run out, so
   each one is stocked deep enough that running the test suite cannot exhaust it. */
const STOCK = 1000;

async function inventory() {
    step('Inventory for the test articles');

    for (const a of ARTICLES) {
        const read = await admin(
            `query($h: String!) {
                productByIdentifier(identifier: { handle: $h }) {
                    variants(first: 1) { nodes {
                        inventoryItem { id tracked inventoryLevels(first: 5) { nodes { location { id } } } }
                    } }
                }
            }`,
            { h: handleOf(a) },
        );

        const item = read.productByIdentifier?.variants.nodes[0]?.inventoryItem;
        if (!item) { log(`  ${a.sku}  missing — run the products stage first`); continue; }

        const locationId = item.inventoryLevels.nodes[0]?.location?.id;
        if (!locationId) { log(`  ${a.sku}  no stock location`); continue; }

        if (!item.tracked) {
            await admin(
                `mutation($id: ID!, $input: InventoryItemInput!) {
                    inventoryItemUpdate(id: $id, input: $input) {
                        inventoryItem { id tracked }
                        userErrors { field message }
                    }
                }`,
                { id: item.id, input: { tracked: true } },
                ['inventoryItemUpdate'],
            );
        }

        await admin(
            `mutation($input: InventorySetQuantitiesInput!) {
                inventorySetQuantities(input: $input) {
                    inventoryAdjustmentGroup { createdAt }
                    userErrors { field message }
                }
            }`,
            {
                input: {
                    name: 'available',
                    reason: 'correction',
                    /* Nothing else is writing to these counts, so there is no revision to
                       race against. */
                    ignoreCompareQuantity: true,
                    quantities: [{ inventoryItemId: item.id, locationId, quantity: STOCK }],
                },
            },
            ['inventorySetQuantities'],
        );

        log(`  ${a.sku}  ${a.name.padEnd(18)} tracked, ${STOCK} in stock`);
    }
}

/* ------------------------------------------------------------ categories */

/* Sets each article's Shopify standard category — the Category column in the admin.

   Nothing in the calculation depends on it. It is here so the test articles read like a real
   catalogue rather than eight uncategorised rows, and because Shopify uses the category to
   suggest the metafields and attributes a product of that kind would normally carry. */
async function categories() {
    step('Product categories');

    for (const a of ARTICLES) {
        if (!a.category) { log(`  ${a.sku}  no category in the spec data`); continue; }

        const read = await admin(
            `query($h: String!) { productByIdentifier(identifier: { handle: $h }) { id } }`,
            { h: handleOf(a) },
        );
        const id = read.productByIdentifier?.id;
        if (!id) { log(`  ${a.sku}  missing — run the products stage first`); continue; }

        const data = await admin(
            `mutation($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
                    product { id category { id fullName } }
                    userErrors { field message }
                }
            }`,
            { product: { id, category: `gid://shopify/TaxonomyCategory/${a.category}` } },
            ['productUpdate'],
        );

        const set = data.productUpdate.product.category;
        log(`  ${a.sku}  ${a.name.padEnd(18)} ${set?.fullName ?? '(not set)'}`);
    }
}

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

const STAGES = { inspect, metafield, products, inventory, categories, shipping, carrier, verify };

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
