import 'server-only';

/* The one place that talks to Shopify.

   The Storefront token is a public token by Shopify's design, but it still stays on the
   server: the browser talks to our own /api/shop routes, those talk to Shopify. That keeps
   the token out of the page source, lets us rate-limit our own endpoints, and means the
   cart id can live in an httpOnly cookie instead of localStorage. */

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2026-01';

export class ShopifyError extends Error {
    constructor(message: string, readonly detail?: unknown) {
        super(message);
        this.name = 'ShopifyError';
    }
}

function endpoint(): { url: string; token: string } {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
    if (!domain || !token) {
        throw new ShopifyError('SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN must be set');
    }
    /* Accept the domain with or without a scheme, so whoever fills in the env var cannot
       get it subtly wrong. */
    const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return { url: `https://${host}/api/${API_VERSION}/graphql.json`, token };
}

interface FetchOptions {
    /* Product data is cached; anything touching a cart must not be. */
    revalidate?: number | false;
}

export async function storefront<T>(
    query: string,
    variables: Record<string, unknown> = {},
    options: FetchOptions = {},
): Promise<T> {
    const { url, token } = endpoint();
    const { revalidate = false } = options;

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': token,
            },
            body: JSON.stringify({ query, variables }),
            ...(revalidate === false ? { cache: 'no-store' as const } : { next: { revalidate } }),
        });
    } catch (err) {
        /* Network-level failure — Shopify unreachable, DNS, timeout. Callers turn this into
           "the shop is temporarily unavailable", never into a broken page. */
        throw new ShopifyError('Storefront API unreachable', err);
    }

    if (!res.ok) {
        throw new ShopifyError(`Storefront API returned ${res.status}`, await res.text().catch(() => ''));
    }

    const body = (await res.json()) as { data?: T; errors?: unknown };

    /* GraphQL reports failures with a 200 and an `errors` array, so the status alone is not
       enough to call it a success.

       Errors and data arrive together when only some fields failed — typically one field the
       token has no scope for, such as quantityAvailable without
       `unauthenticated_read_product_inventory`. Throwing there would blank a product page over a
       stock number, so partial data is used and the reason is logged. Only a response with no
       data at all is fatal. */
    if (!body.data) throw new ShopifyError('Storefront API error', body.errors ?? 'no data');
    if (body.errors) console.warn('Storefront API partial errors:', JSON.stringify(body.errors));

    return body.data;
}

/* True when the shop is configured at all. Lets a page render its "order" section as a
   contact link instead of a broken button while the store is still being set up. */
export function shopIsConfigured(): boolean {
    return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN);
}
