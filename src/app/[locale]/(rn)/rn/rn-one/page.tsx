import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { OPTIONAL, rnOne } from '@/content/rn';
import RnGallery from '@/components/rn/RnGallery';
import RnOrderButton from '@/components/rn/RnOrderButton';
import RnSpecTabs from '@/components/rn/RnSpecTabs';
import RnNewsletterBar from '@/components/rn/RnNewsletterBar';
import { getProduct } from '@/lib/shopify';
import s from '@/components/rn/RnProduct.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = rnOne(locale);
    return {
        title: `${t.name} — ${t.tagline} | Race Navigator`,
        description: t.intro.slice(0, 160),
    };
}

/* The RN ONE listing in the shop. Its variant is what "Order now" puts in the cart, so it is
   fetched here rather than in the button: the page is server-rendered anyway, and the click
   then costs one request instead of two. A shop that is unreachable or missing the product
   leaves `variantId` null and the buttons fall back to linking at the catalogue. */
const RN_ONE_HANDLE = 'rn-one-race-navigator';

/* RN's own support pages, which are not part of this rebuild — so the button leaves for them,
   to the same two addresses the live buttons use. */
const SUPPORT_URL: Record<string, string> = {
    en: 'https://race-navigator.com/en/rn-support-en/',
    de: 'https://race-navigator.com/rn-support/',
};

async function rnOneVariantId(locale: string): Promise<string | null> {
    try {
        const product = await getProduct(RN_ONE_HANDLE, locale);
        const variant = product?.variants.find((v) => v.availableForSale) ?? product?.variants[0];
        return variant?.id ?? null;
    } catch {
        /* The rebuild is a shop-window first: it must render with or without Shopify. */
        return null;
    }
}

export default async function RnOnePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = rnOne(locale);
    const variantId = await rnOneVariantId(locale);
    const ordering = locale === 'de' ? 'Wird hinzugefügt…' : 'Adding…';

    return (
        <>
            {/* Nothing written on it. The live product page opens on the photograph alone —
                768px of it, edge to edge — and puts the name underneath on the paper. Putting
                the title on the picture, as the home page hero does, made this read like a
                second hero rather than the head of a product page. */}
            <section className={s.banner}>
                <Image
                    className={s.bannerShot}
                    src="/rn/hero/rn-one-banner.jpg"
                    alt=""
                    fill
                    sizes="100vw"
                    priority
                    quality={82}
                />
            </section>

            <section className={`rnLight ${s.title}`}>
                <div className="rnRail">
                    <nav className={s.crumbs} aria-label="Breadcrumb">
                        <Link href={`/${locale}/rn`}>Race Navigator</Link>
                        <span aria-hidden="true">/</span>
                        <Link href={`/${locale}/rn#systems`}>{t.eyebrow}</Link>
                        <span aria-hidden="true">/</span>
                        <span>{t.name}</span>
                    </nav>

                    <h1 className={`rnH2 ${s.name}`}>{t.name}</h1>
                    <p className={s.tagline}>{t.tagline}</p>
                </div>
            </section>

            {/* The showcase, as the live product page builds it: the brush-stroke backdrop, the
                product on the left, and what it does on the right as three ticked lines rather
                than a paragraph. The intro moves down to the feature section, where prose
                belongs. */}
            <section className={s.hero}>
                <div className={s.heroRail}>
                    <RnGallery
                        shots={t.gallery}
                        label={locale === 'de' ? 'Produktansichten' : 'Product views'}
                    >
                        <ul className={s.highlights}>
                            {t.highlights.map((line) => (
                                <li key={line}>
                                    <span className={s.tick} aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8.4l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.4"
                                                  strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    {line}
                                </li>
                            ))}
                        </ul>

                        <div className={s.heroActions}>
                            {variantId
                                ? <RnOrderButton variantId={variantId} label={t.buy} busyLabel={ordering}
                                                 className={`rnBtn ${s.orderBtn}`} />
                                : <Link href={`/${locale}/products`} className={`rnBtn ${s.orderBtn}`}>{t.buy}</Link>}
                        </div>
                    </RnGallery>
                </div>

            </section>

            {/* What the product is, in RN's own words: the heading, one paragraph, then the
                function list in two columns with a red square against each line. */}
            <section className={`rnLight ${s.system}`}>
                <div className={`rnRail ${s.systemRail}`}>
                    <h2 className="rnH2">{t.systemHead}</h2>
                    <p className={s.systemBody}>{t.systemBody}</p>

                    <h3 className={s.functionsHead}>{t.functionsHead}</h3>
                    <ul className={s.functions}>
                        {t.functions.map((line) => <li key={line}>{line}</li>)}
                    </ul>

                    <p className={s.shopNow}>
                        {variantId
                            ? <RnOrderButton variantId={variantId} label={t.shopNow} busyLabel={ordering}
                                             className="rnBtn rnBtnSolid" />
                            : <Link href={`/${locale}/products`} className="rnBtn rnBtnSolid">{t.shopNow}</Link>}
                    </p>
                </div>
            </section>

            {/* The specification, as four tabs, then RN's own support button under them. */}
            <section className={`rnLight ${s.specBand}`}>
                <div className={`rnRail ${s.specRail}`}>
                    <RnSpecTabs
                        tabs={t.specTabs}
                        label={locale === 'de' ? 'Technische Angaben' : 'Specification'}
                    />

                    <p className={s.specActions}>
                        <a href={SUPPORT_URL[locale] ?? SUPPORT_URL.en} className={`rnBtn ${s.supportBtn}`}>
                            {t.support}
                        </a>
                    </p>
                </div>
            </section>

            {/* Four photographs on the brush-stroke ground: two stacked at the left, one tall
                beside them, and one across the full width beneath. */}
            <section className={s.mood} aria-label={locale === 'de' ? 'Impressionen' : 'In use'}>
                <div className={s.moodGrid}>
                    {t.mood.map((shot, i) => (
                        <div className={`${s.moodShot} ${s['moodShot' + (i + 1)]}`} key={shot.src}>
                            <Image
                                src={shot.src}
                                alt={shot.alt}
                                fill
                                /* The last one runs the full width of the rail; the other
                                   three are half of it. Both are asked for a size larger than
                                   the frame, because the hover zooms the picture past its own
                                   edges and a file cut to the frame would go soft there. */
                                sizes={i === 3
                                    ? '(max-width: 860px) 100vw, 1280px'
                                    : '(max-width: 860px) 100vw, 640px'}
                                quality={82}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* The model comparison: RN's own table, borderless on the brush ground, with a
                red header bar, the three units photographed underneath it, and a tick or a
                cross in every cell. Their table is 1120 wide with the label column at 306 and
                the three model columns at 271 each. */}
            <section className={s.compare}>
                <div className={`rnRail ${s.compareRail}`}>
                    <h2 className="rnH2">{t.compareHead}</h2>

                    {/* The wash belongs to the panel, not to the table, so the legend under it
                        gets the same readable ground. Outside it the legend sat on the bare
                        brush and could not be read at all. */}
                    <div className={s.comparePanel}>
                    <div className={s.compareScroll}>
                        <table className={s.compareTable}>
                            <caption className={s.compareCaption}>{t.compareHead}</caption>
                            <thead>
                                <tr>
                                    <th scope="col">{t.compareLabel}</th>
                                    {t.compareModels.map((mdl) => (
                                        <th scope="col" key={mdl.name}>{mdl.name}</th>
                                    ))}
                                </tr>
                                <tr className={s.compareShots}>
                                    <td>
                                        <Image src={t.compareLogo} alt="" width={140} height={140} />
                                    </td>
                                    {t.compareModels.map((mdl) => (
                                        <td key={mdl.name}>
                                            <Image src={mdl.image} alt="" width={140} height={140} />
                                        </td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {t.compareRows.map((row) => (
                                    <tr key={row.label}>
                                        <th scope="row">{row.label}</th>
                                        {row.values.map((value, i) => (
                                            <td key={t.compareModels[i].name}>
                                                {value === OPTIONAL
                                                    ? <CompareMark yes optional locale={locale} />
                                                    : typeof value === 'string'
                                                        ? value
                                                        : <CompareMark yes={value} locale={locale} />}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* One line to decode the mark. It carries the mark itself rather than
                        describing it in words, so the reader matches a shape to a shape. */}
                    <p className={s.compareLegend}>
                        <span className={`${s.compareMark} ${s.compareOpt}`} aria-hidden="true">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M2.8 8.5l3.4 3.4L13.2 4.9" stroke="currentColor" strokeWidth="2.8"
                                      strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        {t.compareNote}
                    </p>
                    </div>

                    <p className={`${s.specActions} ${s.compareActions}`}>
                        <a href={SUPPORT_URL[locale] ?? SUPPORT_URL.en} className={`rnBtn ${s.supportBtn}`}>
                            {t.support}
                        </a>
                    </p>
                </div>
            </section>

            {/* Live closes this page on the newsletter band, above the footer. */}
            <RnNewsletterBar locale={locale} />
        </>
    );
}

/* A tick or a cross in a comparison cell. The mark itself is decoration — what it means is
   carried by the text beside it, which is the only part a screen reader reads out. */
function CompareMark({ yes, optional = false, locale }: {
    yes: boolean;
    optional?: boolean;
    locale: string;
}) {
    const de = locale === 'de';
    const label = optional
        ? (de ? 'Ja, optional' : 'Yes, optional')
        : yes
            ? (de ? 'Ja' : 'Yes')
            : (de ? 'Nein' : 'No');
    const note = de ? 'Optional' : 'Optional';

    const shape = optional ? `${s.compareMark} ${s.compareOpt}`
        : yes ? `${s.compareMark} ${s.compareYes}`
            : `${s.compareMark} ${s.compareNo}`;

    return (
        <span className={shape} title={optional ? note : undefined}>
            <svg width={optional ? 12 : 20} height={optional ? 12 : 20} viewBox="0 0 16 16"
                 fill="none" aria-hidden="true">
                {yes
                    ? <path d="M2.8 8.5l3.4 3.4L13.2 4.9" stroke="currentColor"
                            strokeWidth={optional ? 2.8 : 2.2}
                            strokeLinecap="round" strokeLinejoin="round" />
                    : <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.2"
                            strokeLinecap="round" />}
            </svg>
            <span className="rnSrOnly">{label}</span>
        </span>
    );
}
