/* Shapes we actually use from the Storefront API. Deliberately narrower than Shopify's
   schema: every field here is one this site renders, so a change to the query is visible
   as a type error rather than as `undefined` in the markup. */

export interface Money {
    /* Shopify sends amounts as decimal strings ("1299.00"), never as numbers — parse only
       at the point of formatting, so no rounding creeps in on the way through. */
    amount: string;
    currencyCode: string;
}

export interface ProductImage {
    url: string;
    altText: string | null;
    width: number;
    height: number;
}

export interface SelectedOption {
    name: string;
    value: string;
}

export interface ProductVariant {
    id: string;
    title: string;
    sku: string | null;
    availableForSale: boolean;
    /* null unless the shop has inventory tracking on for the variant */
    quantityAvailable: number | null;
    price: Money;
    compareAtPrice: Money | null;
    selectedOptions: SelectedOption[];
    image: ProductImage | null;
}

export interface ProductOption {
    id: string;
    name: string;
    values: string[];
}

export interface Product {
    id: string;
    handle: string;
    title: string;
    description: string;
    descriptionHtml: string;
    availableForSale: boolean;
    featuredImage: ProductImage | null;
    images: ProductImage[];
    options: ProductOption[];
    priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
    variants: ProductVariant[];
}

export interface CartLine {
    id: string;
    quantity: number;
    cost: { totalAmount: Money; amountPerQuantity: Money };
    merchandise: {
        id: string;
        title: string;
        selectedOptions: SelectedOption[];
        image: ProductImage | null;
        product: { handle: string; title: string };
    };
}

export interface Cart {
    id: string;
    /* The hand-off. Everything up to here is ours; this URL is Shopify's hosted checkout. */
    checkoutUrl: string;
    totalQuantity: number;
    cost: {
        subtotalAmount: Money;
        totalAmount: Money;
        /* null until Shopify knows the buyer's country — it stays null on our side of the
           hand-off, which is why the page never promises a tax-inclusive total. */
        totalTaxAmount: Money | null;
    };
    lines: CartLine[];
}
