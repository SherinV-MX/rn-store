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

export interface DeliveryOption {
    handle: string;
    title: string | null;
    description: string | null;
    estimatedCost: Money;
}

export interface DeliveryGroup {
    id: string;
    groupType: string;
    selectedDeliveryOption: DeliveryOption | null;
    deliveryOptions: DeliveryOption[];
}

export interface Address {
    firstName?: string;
    lastName?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    countryCode?: string;
    provinceCode?: string;
    phone?: string;
}

export interface Cart {
    id: string;
    /* Shopify's own hosted checkout. Kept as a fallback for when completing on our side is
       refused — a shop with no card gateway, say — so the buyer is never stranded. */
    checkoutUrl: string;
    totalQuantity: number;
    buyerIdentity: { email: string | null; phone: string | null; countryCode: string | null };
    discountCodes: { code: string; applicable: boolean }[];
    /* Empty when nothing in the cart needs shipping, or when the shop has no rates for the
       address. Empty is not an error — it means there is no delivery step to show. */
    deliveryGroups: DeliveryGroup[];
    cost: {
        subtotalAmount: Money;
        totalAmount: Money;
        /* Both stay null until Shopify knows the address. */
        totalTaxAmount: Money | null;
        totalDutyAmount: Money | null;
    };
    lines: CartLine[];
}
