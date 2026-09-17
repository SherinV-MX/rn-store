import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '../globals.css';
import CartProvider from '@/components/shop/CartProvider';
import CartDrawer from '@/components/shop/CartDrawer';
import StoreHeader from '@/components/layout/StoreHeader';
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
        title: dict.meta.title,
        description: dict.meta.description,
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
    const dict = await getDictionary(locale);

    /* CartProvider wraps the whole document rather than the product page, because the header's
       cart count and the drawer both read it — and a cart that resets when someone opens a
       second page is not a cart. */
    return (
        <html lang={locale} className={`${inter.variable} ${outfit.variable}`}>
            <body>
                <CartProvider locale={locale}>
                    <StoreHeader locale={locale} dict={dict.header} />
                    <main>{children}</main>
                    <CartDrawer locale={locale} dict={dict.cart} />
                </CartProvider>
            </body>
        </html>
    );
}
