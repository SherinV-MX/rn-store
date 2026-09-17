import Image from 'next/image';
import Link from 'next/link';
import BuyBox, { type ShopDict } from '@/components/shop/BuyBox';
import type { Product } from '@/lib/shopify/types';
import styles from './ProductDetail.module.css';

export interface DetailDict {
    back: string;
    details: string;
}

/* One product, entirely from Shopify: title, images, variants, price and the description the
   merchandiser wrote. Nothing here is per-product code — a new product in the admin gets this
   page for free. */
export default function ProductDetail({
    product, locale, dict, shopDict,
}: {
    product: Product;
    locale: string;
    dict: DetailDict;
    shopDict: ShopDict;
}) {
    const gallery = product.images.length ? product.images : (product.featuredImage ? [product.featuredImage] : []);
    const hero = gallery[0];

    return (
        <article className={styles.page}>
            <Link href={`/${locale}/products`} className={styles.back}>← {dict.back}</Link>

            <div className={styles.top}>
                <div className={styles.media}>
                    {hero && (
                        <div className={styles.heroShot}>
                            <Image
                                src={hero.url}
                                alt={hero.altText ?? product.title}
                                width={hero.width}
                                height={hero.height}
                                priority
                                sizes="(max-width: 900px) 100vw, 50vw"
                                className={styles.heroImg}
                            />
                        </div>
                    )}

                    {gallery.length > 1 && (
                        <div className={styles.thumbs}>
                            {gallery.slice(1, 5).map((image) => (
                                <Image
                                    key={image.url}
                                    src={image.url}
                                    alt={image.altText ?? product.title}
                                    width={160}
                                    height={120}
                                    className={styles.thumb}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.buy}>
                    <h1 className={styles.title}>{product.title}</h1>
                    <BuyBox product={product} locale={locale} dict={shopDict} />
                </div>
            </div>

            {product.descriptionHtml && (
                <section className={styles.description}>
                    <h2 className={styles.descTitle}>{dict.details}</h2>
                    {/* The description comes from the store's own rich-text editor, which is
                        staff-authored content, not visitor input. */}
                    <div
                        className={styles.descBody}
                        dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                </section>
            )}
        </article>
    );
}
