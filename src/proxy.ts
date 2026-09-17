import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'de'];

function getDefaultLocale(request: NextRequest): string {
    const hostname = request.headers.get('host') ?? '';
    if (hostname.endsWith('.de')) return 'de';
    return 'en';
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasLocale) return;

    const locale = getDefaultLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
}

export const config = {
    matcher: [
        // Skip API, Next.js internals, common static folders, AND any path that
        // looks like a file (has a `.` in the last segment) — covers root-level
        // static files like /og-image.jpg, /robots.txt, /sitemap.xml, etc.
        '/((?!api|_next/static|_next/image|favicon.ico|images|assets|.*\\..*).*)',
    ],
};
