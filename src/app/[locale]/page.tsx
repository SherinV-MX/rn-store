import { getDictionary } from '@/dictionaries/get-dictionary';
import { getProduct, shopIsConfigured } from '@/lib/shopify';
import type { Product } from '@/lib/shopify/types';
import ProductHero from '@/components/product/ProductHero';

/* Which product this store fronts. One handle for now — when there is a second product this
   becomes a [handle] route and the landing page becomes a list. */
const HANDLE = process.env.NEXT_PUBLIC_PRODUCT_HANDLE ?? '';

export default async function StorePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    let product: Product | null = null;
    if (shopIsConfigured() && HANDLE) {
        try {
            product = await getProduct(HANDLE, locale);
        } catch (err) {
            /* Shopify being down is not a reason for this page to be down. The hero falls back
               to its contact link and the visitor still sees the product. */
            console.error('Product load failed:', err);
        }
    }

    return (
        <ProductHero
            locale={locale}
            dict={dict.hero}
            shopDict={dict.shop}
            product={product}
        />
    );
}
