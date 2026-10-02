import type { Metadata } from 'next';
import { rnFaq, rnSupport } from '@/content/rn';
import RnFaqTabs from '@/components/rn/RnFaqTabs';
import RnSupportCarousel from '@/components/rn/RnSupportCarousel';
import s from '@/components/rn/RnSupportPage.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = rnFaq(locale);
    return {
        title: `${t.head} | Race Navigator`,
        description: t.intro.slice(0, 160),
    };
}

export default async function RnFaqPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = rnFaq(locale);
    const nav = rnSupport(locale);

    return (
        <>
            <section
                className={s.banner}
                style={{ backgroundImage: "url('/rn/support/hero-faq.jpg')" }}
                aria-hidden="true"
            />

            {/* The support nav sits between the hero and the page, as it does on live. */}
            <section className={s.navBand}>
                <RnSupportCarousel
                    tiles={nav.tiles}
                    prev={nav.prev}
                    next={nav.next}
                    label={nav.head}
                    /* FAQ is the first of the six. */
                    active={0}
                />
            </section>

            <section className={s.intro}>
                <div className={`rnRail ${s.introRail}`}>
                    <h1 className="rnH2">{t.head}</h1>
                    <p className={s.introBody}>{t.intro}</p>
                </div>
            </section>

            <section className={s.body}>
                <div className={`rnRail ${s.bodyRail}`}>
                    <RnFaqTabs tabs={t.tabs} label={t.head} />
                </div>
            </section>
        </>
    );
}
