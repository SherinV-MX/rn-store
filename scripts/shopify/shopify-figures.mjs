/* Asks Shopify what each section 10 scenario costs.

     node scripts/shopify/shopify-figures.mjs

   Everything printed comes back from Shopify: the subtotal, the delivery rate it selected, the
   tax its own engine computed, and the total it would charge. Nothing is calculated here.

   The rate only materialises once the cart is prepared for completion — before that Shopify
   has not called the carrier service — so each cart is prepared, the intended delivery option
   is selected, and then prepared again so the tax is recalculated against that rate. */

import { loadEnv } from './admin.mjs';
import { TEST_CASES, ARTICLES } from './spec-data.mjs';

loadEnv();

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const API = `https://${DOMAIN}/api/2026-01/graphql.json`;

const money = c => (c / 100).toFixed(2);
const pause = ms => new Promise(r => setTimeout(r, ms));

async function sf(query, variables = {}, attempt = 1) {
    const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': TOKEN },
        body: JSON.stringify({ query, variables }),
    });
    const body = await res.json();
    if (body.errors) {
        /* The Storefront API throttles a burst of cart mutations; back off rather than fail. */
        const throttled = JSON.stringify(body.errors).includes('Throttled');
        if (throttled && attempt <= 5) {
            await pause(4000 * attempt);
            return sf(query, variables, attempt + 1);
        }
        throw new Error(JSON.stringify(body.errors));
    }
    return body.data;
}

/* Section 10.1. Only the country changes the calculation, but the rest is sent as a buyer
   would type it. */
const ADDRESSES = {
    DE: { ref: 'A1', firstName: 'Maria', lastName: 'Schulte', address1: 'Lindenstrasse 14', city: 'Moenchengladbach', zip: '41061', countryCode: 'DE' },
    FR: { ref: 'A2', firstName: 'Julien', lastName: 'Moreau', address1: '27 rue des Tanneurs', city: 'Lyon', zip: '69001', countryCode: 'FR' },
    NL: { ref: 'A3', firstName: 'Veldhuis', lastName: 'Racing', company: 'Veldhuis Racing B.V.', address1: 'Industrieweg 88', city: 'Best', zip: '5683 CE', countryCode: 'NL' },
    ME: { ref: 'A4', firstName: 'Nikola', lastName: 'Vukovic', address1: 'Ulica Slobode 42', city: 'Podgorica', zip: '81000', countryCode: 'ME' },
};

const handleOf = a => `ta-${a.sku.slice(3)}-${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const variants = {};
async function loadVariants() {
    for (const a of ARTICLES) {
        const d = await sf(`query($h:String!){ product(handle:$h){ variants(first:1){ nodes { id } } } }`,
            { h: handleOf(a) });
        variants[a.sku] = d.product.variants.nodes[0].id;
    }
}

const PREPARE = `
    mutation Prepare($cartId: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartPrepareForCompletion(cartId: $cartId) {
            result {
                __typename
                ... on CartStatusReady { cart { id } }
                ... on CartStatusNotReady { errors { code message } }
            }
            userErrors { message }
        }
    }`;

const READ = `
    query Read($id: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cart(id: $id) {
            cost {
                subtotalAmount { amount }
                totalTaxAmount { amount }
                totalAmount { amount }
            }
            deliveryGroups(first: 5) {
                nodes {
                    id
                    selectedDeliveryOption { title estimatedCost { amount } }
                    deliveryOptions { handle title estimatedCost { amount } }
                }
            }
        }
    }`;

async function figuresFor(test) {
    const address = ADDRESSES[test.country];
    const ctx = { country: test.country, language: 'EN' };
    const lines = Object.entries(test.cart).map(([sku, quantity]) => ({ merchandiseId: variants[sku], quantity }));

    const created = await sf(
        `mutation($input: CartInput!){ cartCreate(input: $input){ cart { id } userErrors { message } } }`,
        { input: { lines } });
    const cartId = created.cartCreate.cart.id;

    await sf(`mutation($cartId:ID!,$buyerIdentity:CartBuyerIdentityInput!,$country:CountryCode,$language:LanguageCode)
        @inContext(country:$country,language:$language){
        cartBuyerIdentityUpdate(cartId:$cartId, buyerIdentity:$buyerIdentity){ cart { id } userErrors { message } } }`,
        { cartId, buyerIdentity: { email: 'poc@example.com', countryCode: test.country }, ...ctx });

    const { ref, ...deliveryAddress } = address;
    void ref;
    await sf(`mutation($cartId:ID!,$addresses:[CartSelectableAddressInput!]!,$country:CountryCode,$language:LanguageCode)
        @inContext(country:$country,language:$language){
        cartDeliveryAddressesAdd(cartId:$cartId, addresses:$addresses){ cart { id } userErrors { message } } }`,
        { cartId, addresses: [{ selected: true, address: { deliveryAddress } }], ...ctx });

    /* Shopify has not asked the carrier for rates yet; preparing is what triggers it. */
    await sf(PREPARE, { cartId, ...ctx });
    let read = await sf(READ, { id: cartId, ...ctx });

    const group = read.cart.deliveryGroups.nodes[0];
    const wanted = test.shipNet + test.customs;
    const option = group?.deliveryOptions.find(
        o => Math.round(Number.parseFloat(o.estimatedCost.amount) * 100) === wanted);

    if (option && group.selectedDeliveryOption?.handle !== option.handle) {
        await sf(`mutation($cartId:ID!,$selected:[CartSelectedDeliveryOptionInput!]!,$country:CountryCode,$language:LanguageCode)
            @inContext(country:$country,language:$language){
            cartSelectedDeliveryOptionsUpdate(cartId:$cartId, selectedDeliveryOptions:$selected){ cart { id } userErrors { message } } }`,
            { cartId, selected: [{ deliveryGroupId: group.id, deliveryOptionHandle: option.handle }], ...ctx });
        /* Prepare again so the tax is recalculated against the rate just selected. */
        await sf(PREPARE, { cartId, ...ctx });
        read = await sf(READ, { id: cartId, ...ctx });
    }

    const g = read.cart.deliveryGroups.nodes[0];
    const cents = v => (v == null ? null : Math.round(Number.parseFloat(v) * 100));

    return {
        id: test.id,
        address: address.ref,
        country: test.country,
        offered: (g?.deliveryOptions ?? []).map(o => ({ title: o.title, cents: cents(o.estimatedCost.amount) })),
        shipping: cents(g?.selectedDeliveryOption?.estimatedCost.amount),
        shippingLabel: g?.selectedDeliveryOption?.title ?? null,
        subtotal: cents(read.cart.cost.subtotalAmount.amount),
        tax: cents(read.cart.cost.totalTaxAmount?.amount),
        total: cents(read.cart.cost.totalAmount.amount),
        specTotal: test.total,
    };
}

async function main() {
    console.log(`Asking Shopify (${DOMAIN}) for its own figures.\n`);
    await loadVariants();

    const rows = [];
    for (const test of TEST_CASES) {
        const row = await figuresFor(test);
        rows.push(row);
        const agrees = row.total === row.specTotal ? 'matches spec' : `SPEC SAYS ${money(row.specTotal)}`;
        console.log(
            `${row.id.padEnd(4)} ${row.address} ${row.country}  ` +
            `sub ${money(row.subtotal).padStart(9)}  ` +
            `ship ${(row.shipping === null ? '—' : money(row.shipping)).padStart(7)}  ` +
            `tax ${(row.tax === null ? '0.00' : money(row.tax)).padStart(8)}  ` +
            `total ${money(row.total).padStart(9)}   ${agrees}`);
        if (row.offered.length > 1) {
            console.log(`      offered: ${row.offered.map(o => `${o.title} ${money(o.cents)}`).join('  |  ')}`);
        }
        /* Gentle on the Storefront API — ten carts is a burst by its standards. */
        await pause(1500);
    }

    console.log('\nJSON:');
    console.log(JSON.stringify(rows, null, 1));
}

main().catch(err => {
    console.error('\nFailed:', err.message);
    process.exit(1);
});
