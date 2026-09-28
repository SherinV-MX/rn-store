import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries/get-dictionary';
import { getProducts, shopIsConfigured } from '@/lib/shopify';
import type { ProductCard } from '@/lib/shopify/types';
import ProductGrid from '@/components/product/ProductGrid';

export const metadata: Metadata = {
    title: 'Products — BSS LogisQ',
};

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    let products: ProductCard[] = [];
    if (shopIsConfigured()) {
        try {
            products = await getProducts(locale);
        } catch (err) {
            /* An empty grid with its message beats a 500 on the page people browse. */
            console.error('Product list failed:', err);
        }
    }

    return (
        <div className="shell">
            <header style={{ paddingBlock: 'var(--space-10) var(--space-6)' }}>
                <h1 style={{ fontSize: 'var(--text-5xl)', textTransform: 'uppercase' }}>
                    {dict.catalogue.title}
                </h1>
                <p style={{ color: 'var(--color-text-dim)', maxWidth: '55ch' }}>
                    {dict.catalogue.intro}
                </p>
            </header>

            <div style={{ paddingBottom: 'var(--space-16)' }}>
                <ProductGrid products={products} locale={locale} dict={dict.catalogue} />
            </div>
        </div>
    );
}
