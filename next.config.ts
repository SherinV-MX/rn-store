import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* pdf.js and the node canvas binding are loaded by the manual-cover route at request
       time. Both are native or eval-sensitive and break when bundled, so they stay as real
       requires on the server. */
    serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
    images: {
        /* Product imagery is served by Shopify's CDN. Nothing else is allowed, so a wrong
           handle in a query cannot turn this site into an open image proxy. */
        remotePatterns: [{ protocol: 'https', hostname: 'cdn.shopify.com' }],
        /* Next only serves the qualities listed here. The Race Navigator photography is
           large and dark, where 75 shows banding in the gradients, so a couple of higher
           steps are allowed rather than raising it for every image on the site. */
        qualities: [75, 78, 82],
    },
};

export default nextConfig;
