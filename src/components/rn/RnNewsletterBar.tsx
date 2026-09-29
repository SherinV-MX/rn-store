import Image from 'next/image';
import { rnFooter } from '@/content/rn';
import s from './RnChrome.module.css';

/* The newsletter bar: a full-width red band with RN's slanted white logo panel cut into the
   left of it and the heading beside it.

   It sat in the footer at first, which put it on every page of the rebuild. Live carries it in
   a footer template, but on the pages themselves it only shows where the page asks for it — so
   it is a section a page drops in rather than something the layout imposes.

   The panel is RN's own artwork, a flat JPEG with no transparency whose upper right is the
   band's own red, so the band has to be painted in that same red or the two meet in a visible
   seam down the join. See .newsBar in the stylesheet. */
export default function RnNewsletterBar({ locale }: { locale: string }) {
    const t = rnFooter(locale);

    return (
        <section className={s.newsBar} aria-labelledby="rn-newsletter">
            <div className={s.newsShapeCol}>
                <Image
                    className={s.newsShape}
                    src="/rn/logo-shape.jpg"
                    alt="Race Navigator — the way of fast information"
                    width={500}
                    height={161}
                    quality={82}
                />
            </div>

            <div className={s.newsBarBody}>
                <h2 className={s.newsBarHead} id="rn-newsletter">{t.newsletterHead}</h2>
            </div>
        </section>
    );
}
