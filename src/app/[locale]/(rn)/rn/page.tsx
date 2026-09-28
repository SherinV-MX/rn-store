import type { Metadata } from 'next';
import RnHero from '@/components/rn/RnHero';
import RnProducts from '@/components/rn/RnProducts';
import { RnPartners, RnStats, RnQuote } from '@/components/rn/RnSections';
import RnCaseShowcase from '@/components/rn/RnCaseShowcase';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: 'Race Navigator — The way of driving faster',
        description: locale === 'de'
            ? 'Video- und Datenanalyse für Trackday und Motorsport. RN ONE, RN PRO und RN LITE.'
            : 'Video and data analysis for trackday and motorsport. RN ONE, RN PRO and RN LITE.',
    };
}

export default async function RnHomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    return (
        <>
            <RnHero locale={locale} />
            <RnProducts locale={locale} />
            <RnPartners />
            <RnStats locale={locale} />
            <RnQuote locale={locale} />
            <RnCaseShowcase locale={locale} />
        </>
    );
}
