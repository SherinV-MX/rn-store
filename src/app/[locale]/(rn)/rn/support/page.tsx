import type { Metadata } from 'next';
import { rnSupport } from '@/content/rn';
import RnSupportCarousel from '@/components/rn/RnSupportCarousel';
import s from '@/components/rn/RnSupport.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = rnSupport(locale);
    return {
        title: `${t.head} | Race Navigator`,
        description: t.intro.slice(0, 160),
    };
}

/* RN Support, as live builds it: a photograph with nothing written on it, the heading and one
   paragraph on the reading rail, and six tiles in a carousel four across. There is nothing
   after the carousel but air — live leaves 150px of it before the footer. */
export default async function RnSupportPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = rnSupport(locale);

    return (
        <>
            {/* Decorative. The banner says nothing on live, so there is nothing here to read
                out either; the heading below carries the page. */}
            <section className={s.banner} aria-hidden="true" />

            <section className={s.intro}>
                <div className={`rnRail ${s.introRail}`}>
                    <h1 className="rnH2">{t.head}</h1>
                    <p className={s.introBody}>{t.intro}</p>
                </div>
            </section>

            <section className={s.band}>
                <RnSupportCarousel
                    tiles={t.tiles}
                    prev={t.prev}
                    next={t.next}
                    label={t.head}
                />
            </section>
        </>
    );
}
