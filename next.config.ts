import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        /* Product imagery is served by Shopify's CDN. Nothing else is allowed, so a wrong
           handle in a query cannot turn this site into an open image proxy. */
        remotePatterns: [{ protocol: 'https', hostname: 'cdn.shopify.com' }],
    },
};

export default nextConfig;
