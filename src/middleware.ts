/**
 * Middleware — Auth.js route protection + security headers + rate limiting.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit';

// Routes that require authentication
const PROTECTED_ROUTES = ['/profile', '/analyze', '/history'];
const AUTH_PAGES = ['/login'];

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

function isAuthPage(pathname: string): boolean {
    return AUTH_PAGES.some(route => pathname.startsWith(route));
}

// CSP Nonce generator
function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
}

export function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    // ═══ Auth Protection ═══
    // Check for Auth.js session token cookie
    const sessionToken = request.cookies.get('authjs.session-token')
        ?? request.cookies.get('__Secure-authjs.session-token');
    const isAuthenticated = !!sessionToken;

    // Redirect unauthenticated users to login
    if (isProtectedRoute(pathname) && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from login page
    if (isAuthPage(pathname) && isAuthenticated) {
        return NextResponse.redirect(new URL('/analyze', request.url));
    }

    const response = NextResponse.next();

    // ═══ CSP Nonce ═══
    const nonce = generateNonce();
    const cspHeader = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' https://fonts.gstatic.com`,
        `img-src 'self' data: blob: https:`,
        `media-src 'self' blob:`,
        `connect-src 'self' https://*.neon.tech https://*.vercel-analytics.com`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        `form-action 'self' https://accounts.google.com https://discord.com`,
    ].join('; ');

    // ═══ Security Headers ═══
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set('x-nonce', nonce);

    // ═══ Rate Limiting ═══
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'anonymous';

    if (pathname.startsWith('/api/auth')) {
        const result = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
        if (!result.success) {
            return new NextResponse('Muitas tentativas. Tente novamente em breve.', {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil(result.resetMs / 1000)) },
            });
        }
    } else if (pathname.startsWith('/api')) {
        const result = checkRateLimit(`api:${ip}`);
        if (!result.success) {
            return new NextResponse('Rate limit excedido.', {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil(result.resetMs / 1000)) },
            });
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
    ],
};
