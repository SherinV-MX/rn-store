import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries/get-dictionary';
import CheckoutFlow from '@/components/checkout/CheckoutFlow';
import { loadRateCard } from '@/lib/shipping/rate-card';
import type { RateCard } from '@/lib/shipping/rates';

export const metadata: Metadata = {
    title: 'Checkout — BSS LogisQ',
    /* Nothing here should ever appear in a search result. */
    robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    /* Read once on the server and handed down, so the page and the carrier endpoint quote
       from the same rate card and the buyer cannot be shown a price Shopify will not honour.
       A store with no rate card still renders: the flow then reports that nothing can be
       shipped rather than falling back to figures of its own. */
    let card: RateCard | null = null;
    try {
        card = await loadRateCard();
    } catch (err) {
        console.error('Rate card unavailable:', err);
    }

    return (
        <div className="shell">
            <CheckoutFlow locale={locale} dict={dict.checkout} rateCard={card} />
        </div>
    );
}
