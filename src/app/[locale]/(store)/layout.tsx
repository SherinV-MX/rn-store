import CartDrawer from '@/components/shop/CartDrawer';
import StoreHeader from '@/components/layout/StoreHeader';
import { getDictionary } from '@/dictionaries/get-dictionary';

/* The BSS LogisQ store: landing page, catalogue and checkout.

   Its header and cart drawer live here rather than in the root layout because the Race
   Navigator pages next door carry their own chrome and must not inherit this one. The route
   group keeps every URL exactly as it was. */
export default async function StoreLayout({
    children,
    params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <>
            <StoreHeader locale={locale} dict={dict.header} />
            <main>{children}</main>
            <CartDrawer locale={locale} dict={dict.cart} />
        </>
    );
}
