/* The Shipping and VAT spec, as data.

   Everything here is transcribed from "Shipping and VAT Rules: Spec for Shopify PoC",
   sections 2.1, 4, 5 and 10. Money is held in integer cents and weight in integer grams,
   because section 9 demands that a 3.3 kg cart land in the 3.3 bracket every time and
   floating point cannot promise that. */

export const VAT_RATE = 19;

/* Section 2.1. Prices are net: the store is configured tax-exclusive, so Shopify adds the
   19% at checkout rather than us storing a gross figure and stripping it back out. */
export const ARTICLES = [
    { sku: 'TA-01', name: 'Camera unit',      grams: 4200, smallItem: false, netCents: 100000 },
    { sku: 'TA-02', name: 'Lens module',      grams: 1100, smallItem: false, netCents:  45000 },
    { sku: 'TA-03', name: 'Mounting bracket', grams:  800, smallItem: false, netCents:  12000 },
    { sku: 'TA-04', name: 'Power supply',     grams:  600, smallItem: false, netCents:   8000 },
    { sku: 'TA-05', name: 'USB cable',        grams:  100, smallItem: true,  netCents:   1500 },
    { sku: 'TA-06', name: 'Memory card',      grams:   20, smallItem: true,  netCents:   4000 },
    { sku: 'TA-07', name: 'Lens cap',         grams:   50, smallItem: true,  netCents:    900 },
    { sku: 'TA-08', name: 'Transport case',   grams: 5400, smallItem: false, netCents:  30000 },
];

/* Section 4. The spec calls these "example countries"; for the PoC they are the whole list.
   Zone 1 is EU only and Zone 2 non-EU only, which is what lets VAT and the customs fee both
   be derived from the zone alone. The four test addresses in 10.1 need DE, FR, NL and ME. */
export const ZONES = [
    { key: 'domestic', name: 'Germany',          rateLabel: 'DHL Express',      countries: ['DE'],             eu: true  },
    { key: 'ww1',      name: 'Worldwide Zone 1', rateLabel: 'Worldwide Zone 1', countries: ['BE', 'NL', 'FR'], eu: true  },
    { key: 'ww2',      name: 'Worldwide Zone 2', rateLabel: 'Worldwide Zone 2', countries: ['ME', 'AL', 'GE'], eu: false },
];

/* Section 8. A flat 40.00 on every non-EU order, folded into the Zone 2 rates rather than
   charged as its own line — which section 8 explicitly permits. This only holds because
   Zone 2 contains nothing but non-EU countries. The moment a real zone mixes EU and non-EU
   destinations this has to move to a Carrier Service endpoint. */
export const CUSTOMS_FEE_CENTS = 4000;

/* Section 5.1. Four brackets, thresholds deliberately not round. */
const DOMESTIC_NET = [
    { fromGrams:    1, netCents: 2100 },
    { fromGrams: 3300, netCents: 2200 },
    { fromGrams: 5300, netCents: 2700 },
    { fromGrams: 9900, netCents: 3300 },
];

/* Section 5.2. 31 brackets in 0.5 kg steps, the first being "> 0, under 0.5". Listed as flat
   arrays so they can be read straight down against the spec table. */
const WW1_NET = [51, 59, 61, 62, 64, 66, 68, 70, 72, 74, 76, 79, 81, 84, 86, 89, 91, 94, 96, 99,
                 101, 104, 107, 109, 112, 115, 118, 121, 123, 126, 129];
const WW2_NET = [65, 87, 89, 91, 94, 97, 100, 103, 106, 109, 112, 115, 119, 123, 126, 130, 134,
                 137, 141, 144, 148, 153, 158, 163, 168, 173, 177, 182, 187, 192, 197];

/* The spec gross column, used only to prove the net figures above were typed correctly. */
const WW1_GROSS = [60.69, 70.21, 72.59, 73.78, 76.16, 78.54, 80.92, 83.30, 85.68, 88.06, 90.44,
                   94.01, 96.39, 99.96, 102.34, 105.91, 108.29, 111.86, 114.24, 117.81, 120.19,
                   123.76, 127.33, 129.71, 133.28, 136.85, 140.42, 143.99, 146.37, 149.94, 153.51];
const WW2_GROSS = [77.35, 103.53, 105.91, 108.29, 111.86, 115.43, 119.00, 122.57, 126.14, 129.71,
                   133.28, 136.85, 141.61, 146.37, 149.94, 154.70, 159.46, 163.03, 167.79, 171.36,
                   176.12, 182.07, 188.02, 193.97, 199.92, 205.87, 210.63, 216.58, 222.53, 228.48, 234.43];

/* Section 9: money rounds to two decimals, half up. */
function halfUp(cents) {
    return Math.floor(cents + 0.5);
}

export function grossCents(netCents) {
    return halfUp(netCents * (100 + VAT_RATE) / 100);
}

/* Turns a list of net prices in 0.5 kg steps into bracket rows. The upper bound of each row
   is one gram below the next row lower bound, so exactly 3.300 kg belongs to the higher
   bracket (section 9) and no cart weight can fall between two rows. The last row has no
   upper bound at all — section 5, "a 40 kg cart pays the top bracket". */
function halfKiloBrackets(netList, surchargeCents = 0) {
    return netList.map((net, i) => ({
        fromGrams: i === 0 ? 1 : i * 500,
        toGrams: i === netList.length - 1 ? null : (i + 1) * 500 - 1,
        netCents: net * 100 + surchargeCents,
    }));
}

export const RATE_TABLES = {
    domestic: DOMESTIC_NET.map((row, i) => ({
        ...row,
        toGrams: i === DOMESTIC_NET.length - 1 ? null : DOMESTIC_NET[i + 1].fromGrams - 1,
    })),
    ww1: halfKiloBrackets(WW1_NET),
    /* Zone 2 carries the customs fee inside every bracket. */
    ww2: halfKiloBrackets(WW2_NET, CUSTOMS_FEE_CENTS),
};

/* Proves the transcription before anything is written to Shopify: every net figure above,
   grossed up at 19%, must equal the spec own gross column to the cent. */
export function checkTranscription() {
    const problems = [];
    const compare = (label, netList, grossList) => {
        if (netList.length !== 31) problems.push(`${label}: ${netList.length} brackets, expected 31`);
        netList.forEach((net, i) => {
            const got = grossCents(net * 100);
            const want = halfUp(grossList[i] * 100);
            if (got !== want) {
                problems.push(`${label} bracket ${i}: net ${net} grosses to ${(got / 100).toFixed(2)}, spec says ${grossList[i].toFixed(2)}`);
            }
        });
    };
    compare('Zone 1', WW1_NET, WW1_GROSS);
    compare('Zone 2', WW2_NET, WW2_GROSS);
    [[2100, 24.99], [2200, 26.18], [2700, 32.13], [3300, 39.27]].forEach(([net, gross]) => {
        if (grossCents(net) !== halfUp(gross * 100)) {
            problems.push(`Domestic net ${net / 100} grosses to ${(grossCents(net) / 100).toFixed(2)}, spec says ${gross.toFixed(2)}`);
        }
    });
    return problems;
}

/* Section 10.2. Every expected figure comes from the spec, not from our own arithmetic, so
   the verify stage checks the implementation rather than agreeing with itself. */
export const TEST_CASES = [
    { id: 'T1',  cart: { 'TA-01': 1 },                             zone: 'domestic', country: 'DE', vat: true,  grams:  4200, goodsNet: 100000, shipNet:  2200, customs:    0, vatCents: 19418, total: 121618 },
    { id: 'T2',  cart: { 'TA-03': 1, 'TA-04': 1 },                 zone: 'domestic', country: 'DE', vat: true,  grams:  1400, goodsNet:  20000, shipNet:  2100, customs:    0, vatCents:  4199, total:  26299 },
    { id: 'T3',  cart: { 'TA-01': 2, 'TA-08': 1 },                 zone: 'domestic', country: 'DE', vat: true,  grams: 13800, goodsNet: 230000, shipNet:  3300, customs:    0, vatCents: 44327, total: 277627 },
    { id: 'T4',  cart: { 'TA-05': 2, 'TA-06': 1, 'TA-07': 1 },     zone: 'domestic', country: 'DE', vat: true,  grams:   270, goodsNet:   7900, shipNet:  1000, customs:    0, vatCents:  1691, total:  10591, needsFlatRate: true },
    { id: 'T5',  cart: { 'TA-05': 1, 'TA-03': 1 },                 zone: 'domestic', country: 'DE', vat: true,  grams:   900, goodsNet:  13500, shipNet:  2100, customs:    0, vatCents:  2964, total:  18564 },
    { id: 'T6',  cart: { 'TA-02': 1, 'TA-03': 1 },                 zone: 'ww1',      country: 'FR', vat: true,  grams:  1900, goodsNet:  57000, shipNet:  6200, customs:    0, vatCents: 12008, total:  75208 },
    { id: 'T7',  cart: { 'TA-02': 1, 'TA-03': 1 },                 zone: 'ww1',      country: 'NL', vat: false, grams:  1900, goodsNet:  57000, shipNet:  6200, customs:    0, vatCents:     0, total:  63200, needsVatId: true },
    { id: 'T8',  cart: { 'TA-01': 1, 'TA-08': 1 },                 zone: 'ww2',      country: 'ME', vat: false, grams:  9600, goodsNet: 130000, shipNet: 14400, customs: 4000, vatCents:     0, total: 148400 },
    { id: 'T9',  cart: Object.fromEntries(ARTICLES.map(a => [a.sku, 1])), zone: 'ww2', country: 'ME', vat: false, grams: 12270, goodsNet: 201400, shipNet: 16800, customs: 4000, vatCents: 0, total: 222200 },
    { id: 'T10', cart: { 'TA-05': 2, 'TA-06': 1, 'TA-07': 1 },     zone: 'ww1',      country: 'FR', vat: true,  grams:   270, goodsNet:   7900, shipNet:  5100, customs:    0, vatCents:  2470, total:  15470 },
];

/* Picks the bracket a cart weight falls into: the highest row whose threshold the weight
   reaches. Mirrors what Shopify weight conditions will do, so verify can prove the rate
   table we uploaded produces the spec numbers. */
export function rateFor(zoneKey, grams) {
    const rows = RATE_TABLES[zoneKey];
    if (!rows || grams <= 0) return null;
    return rows.find(r => grams >= r.fromGrams && (r.toGrams === null || grams <= r.toGrams)) ?? null;
}

export const bySku = Object.fromEntries(ARTICLES.map(a => [a.sku, a]));
