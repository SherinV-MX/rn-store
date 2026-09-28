import { Archivo, Barlow } from 'next/font/google';
import RnHeader from '@/components/rn/RnHeader';
import RnFooter from '@/components/rn/RnFooter';
import '@/components/rn/rn.css';

/* Archivo for headings and Barlow for everything else: both are squared-off grotesques with
   the flat terminals of instrument lettering, which is what the device's own screen uses.
   Loaded here rather than in the root layout so the store next door keeps Inter and Outfit. */
const display = Archivo({
    subsets: ['latin'],
    variable: '--font-rn-display',
    weight: ['700', '800'],
    display: 'swap',
});

const body = Barlow({
    subsets: ['latin'],
    variable: '--font-rn-body',
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

/* The Race Navigator rebuild. Its own header, footer and palette — the store's chrome lives in
   the (store) group and neither inherits the other. */
export default async function RnLayout({
    children,
    params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
    const { locale } = await params;

    return (
        <div data-site="rn" className={`${display.variable} ${body.variable}`}>
            <a href="#rn-main" className="rnSkip">Skip to content</a>
            <RnHeader locale={locale} />
            <main id="rn-main">{children}</main>
            <RnFooter locale={locale} />
        </div>
    );
}
