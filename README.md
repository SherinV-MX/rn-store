# BSS Shop

A product landing page with a real cart, checking out through Shopify.

Built off the BSS LogisQ website: same design tokens, same fonts, same `[locale]` routing and
`proxy.ts` redirect, so the two sites stay in the family without sharing a deploy.

## How the buying works

The visitor never leaves this site until they pay.

1. The page loads the product from Shopify's **Storefront API** (server side).
2. Choosing a variant and pressing **Add to cart** posts to `/api/shop/cart`, which talks to
   Shopify and returns the whole cart.
3. The drawer shows that cart. Quantity changes and removals go the same way.
4. **Go to checkout** follows `cart.checkoutUrl` — Shopify's hosted checkout, where payment
   happens.

Step 4 is a hard boundary: the payment page belongs to Shopify unless the store is on Shopify
Plus. Pointing the store's primary domain at something like `shop.bss-logisq.com` makes the URL
read as ours, but the page is theirs. Everything before that moment is ours entirely.

## Why the token stays on the server

Shopify's Storefront token is meant to be public, but the browser still never sees it. The page
talks to our own `/api/shop/cart`, and that route talks to Shopify. Three things follow:

- the token is not in the page source,
- the cart id lives in an **httpOnly** cookie instead of `localStorage`, so no script on the page
  can read it,
- our own endpoint is ours to rate-limit.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Fill in `.env`:

| Variable | Where it comes from |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | The `*.myshopify.com` domain, not the custom one |
| `SHOPIFY_STOREFRONT_TOKEN` | Shopify admin → Settings → Apps → Develop apps → your app → API credentials → Storefront API access token |
| `SHOPIFY_DEFAULT_COUNTRY` | Optional. Which market's prices and currency to show. Defaults to `DE` |
| `SHOPIFY_API_VERSION` | Optional. Defaults to `2026-01` |
| `NEXT_PUBLIC_PRODUCT_HANDLE` | The product's handle in Shopify |

Without those the site still runs: the hero keeps its shape and the buy box becomes a contact
link. A missing token must never produce a broken page.

## Layout

```
src/
  lib/shopify/        client, queries, types — the only code that talks to Shopify
  app/api/shop/cart/  the browser's one door to the cart
  components/shop/    CartProvider, BuyBox, CartDrawer
  components/product/ ProductHero
  dictionaries/       en.json, de.json
  styles/             design tokens, carried over from the BSS site
```

## Still open

- The store itself: domain, token, and the product set up in Shopify.
- Sections below the hero (specifications, in-use photography, support) — the hero carries the
  sale, the rest is detail.
- German checkout obligations (Widerrufsbelehrung, VAT display, shipping zones) are configured in
  Shopify, not here.
