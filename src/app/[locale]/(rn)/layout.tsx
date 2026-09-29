import { Titillium_Web, Source_Sans_3 } from 'next/font/google';
import RnHeader from '@/components/rn/RnHeader';
import RnFooter from '@/components/rn/RnFooter';
import CartDrawer from '@/components/shop/CartDrawer';
import { getDictionary } from '@/dictionaries/get-dictionary';
import '@/components/rn/rn.css';

/* The live site's own two faces. Titillium Web at 600 sets every heading there, and the rest
   is Myriad — which is Adobe's and not ours to serve, so Source Sans 3 stands in: Adobe drew
   it as the open counterpart to that same humanist family and it sets at very nearly the same
   width. Loaded here rather than in the root layout so the store next door keeps Inter and
   Outfit. */
const display = Titillium_Web({
    subsets: ['latin'],
    variable: '--font-rn-display',
    weight: ['600', '700'],
    display: 'swap',
});

const body = Source_Sans_3({
    subsets: ['latin'],
    variable: '--font-rn-body',
    weight: ['400', '600', '700'],
    display: 'swap',
});

/* The Race Navigator rebuild. Its own header, footer and palette — the store's chrome lives in
   the (store) group and neither inherits the other. */
export default async function RnLayout({
    children,
    params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <>
            <div data-site="rn" className={`${display.variable} ${body.variable}`}>
                <a href="#rn-main" className="rnSkip">Skip to content</a>
                <RnHeader locale={locale} />
                <main id="rn-main">{children}</main>
                <RnFooter locale={locale} />
            </div>

            {/* The same drawer the store uses, over the same cart, so ordering from these pages
                does not send anyone to the catalogue to start again.

                Outside the RN wrapper on purpose. That element sets `color: var(--rn-white)`
                and a dark colour-scheme for the whole rebuild, which the drawer inherited —
                white type on its white panel, so every line of it went invisible. Out here it
                renders in the store's own context, exactly as it does in the shop. */}
            <CartDrawer locale={locale} dict={dict.cart} />
        </>
    );
}
