import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { Header } from '@/ui/components/header';

export const metadata: Metadata = {
    title: 'Checkout recebido',
    description: 'Status do checkout Pro conferido pelo servidor.',
};

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    readonly searchParams?: Promise<{ readonly session_id?: string }>;
}): Promise<React.JSX.Element> {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/checkout/success');
    }

    const params = await searchParams;
    const access = await resolveServerProductAccess(session.user.id);
    const confirmed = access.effectiveTier !== 'free'
        && access.accessState !== 'checkout_pending'
        && access.accessState !== 'past_due_blocked'
        && access.accessState !== 'canceled'
        && access.accessState !== 'suspended';

    return (
        <div className="min-h-screen bg-[#08080c] text-white">
            <Header />
            <main className="page">
                <section className="container" style={{ maxWidth: 760 }}>
                    <div className="glass-card" style={{ padding: 'var(--space-2xl)', display: 'grid', gap: 'var(--space-lg)' }}>
                        <span className="badge badge-info">Checkout Stripe</span>
                        <h1 style={{ margin: 0 }}>
                            {confirmed ? 'Pro confirmado pelo webhook' : 'Pagamento recebido, aguardando webhook'}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                            A URL de sucesso nao concede Pro. O acesso vem apenas do estado de billing confirmado no servidor.
                            {params?.session_id ? ' O identificador da sessao ajuda o suporte, mas nao libera recurso sozinho.' : ''}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                            <Link href={confirmed ? '/dashboard' : '/billing'} className="btn btn-primary">
                                {confirmed ? 'Abrir dashboard' : 'Ver status de billing'}
                            </Link>
                            <Link href="/analyze" className="btn btn-secondary">
                                Continuar analisando
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
