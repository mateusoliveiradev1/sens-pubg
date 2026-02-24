/**
 * Login Page — Auth.js sign-in with Discord + Google.
 */

import { Header } from '@/ui/components/header';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { loginSearchParamsCache } from './search-params';
import { SearchParams } from 'nuqs/server';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
    title: 'Entrar',
    description: 'Conecte-se para salvar suas análises e acompanhar seu progresso.',
};

// Force dynamic because Header and auth() read session
export const dynamic = 'force-dynamic';

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    // Search params are cached and inherently typed with the default '/analyze' via nuqs.
    const { callbackUrl } = await loginSearchParamsCache.parse(searchParams);

    const session = await auth();

    // If already logged in, go straight to the app
    if (session) {
        redirect(callbackUrl);
    }

    return (
        <>
            <Header />
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LoginForm callbackUrl={callbackUrl} />
            </div>
        </>
    );
}
