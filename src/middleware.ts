import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit';

// Routes that REQUIRE authentication (redirect to /login if no session)
const PROTECTED_ROUTES = ['/profile', '/history'];

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

// CSP Nonce generator
function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret) {
        return false;
    }

    const token = await getToken({
        req,
        secret: authSecret,
        secureCookie: req.nextUrl.protocol === 'https:',
    });

    return token !== null;
}

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isLoggedIn = await isAuthenticated(req);
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // ═══ Auth Protection (protected routes only) ═══
    if (isProtectedRoute(pathname) && !isLoggedIn) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.next();

    // ═══ CSP Nonce ═══
    const nonce = generateNonce();
    const cspHeader = isDevelopment
        ? [
            `default-src 'self'`,
            `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
            `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
            `font-src 'self' https://fonts.gstatic.com`,
            `img-src 'self' data: blob: https:`,
            `media-src 'self' blob:`,
            `connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.neon.tech https://*.vercel-analytics.com`,
            `frame-ancestors 'none'`,
            `base-uri 'self'`,
            `form-action 'self' https://accounts.google.com https://discord.com`,
        ].join('; ')
        : [
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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? 'anonymous';

    if (pathname.startsWith('/api/auth')) {
        const result = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
        if (!result.success) {
            return new NextResponse('Muitas tentativas de login. Tente novamente em 15 minutos.', {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil(result.resetMs / 1000)) },
            });
        }
    } else if (pathname.startsWith('/api') || pathname.startsWith('/actions')) {
        const result = checkRateLimit(`api:${ip}`);
        if (!result.success) {
            return new NextResponse('Limite de requisições excedido. Aguarde um momento.', {
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
