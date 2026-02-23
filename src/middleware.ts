/**
 * Middleware — Segurança, CSP, rate limiting, proteção de rotas.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit';

// Rotas que precisam de autenticação
const PROTECTED_ROUTES = ['/profile', '/analyze', '/results', '/history', '/settings'];

// Nonce para CSP
function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
}

export function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;
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
        `form-action 'self'`,
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

    // Auth routes: rate limit mais restritivo
    if (pathname.startsWith('/api/auth')) {
        const result = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
        if (!result.success) {
            return new NextResponse('Muitas tentativas. Tente novamente em breve.', {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil(result.resetMs / 1000)),
                },
            });
        }
    }
    // API routes: rate limit geral
    else if (pathname.startsWith('/api')) {
        const result = checkRateLimit(`api:${ip}`);
        if (!result.success) {
            return new NextResponse('Rate limit excedido.', {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil(result.resetMs / 1000)),
                },
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
