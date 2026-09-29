import Image from 'next/image';
import { rnFooter } from '@/content/rn';
import s from './RnChrome.module.css';

export default function RnFooter({ locale }: { locale: string }) {
    const t = rnFooter(locale);

    return (
        <footer className={s.footer} id="contact">
            <div className="rnRail">
                <div className={s.footTop}>
                    <div>
                        <Image className={s.markImg} src="/rn/logo.png" alt="Race Navigator"
                               width={168} height={96} />
                        <p className={s.footTag}>{t.tagline}</p>
                    </div>

                    <div className={s.footGroups}>
                        {t.groups.map((g) => (
                            <div key={g.head}>
                                <h2 className={s.footHead}>{g.head}</h2>
                                <ul className={s.footList}>
                                    {g.links.map((l) => (
                                        /* A rebuild demo has nowhere real to send anyone yet, so these
                                           stay inert rather than pretending to be pages. */
                                        <li key={l}><a href="#">{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={s.footBottom}>
                    <span>© {new Date().getFullYear()} {t.rights}</span>
                    <span className={s.social}>
                        <a href="#">Facebook</a>
                        <a href="#">YouTube</a>
                        <a href="#">Instagram</a>
                    </span>
                    <span className={s.demoNote}>Macrix rebuild</span>
                </div>
            </div>
        </footer>
    );
}
