import type { Metadata } from 'next';
import Link from 'next/link';
import { rnOne } from '@/content/rn';
import { RnDeviceMark } from '@/components/rn/RnArt';
import s from '@/components/rn/RnProduct.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = rnOne(locale);
    return {
        title: `${t.name} — ${t.tagline} | Race Navigator`,
        description: t.intro.slice(0, 160),
    };
}

export default async function RnOnePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = rnOne(locale);

    /* The two versions differ by exactly one line. Marking it rather than leaving the reader to
       diff two lists is the whole job of this section. */
    const racingOnly = 'RN ONE MKII';

    return (
        <>
            <section className={s.hero}>
                <div className={`rnRail ${s.heroGrid}`}>
                    <div>
                        <nav className={s.crumbs} aria-label="Breadcrumb">
                            <Link href={`/${locale}/rn`}>Race Navigator</Link>
                            <span aria-hidden="true">/</span>
                            <Link href={`/${locale}/rn#systems`}>{t.eyebrow}</Link>
                            <span aria-hidden="true">/</span>
                            <span>{t.name}</span>
                        </nav>

                        <h1 className={s.name}>{t.name}</h1>
                        <p className={s.tagline}>{t.tagline}</p>
                        <p className={s.intro}>{t.intro}</p>

                        <div className={s.heroActions}>
                            <Link href={`/${locale}/products`} className="rnBtn rnBtnSolid">{t.buy}</Link>
                            <a href="#spec" className="rnBtn rnBtnGhost">{t.specHead}</a>
                        </div>
                    </div>

                    <div className={s.heroArt}>
                        <RnDeviceMark />
                    </div>
                </div>

                <div className="rnRail">
                    <dl className={s.quick}>
                        {t.quickSpecs.map((q) => (
                            <div className={s.quickCell} key={q.label}>
                                <dt className={s.quickLabel}>{q.label}</dt>
                                <dd className={s.quickValue}>{q.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <section className="rnSection rnLight">
                <div className="rnRail">
                    <p className="rnEyebrow">{t.eyebrow}</p>
                    <h2 className="rnH2 rnUnderline">{t.featureHead}</h2>

                    <div className={s.features}>
                        {t.features.map((f, i) => (
                            <article className={s.feature} key={f.title}>
                                <span className={s.featureNo}>{String(i + 1).padStart(2, '0')}</span>
                                <h3 className={s.featureTitle}>{f.title}</h3>
                                <p className={s.featureBody}>{f.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rnSection" id="spec">
                <div className="rnRail">
                    <p className="rnEyebrow">{t.name}</p>
                    <h2 className="rnH2 rnUnderline">{t.specHead}</h2>

                    <div className={s.specGrid}>
                        {t.specGroups.map((group) => (
                            <div key={group.head}>
                                <h3 className={s.specHead}>{group.head}</h3>
                                <table className={s.specTable}>
                                    <tbody>
                                        {group.rows.map(([label, value]) => (
                                            <tr key={label}>
                                                <th scope="row">{label}</th>
                                                <td>{value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rnSection rnLight">
                <div className="rnRail">
                    <p className="rnEyebrow">{t.name}</p>
                    <h2 className="rnH2 rnUnderline">{t.boxHead}</h2>
                    <p className="rnLead">{t.boxIntro}</p>

                    <div className={s.versions}>
                        {t.versions.map((v) => (
                            <article className={s.version} key={v.name}>
                                <h3 className={s.versionName}>{v.name}</h3>
                                <p className={s.versionNote}>{v.note}</p>
                                <ul className={s.versionList}>
                                    {v.items.map((item) => (
                                        <li key={item} className={item.includes(racingOnly) ? s.versionOnly : undefined}>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rnSection">
                <div className="rnRail">
                    <p className="rnEyebrow">{locale === 'de' ? 'Freischaltbar' : 'Unlockable'}</p>
                    <h2 className="rnH2 rnUnderline">{t.modesHead}</h2>
                    <p className="rnLead">{t.modesIntro}</p>

                    <div className={s.modes}>
                        {t.modes.map((m) => <span className={s.mode} key={m}>{m}</span>)}
                    </div>

                    <h3 className="rnH2 rnUnderline" style={{ marginTop: '4rem', fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
                        {t.accHead}
                    </h3>
                    <div className={s.options}>
                        {t.accessories.map((a) => (
                            <div className={s.option} key={a.name}>
                                <h4 className={s.optionName}>{a.name}</h4>
                                <p className={s.optionNote}>{a.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`rnSection ${s.close}`}>
                <div className="rnRail">
                    <h2 className={s.closeHead}>
                        {locale === 'de' ? 'Bereit für die nächste Session?' : 'Ready for the next session?'}
                    </h2>
                    <div className={s.closeActions}>
                        <Link href={`/${locale}/products`} className={`rnBtn ${s.closeBtn}`}>{t.buy}</Link>
                        <Link href={`/${locale}/rn#support`} className={`rnBtn rnBtnGhost ${s.closeGhost}`}>{t.support}</Link>
                    </div>
                </div>
            </section>
        </>
    );
}
