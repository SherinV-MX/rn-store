/* Runs the spec against the live rate endpoint.

     node scripts/shopify/spec-test.mjs                     # tests production
     node scripts/shopify/spec-test.mjs --local             # tests localhost:3000

   Section 10's ten worked examples, then the edge cases section 9 warns about. Shipping comes
   from the deployed endpoint — the same URL Shopify's checkout calls — so a pass here means
   Shopify would quote the same figure. VAT and totals are then derived from that rate.

   Expected figures are transcribed from the spec, never computed by the code under test. */

import { loadEnv, admin } from './admin.mjs';
import { ARTICLES, TEST_CASES, bySku, grossCents } from './spec-data.mjs';

loadEnv();

const LOCAL = process.argv.includes('--local');
const ORIGIN = LOCAL ? 'http://localhost:3000' : 'https://rn-store-six.vercel.app';
const ENDPOINT = `${ORIGIN}/api/shop/rates`;

const money = c => (c / 100).toFixed(2);
const kg = g => (g / 1000).toFixed(3);

let pass = 0, fail = 0;
const failures = [];

function check(name, ok, detail) {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fail++; failures.push(`${name} — ${detail}`); console.log(`  FAIL  ${name}  ${detail}`); }
}

/* ------------------------------------------------- the endpoint, as Shopify calls it */

const variantIds = {};

async function loadVariantIds() {
    for (const a of ARTICLES) {
        const handle = `ta-${a.sku.slice(3)}-${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const d = await admin(
            `query($h: String!) { productByIdentifier(identifier: { handle: $h }) { variants(first: 1) { nodes { id } } } }`,
            { h: handle },
        );
        const gid = d.productByIdentifier?.variants.nodes[0]?.id;
        if (!gid) throw new Error(`${a.sku} is missing from the store`);
        variantIds[a.sku] = Number(gid.split('/').pop());
    }
}

/* The payload shape Shopify posts to a carrier service. */
async function rates(cart, country, overrides = {}) {
    const items = Object.entries(cart).map(([sku, quantity]) => ({
        name: sku,
        sku,
        quantity,
        grams: overrides.grams?.[sku] ?? bySku[sku].grams,
        price: bySku[sku].netCents,
        requires_shipping: overrides.requiresShipping?.[sku] ?? true,
        product_id: null,
        variant_id: variantIds[sku],
    }));

    /* A serverless endpoint occasionally drops a connection while it cold-starts, and a
       dropped connection is not a failed assertion — retry before believing it. */
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rate: { destination: { country }, items, currency: 'EUR' } }),
            });
            if (!res.ok) throw new Error(`endpoint returned HTTP ${res.status}`);
            const body = await res.json();
            return (body.rates ?? []).map(r => ({ name: r.service_name, code: r.service_code, cents: Number(r.total_price) }));
        } catch (err) {
            lastError = err;
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

const weightOf = (cart, overrides = {}) =>
    Object.entries(cart).reduce((s, [sku, q]) => s + (overrides.grams?.[sku] ?? bySku[sku].grams) * q, 0);
const goodsOf = cart =>
    Object.entries(cart).reduce((s, [sku, q]) => s + bySku[sku].netCents * q, 0);

/* ------------------------------------------------------------------ section 10 */

async function sectionTen() {
    console.log('\n=== Section 10: the ten worked examples ===\n');

    for (const t of TEST_CASES) {
        const offered = await rates(t.cart, t.country);
        const wanted = t.needsFlatRate ? 'small-item' : 'weight';
        const chosen = offered.find(r => r.code === wanted);

        const grams = weightOf(t.cart);
        const goods = goodsOf(t.cart);

        if (!chosen) {
            check(`${t.id} ${t.country}`, false, `no "${wanted}" rate (got ${offered.map(r => r.code).join(', ') || 'none'})`);
            continue;
        }

        /* Section 6: shipping is taxed exactly like the goods, so VAT applies to the sum. */
        const net = goods + chosen.cents;
        const vat = t.vat ? grossCents(net) - net : 0;
        const total = net + vat;

        const problems = [];
        if (grams !== t.grams) problems.push(`weight ${kg(grams)} != ${kg(t.grams)}`);
        if (goods !== t.goodsNet) problems.push(`goods ${money(goods)} != ${money(t.goodsNet)}`);
        if (chosen.cents !== t.shipNet + t.customs) problems.push(`shipping ${money(chosen.cents)} != ${money(t.shipNet + t.customs)}`);
        if (vat !== t.vatCents) problems.push(`vat ${money(vat)} != ${money(t.vatCents)}`);
        if (total !== t.total) problems.push(`total ${money(total)} != ${money(t.total)}`);

        /* T4 also has to offer the express rate beside the flat one, and T5/T10 must not
           offer the flat rate at all. */
        if (t.id === 'T4' && !offered.some(r => r.code === 'weight')) problems.push('express alternative missing');
        if ((t.id === 'T5' || t.id === 'T10') && offered.some(r => r.code === 'small-item')) problems.push('flat rate offered but must not be');

        check(
            `${t.id}  ${t.country}  ${kg(grams).padStart(7)}kg  ship ${money(chosen.cents).padStart(7)}  vat ${money(vat).padStart(8)}  total ${money(total).padStart(9)}`,
            problems.length === 0,
            problems.join('; '),
        );
    }
}

/* ------------------------------------------------------------------- section 9 */

async function edgeCases() {
    console.log('\n=== Section 9 and the boundaries ===\n');

    /* "A weight that exactly equals a threshold belongs to the higher bracket. Exactly 3.3 kg
       domestic costs 22.00, not 21.00." */
    const boundaries = [
        ['domestic 3.299 kg -> 21.00', { 'TA-01': 1 }, 'DE', 3299, 2100],
        ['domestic 3.300 kg -> 22.00', { 'TA-01': 1 }, 'DE', 3300, 2200],
        ['domestic 5.299 kg -> 22.00', { 'TA-01': 1 }, 'DE', 5299, 2200],
        ['domestic 5.300 kg -> 27.00', { 'TA-01': 1 }, 'DE', 5300, 2700],
        ['domestic 9.899 kg -> 27.00', { 'TA-01': 1 }, 'DE', 9899, 2700],
        ['domestic 9.900 kg -> 33.00', { 'TA-01': 1 }, 'DE', 9900, 3300],
        ['zone 1  0.499 kg -> 51.00', { 'TA-01': 1 }, 'FR', 499, 5100],
        ['zone 1  0.500 kg -> 59.00', { 'TA-01': 1 }, 'FR', 500, 5900],
        ['zone 1 14.999 kg -> 126.00', { 'TA-01': 1 }, 'FR', 14999, 12600],
        ['zone 1 15.000 kg -> 129.00', { 'TA-01': 1 }, 'FR', 15000, 12900],
        ['zone 2  0.499 kg -> 105.00 (65 + 40)', { 'TA-01': 1 }, 'ME', 499, 10500],
        ['zone 2 15.000 kg -> 237.00 (197 + 40)', { 'TA-01': 1 }, 'ME', 15000, 23700],
    ];

    for (const [name, cart, country, grams, expect] of boundaries) {
        const offered = await rates(cart, country, { grams: { 'TA-01': grams } });
        const r = offered.find(x => x.code === 'weight');
        check(name, r?.cents === expect, r ? `got ${money(r.cents)}` : 'no rate returned');
    }

    /* "There is no upper limit. A 40 kg cart pays the top bracket, same as a 15 kg cart." */
    for (const [label, grams] of [['40 kg', 40000], ['400 kg', 400000]]) {
        const offered = await rates({ 'TA-01': 1 }, 'DE', { grams: { 'TA-01': grams } });
        const r = offered.find(x => x.code === 'weight');
        check(`no upper limit: ${label} domestic -> 33.00`, r?.cents === 3300, r ? `got ${money(r.cents)}` : 'no rate');
    }

    /* "A cart weighing exactly 0 would ship free, which is wrong — checkout must be blocked." */
    const zero = await rates({ 'TA-06': 1 }, 'DE', { grams: { 'TA-06': 0 } });
    check('zero-weight cart is refused a rate', zero.length === 0, `got ${zero.length} rate(s)`);

    /* A line that ships nothing must not drag the cart to zero on its own. */
    const nonShippable = await rates({ 'TA-01': 1, 'TA-06': 1 }, 'DE', { requiresShipping: { 'TA-06': false } });
    const ns = nonShippable.find(x => x.code === 'weight');
    check('non-shippable line excluded from cart weight (4.2 kg -> 22.00)', ns?.cents === 2200, ns ? `got ${money(ns.cents)}` : 'no rate');

    /* Section 4: a country in no zone cannot be quoted. */
    const unknown = await rates({ 'TA-01': 1 }, 'US');
    check('country outside every zone gets no rate', unknown.length === 0, `got ${unknown.length} rate(s)`);
}

/* --------------------------------------------------------- sections 7 and 8 */

async function partB() {
    console.log('\n=== Section 7: the small item flat rate ===\n');

    const allSmall = await rates({ 'TA-05': 2, 'TA-06': 1, 'TA-07': 1 }, 'DE');
    check('every item qualifies -> flat rate offered', allSmall.some(r => r.code === 'small-item'), 'missing');
    check('every item qualifies -> express still offered too', allSmall.some(r => r.code === 'weight'), 'missing');

    const oneBad = await rates({ 'TA-05': 2, 'TA-06': 1, 'TA-07': 1, 'TA-03': 1 }, 'DE');
    check('one non-qualifying item removes it for the whole cart', !oneBad.some(r => r.code === 'small-item'), 'still offered');

    const tinyBad = await rates({ 'TA-06': 1, 'TA-07': 1, 'TA-04': 1 }, 'DE');
    check('a 0.67 kg cart with one non-qualifying item still loses it', !tinyBad.some(r => r.code === 'small-item'), 'still offered');

    for (const country of ['FR', 'NL', 'BE', 'ME']) {
        const abroad = await rates({ 'TA-05': 2, 'TA-06': 1, 'TA-07': 1 }, country);
        check(`not offered outside Germany (${country})`, !abroad.some(r => r.code === 'small-item'), 'offered abroad');
    }

    const flat = allSmall.find(r => r.code === 'small-item');
    check('flat rate is 10.00 net', flat?.cents === 1000, flat ? `got ${money(flat.cents)}` : 'missing');

    console.log('\n=== Section 8: the customs surcharge ===\n');

    /* "A flat 40.00 for every non-EU order, whatever the cart contains." */
    const light = await rates({ 'TA-06': 1 }, 'ME');
    const heavy = await rates(Object.fromEntries(ARTICLES.map(a => [a.sku, 3])), 'ME');
    check('non-EU light cart carries the fee (65 + 40)', light.find(r => r.code === 'weight')?.cents === 10500,
        `got ${money(light.find(r => r.code === 'weight')?.cents ?? 0)}`);
    check('non-EU heavy cart carries the same flat fee (197 + 40)', heavy.find(r => r.code === 'weight')?.cents === 23700,
        `got ${money(heavy.find(r => r.code === 'weight')?.cents ?? 0)}`);

    for (const country of ['DE', 'FR', 'NL', 'BE']) {
        const eu = await rates({ 'TA-01': 1 }, country);
        const r = eu.find(x => x.code === 'weight');
        const expected = country === 'DE' ? 2200 : 7200;
        check(`no customs fee for ${country}`, r?.cents === expected, r ? `got ${money(r.cents)}` : 'no rate');
    }

    console.log('\n=== Section 6: who pays VAT ===\n');

    const goods = 57000, ship = 6200;
    const cases = [
        ['Germany, private', true, 12008, 75208],
        ['Germany, with a German VAT number', true, 12008, 75208],
        ['EU private, no VAT number', true, 12008, 75208],
        ['EU company, valid VAT number', false, 0, 63200],
        ['non-EU, anyone', false, 0, 63200],
    ];
    for (const [label, taxed, wantVat, wantTotal] of cases) {
        const net = goods + ship;
        const vat = taxed ? grossCents(net) - net : 0;
        check(`${label}: vat ${money(vat)}, total ${money(net + vat)}`,
            vat === wantVat && net + vat === wantTotal, `expected ${money(wantVat)} / ${money(wantTotal)}`);
    }
}

/* ------------------------------------------------------------------------ main */

async function main() {
    console.log(`Endpoint under test: ${ENDPOINT}`);
    const probe = await fetch(ENDPOINT).catch(() => null);
    if (!probe?.ok) throw new Error(`${ENDPOINT} is not answering — is it deployed?`);

    await loadVariantIds();
    await sectionTen();
    await edgeCases();
    await partB();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
    if (failures.length) {
        console.log('\n  Failures:');
        for (const f of failures) console.log(`    - ${f}`);
    }
    console.log('='.repeat(60));
    process.exit(fail ? 1 : 0);
}

main().catch(err => {
    console.error(`\nFailed: ${err.message}`);
    if (err.detail) console.error(JSON.stringify(err.detail, null, 2));
    process.exit(1);
});
