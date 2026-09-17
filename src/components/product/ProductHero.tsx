import Image from 'next/image';
import { Check } from 'lucide-react';
import BuyBox, { type ShopDict } from '@/components/shop/BuyBox';
import type { Product } from '@/lib/shopify/types';
import styles from './ProductHero.module.css';

export interface HeroDict {
    eyebrow: string;
    title: string;
    subtitle: string;
    bullets: string[];
    orderNow: string;
    unavailable: string;
    talkToUs: string;
}

/* The hero carries the whole sale: the machine on the left, three reasons and a price on the
   right. Everything below it on the page is detail for the people who need it.

   `product` is null while the store is still being set up, or if the handle in the env does
   not exist. The page keeps its shape in that case and the buy box becomes a contact link —
   a missing token must never produce a broken page. */
export default function ProductHero({
    locale, dict, shopDict, product,
}: {
    locale: string;
    dict: HeroDict;
    shopDict: ShopDict;
    product: Product | null;
}) {
    const image = product?.featuredImage;
    const title = product?.title ?? dict.title;

    return (
        <section className={styles.hero}>
            {/* The red sweep behind the copy. A clip-path, not an image: it scales to any
                viewport without a second asset and costs nothing to load. */}
            <div className={styles.sweep} aria-hidden="true" />

            <div className={`shell ${styles.inner}`}>
                <div className={styles.head}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.eyebrow}>{dict.eyebrow}</p>
                </div>

                <div className={styles.body}>
                    <div className={styles.shot}>
                        {image ? (
                            <Image
                                src={image.url}
                                alt={image.altText ?? title}
                                width={image.width}
                                height={image.height}
                                /* The one image above the fold — it loads first, everything else waits. */
                                priority
                                sizes="(max-width: 900px) 100vw, 45vw"
                                className={styles.shotImg}
                            />
                        ) : (
                            <div className={styles.shotEmpty} aria-hidden="true" />
                        )}
                    </div>

                    <div className={styles.pitch}>
                        <p className={styles.subtitle}>{dict.subtitle}</p>

                        <ul className={styles.bullets}>
                            {dict.bullets.map((line) => (
                                <li key={line} className={styles.bullet}>
                                    <span className={styles.tick} aria-hidden="true">
                                        <Check size={18} strokeWidth={3} />
                                    </span>
                                    {line}
                                </li>
                            ))}
                        </ul>

                        {product ? (
                            <BuyBox product={product} locale={locale} dict={shopDict} />
                        ) : (
                            <div className={styles.fallback}>
                                <p className={styles.fallbackNote}>{dict.unavailable}</p>
                                <a className={styles.fallbackCta} href={`https://bss-logisq.com/${locale}/contact`}>
                                    {dict.talkToUs}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
