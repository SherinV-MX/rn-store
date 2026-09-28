import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/dictionaries/get-dictionary';
import { getProduct, shopIsConfigured } from '@/lib/shopify';
import ProductDetail from '@/components/product/ProductDetail';

interface Params {
    params: Promise<{ locale: string; handle: string }>;
}

/* Title and description come from the product itself, so a new product arrives with its own
   metadata rather than inheriting the site's. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale, handle } = await params;
    if (!shopIsConfigured()) return {};
    try {
        const product = await getProduct(handle, locale);
        if (!product) return {};
        return {
            title: `${product.title} — BSS LogisQ`,
            description: product.description?.slice(0, 160),
            openGraph: product.featuredImage ? { images: [product.featuredImage.url] } : undefined,
        };
    } catch {
        return {};
    }
}

export default async function ProductPage({ params }: Params) {
    const { locale, handle } = await params;
    const dict = await getDictionary(locale);

    if (!shopIsConfigured()) notFound();

    const product = await getProduct(handle, locale);
    /* A handle that does not exist is a 404, not an empty page — it is usually a stale link or
       a product that was unpublished. */
    if (!product) notFound();

    return (
        <div className="shell">
            <ProductDetail
                product={product}
                locale={locale}
                dict={dict.detail}
                shopDict={dict.shop}
            />
        </div>
    );
}
