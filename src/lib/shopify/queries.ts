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
        cost {
            subtotalAmount { ...Money }
            totalAmount { ...Money }
            totalTaxAmount { ...Money }
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
