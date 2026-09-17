import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries/get-dictionary';
import CheckoutFlow from '@/components/checkout/CheckoutFlow';

export const metadata: Metadata = {
    title: 'Checkout — BSS LogisQ',
    /* Nothing here should ever appear in a search result. */
    robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <div className="shell">
            <CheckoutFlow locale={locale} dict={dict.checkout} />
        </div>
    );
}
