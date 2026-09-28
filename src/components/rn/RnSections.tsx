import Link from 'next/link';
import { RN_PARTNERS, rnHome } from '@/content/rn';
import { RnCaseArt } from './RnArt';
import s from './RnHome.module.css';

/* The partner rail. The list is rendered twice and the track translated by half its width, so
   the loop closes without a visible seam. Hovering pauses it; reduced motion stops it and
   leaves the rail scrollable by hand. */
export function RnPartners() {
    const run = [...RN_PARTNERS, ...RN_PARTNERS];
    return (
        <section className="rnLight" id="partners" aria-label="References">
            <div className={s.marquee}>
                <div className={s.track}>
                    {run.map((name, i) => (
                        <span className={s.brand} key={`${name}-${i}`} aria-hidden={i >= RN_PARTNERS.length}>
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function RnStats({ locale }: { locale: string }) {
    const t = rnHome(locale);
    return (
        <section className={`rnSection ${s.stats}`} id="support">
            <div className="rnRail">
                <div className={s.head}>
                    <p className="rnEyebrow">{locale === 'de' ? 'Streckenabdeckung' : 'Track coverage'}</p>
                    <h2 className="rnH2 rnUnderline">{t.statsHead}</h2>
                    <p className="rnLead">{t.statsIntro}</p>
                </div>

                <dl className={s.statGrid}>
                    {t.stats.map((stat) => (
                        <div className={s.stat} key={stat.label}>
                            <dd className={s.statValue}>{stat.value}</dd>
                            <dt className={s.statLabel}>{stat.label}</dt>
                        </div>
                    ))}
                </dl>

                <p className={s.statsFoot}>{t.statsFoot}</p>
            </div>
        </section>
    );
}

export function RnQuote({ locale }: { locale: string }) {
    const t = rnHome(locale);
    return (
        <section className={`rnSection ${s.quote}`}>
            <div className="rnRail">
                <figure className={s.quoteInner}>
                    <span className={s.quoteMark} aria-hidden="true">&ldquo;</span>
                    <blockquote className={s.quoteText}>{t.quote}</blockquote>
                    <figcaption>
                        <p className={s.quoteName}>{t.quoteName}</p>
                        <p className={s.quoteRole}>{t.quoteRole}</p>
                    </figcaption>
                </figure>
            </div>
        </section>
    );
}

export function RnCaseBand({ locale }: { locale: string }) {
    const t = rnHome(locale);
    return (
        <section className={`rnSection ${s.cta}`}>
            <div className={`rnRail ${s.ctaGrid}`}>
                <div>
                    <h2 className="rnH2 rnUnderline">{t.ctaHead}</h2>
                    <p className="rnLead">{t.ctaBody}</p>
                    <ul className={s.ctaList}>
                        {t.caseItems.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                    <p style={{ marginTop: '2rem' }}>
                        <Link href={`/${locale}/rn/rn-one`} className="rnBtn rnBtnSolid">{t.ctaButton}</Link>
                    </p>
                </div>
                <div className={s.caseArt}>
                    <RnCaseArt />
                </div>
            </div>
        </section>
    );
}
