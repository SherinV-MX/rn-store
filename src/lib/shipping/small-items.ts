import 'server-only';
import { storefront } from '@/lib/shopify/client';

/* Which variants carry section 2's small item flag.

   The carrier service callback tells us the variants in the cart but not their metafields, so
   the flag has to be fetched. Shopify waits only a few seconds for a rate response, so the
   answers are cached: staff change this flag rarely, and a stale "no" only costs the buyer the
   flat rate option on one checkout. */

const TTL_MS = 5 * 60 * 1000;

const cache = new Map<number, { small: boolean; at: number }>();

interface VariantNodes {
    nodes: ({
        id: string;
        product: { smallItem: { value: string } | null };
    } | null)[];
}

const QUERY = `
    query SmallItemFlags($ids: [ID!]!) {
        nodes(ids: $ids) {
            ... on ProductVariant {
                id
                product {
                    smallItem: metafield(namespace: "custom", key: "small_item") { value }
                }
            }
        }
    }
`;

export async function smallItemFlags(variantIds: number[]): Promise<Map<number, boolean>> {
    const wanted = [...new Set(variantIds)];
    const now = Date.now();
    const out = new Map<number, boolean>();

    const missing: number[] = [];
    for (const id of wanted) {
        const hit = cache.get(id);
        if (hit && now - hit.at < TTL_MS) out.set(id, hit.small);
        else missing.push(id);
    }
    if (missing.length === 0) return out;

    try {
        const data = await storefront<VariantNodes>(
            QUERY,
            { ids: missing.map((id) => `gid://shopify/ProductVariant/${id}`) },
            { revalidate: 300 },
        );
        for (const node of data.nodes) {
            if (!node) continue;
            const id = Number(node.id.split('/').pop());
            /* Section 2: the flag defaults to no, so anything but an explicit "true" means
               the product does not qualify. */
            const small = node.product.smallItem?.value === 'true';
            cache.set(id, { small, at: now });
            out.set(id, small);
        }
    } catch {
        /* A lookup failure must not cost the buyer their delivery options. Treating every
           unknown variant as not qualifying just withholds the flat rate, which is the safe
           direction: section 7 is an extra option, never the only one. */
        for (const id of missing) out.set(id, false);
    }

    for (const id of missing) if (!out.has(id)) out.set(id, false);
    return out;
}
