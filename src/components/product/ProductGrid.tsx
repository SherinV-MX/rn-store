import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@/lib/shopify/format';
import type { ProductCard } from '@/lib/shopify/types';
import styles from './ProductGrid.module.css';

export interface CatalogueDict {
    title: string;
    intro: string;
    from: string;
    soldOut: string;
    empty: string;
}

export default function ProductGrid({
    products, locale, dict,
}: {
    products: ProductCard[];
    locale: string;
    dict: CatalogueDict;
}) {
    if (products.length === 0) {
        /* Either the shop has nothing published to this channel, or the token cannot see it.
           Both look the same from here, so the message stays neutral. */
        return <p className={styles.empty}>{dict.empty}</p>;
    }

    return (
        <ul className={styles.grid}>
            {products.map((product) => {
                const min = product.priceRange.minVariantPrice;
                const max = product.priceRange.maxVariantPrice;
                /* A range means variants are priced differently, so the tile shows "from X"
                   rather than a number the buyer might not be able to get. */
                const ranged = min.amount !== max.amount;

                return (
                    <li key={product.id} className={styles.cell}>
                        <Link href={`/${locale}/products/${product.handle}`} className={styles.card}>
                            <div className={styles.shot}>
                                {product.featuredImage ? (
                                    <Image
                                        src={product.featuredImage.url}
                                        alt={product.featuredImage.altText ?? product.title}
                                        width={product.featuredImage.width}
                                        height={product.featuredImage.height}
                                        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                                        className={styles.img}
                                    />
                                ) : (
                                    <div className={styles.imgEmpty} aria-hidden="true" />
                                )}
                                {!product.availableForSale && (
                                    <span className={styles.badge}>{dict.soldOut}</span>
                                )}
                            </div>

                            <div className={styles.meta}>
                                <h2 className={styles.name}>{product.title}</h2>
                                <p className={styles.price}>
                                    {ranged && <span className={styles.from}>{dict.from} </span>}
                                    {formatMoney(min, locale)}
                                </p>
                            </div>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
