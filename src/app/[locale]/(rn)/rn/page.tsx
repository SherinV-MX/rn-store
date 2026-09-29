import type { Metadata } from 'next';
import RnHero from '@/components/rn/RnHero';
import RnProducts from '@/components/rn/RnProducts';
import { RnPartners, RnNightVision, RnTracks, RnNews } from '@/components/rn/RnSections';
import RnCaseShowcase from '@/components/rn/RnCaseShowcase';
import RnVideo from '@/components/rn/RnVideo';

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
            <RnCaseShowcase locale={locale} />
            <RnVideo locale={locale} />
            <RnNightVision locale={locale} />
            <RnTracks locale={locale} />
            <RnNews locale={locale} />
        </>
    );
}
