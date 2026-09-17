/* GraphQL documents, kept apart from the functions that send them so the shape of what we
   ask for is readable in one place. Fragments are shared so a field added to the product
   card and the cart line cannot drift apart. */

const MONEY = `
    fragment Money on MoneyV2 {
        amount
        currencyCode
    }
`;

const IMAGE = `
    fragment Image on Image {
        url
        altText
        width
        height
    }
`;

const VARIANT = `
    fragment Variant on ProductVariant {
        id
        title
        sku
        availableForSale
        quantityAvailable
        price { ...Money }
        compareAtPrice { ...Money }
        selectedOptions { name value }
        image { ...Image }
    }
`;

export const PRODUCT_QUERY = `
    ${MONEY}
    ${IMAGE}
    ${VARIANT}
    query Product($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        product(handle: $handle) {
            id
            handle
            title
            description
            descriptionHtml
            availableForSale
            featuredImage { ...Image }
            images(first: 12) { nodes { ...Image } }
            options { id name values }
            priceRange {
                minVariantPrice { ...Money }
                maxVariantPrice { ...Money }
            }
            variants(first: 100) { nodes { ...Variant } }
        }
    }
`;

const CART = `
    fragment Cart on Cart {
        id
        checkoutUrl
        totalQuantity
        buyerIdentity { email phone countryCode }
        discountCodes { code applicable }
        deliveryGroups(first: 5) {
            nodes {
                id
                groupType
                selectedDeliveryOption { handle title description estimatedCost { ...Money } }
                deliveryOptions { handle title description estimatedCost { ...Money } }
            }
        }
        cost {
            subtotalAmount { ...Money }
            totalAmount { ...Money }
            totalTaxAmount { ...Money }
            totalDutyAmount { ...Money }
        }
        lines(first: 100) {
            nodes {
                ... on CartLine {
                    id
                    quantity
                    cost {
                        totalAmount { ...Money }
                        amountPerQuantity { ...Money }
                    }
                    merchandise {
                        ... on ProductVariant {
                            id
                            title
                            selectedOptions { name value }
                            image { ...Image }
                            product { handle title }
                        }
                    }
                }
            }
        }
    }
`;

/* Every mutation returns the whole cart, so the client never has to guess what the new
   state is — it replaces what it holds with what came back. */
const CART_BODY = `${MONEY}${IMAGE}${CART}`;

export const CART_QUERY = `
    ${CART_BODY}
    query CartQuery($id: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cart(id: $id) { ...Cart }
    }
`;

export const CART_CREATE = `
    ${CART_BODY}
    mutation CartCreate($lines: [CartLineInput!], $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartCreate(input: { lines: $lines }) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

export const CART_LINES_ADD = `
    ${CART_BODY}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

export const CART_LINES_UPDATE = `
    ${CART_BODY}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

/* ── Checkout, on our own domain ──────────────────────────────────────────────
   Contact, address, delivery choice and discounts are ordinary cart mutations, so every step
   before payment is ours to render. Payment is the last three: prepare, attach a payment
   method, submit. */

export const CART_BUYER_IDENTITY_UPDATE = `
    ${CART_BODY}
    mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

export const CART_DELIVERY_ADDRESSES_ADD = `
    ${CART_BODY}
    mutation CartDeliveryAddressesAdd($cartId: ID!, $addresses: [CartSelectableAddressInput!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartDeliveryAddressesAdd(cartId: $cartId, addresses: $addresses) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

export const CART_DELIVERY_OPTION_UPDATE = `
    ${CART_BODY}
    mutation CartDeliveryOptionUpdate($cartId: ID!, $selected: [CartSelectedDeliveryOptionInput!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selected) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

export const CART_DISCOUNT_CODES_UPDATE = `
    ${CART_BODY}
    mutation CartDiscountCodesUpdate($cartId: ID!, $codes: [String!], $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $codes) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;

/* Shopify recalculates taxes, shipping and totals here. It must be called, and come back
   Ready, before a payment is attached — otherwise the amount we charge could differ from the
   amount the cart actually owes. */
export const CART_PREPARE_FOR_COMPLETION = `
    mutation CartPrepare($cartId: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartPrepareForCompletion(cartId: $cartId) {
            result {
                __typename
                ... on CartStatusReady {
                    cart {
                        id
                        cost { totalAmount { amount currencyCode } }
                    }
                }
                ... on CartStatusNotReady { errors { code message } }
                ... on CartThrottled { pollAfter }
            }
            userErrors { field message }
        }
    }
`;

/* sessionId comes from Shopify's card vault, which the browser talks to directly. No card
   number ever reaches our server. */
export const CART_PAYMENT_UPDATE = `
    mutation CartPaymentUpdate($cartId: ID!, $payment: CartPaymentInput!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartPaymentUpdate(cartId: $cartId, payment: $payment) {
            cart { id }
            userErrors { field message }
        }
    }
`;

export const CART_SUBMIT_FOR_COMPLETION = `
    mutation CartSubmit($cartId: ID!, $attemptToken: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartSubmitForCompletion(cartId: $cartId, attemptToken: $attemptToken) {
            result {
                __typename
                ... on SubmitSuccess { redirectUrl attemptId }
                ... on SubmitAlreadyAccepted { attemptId }
                ... on SubmitFailed { checkoutUrl errors { code message } }
                ... on SubmitThrottled { pollAfter }
            }
            userErrors { field message }
        }
    }
`;

export const CART_LINES_REMOVE = `
    ${CART_BODY}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { ...Cart }
            userErrors { field message }
        }
    }
`;
