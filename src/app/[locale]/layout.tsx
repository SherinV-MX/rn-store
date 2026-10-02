import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '../globals.css';
import CartProvider from '@/components/shop/CartProvider';
import { getDictionary } from '@/dictionaries/get-dictionary';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-body',
    weight: ['300', '400', '500', '600'],
    display: 'swap',
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-heading',
    weight: ['400', '600', '700'],
    display: 'swap',
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    return {
        /* Share cards need an absolute address for the picture, and a relative one is all a
           page can give.

           The production domain, not VERCEL_URL. VERCEL_URL is the host of that one deployment
           — rn-store-i53e7zup3-....vercel.app — and Vercel keeps those behind Deployment
           Protection, which answers a crawler with its login page as 200 HTML rather than the
           picture. WhatsApp fetched it, got HTML, and showed a card with no image.
           VERCEL_PROJECT_PRODUCTION_URL is the public domain and is the same for every deploy,
           so a preview advertises the live card rather than one nobody can load. */
        metadataBase: new URL(
            process.env.NEXT_PUBLIC_SITE_URL
            ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
                ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
                : 'http://localhost:3000'),
        ),
        title: dict.meta.title,
        description: dict.meta.description,
        openGraph: {
            type: 'website',
            locale,
            /* No title or description here. Setting them pinned every share card to the
               store's wording — an RN page showed its own name in the tab and "Store — BSS
               LogisQ" in the card, because a page's title does not reach into an openGraph
               block that has already named one. Left out, each page's own title and
               description are what the card carries. */

            /* Served from public rather than as an opengraph-image file beside the route.
               That convention appends a cache token, which comes out as a query string with
               no key — ...opengraph-image.png?opengraph-image.0983b4ed.png — and Teams would
               not load it, where WhatsApp did. A plain path has nothing to object to. */
            images: [{
                url: '/og.png',
                width: 1200,
                height: 630,
                type: 'image/png',
                alt: 'Race Navigator',
            }],
        },
        twitter: { card: 'summary_large_image', images: ['/og.png'] },
    };
}

export function generateStaticParams() {
    return [{ locale: 'en' }, { locale: 'de' }];
}

export default async function RootLayout({
    children,
    params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
    const { locale } = await params;

    /* CartProvider wraps the whole document rather than the product page, because the header's
       cart count and the drawer both read it — and a cart that resets when someone opens a
       second page is not a cart.

       Headers and footers belong to the route groups below, not here: the store and the Race
       Navigator site each carry their own. */
    return (
        <html lang={locale} className={`${inter.variable} ${outfit.variable}`}>
            <body>
                <CartProvider locale={locale}>{children}</CartProvider>
            </body>
        </html>
    );
}
