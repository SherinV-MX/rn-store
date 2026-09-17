import type { Money } from './types';

/* Shared by server and client, so no 'server-only' here.

   Prices are formatted in the reader's language but with Shopify's currency, never with a
   hard-coded "€" — the shop decides the currency, the page only renders it. */
export function formatMoney(money: Money, locale: string): string {
    const tag = locale === 'de' ? 'de-DE' : 'en-IE';
    const amount = Number.parseFloat(money.amount);
    if (!Number.isFinite(amount)) return '';
    return new Intl.NumberFormat(tag, {
        style: 'currency',
        currency: money.currencyCode,
        /* Whole prices read better without the trailing zeros on a product page; anything
           with cents keeps them. */
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
