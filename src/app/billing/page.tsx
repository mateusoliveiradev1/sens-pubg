import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { openBillingPortal } from '@/actions/billing';
import { auth } from '@/auth';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { Header } from '@/ui/components/header';

export const metadata: Metadata = {
    title: 'Billing Sens PUBG',
    description: 'Estado de assinatura, quota e Portal Stripe.',
};

function formatDate(date: Date | null): string {
    return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date) : 'sem periodo ativo';
}

async function openPortalAction() {
    'use server';

    const result = await openBillingPortal();
    redirect(result.portalUrl);
}

export default async function BillingPage(): Promise<React.JSX.Element> {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/billing');
    }

    const access = await resolveServerProductAccess(session.user.id);
    const canOpenPortal = access.features['billing.portal_access'].granted
        && access.billingStatus !== 'none'
        && access.accessState !== 'suspended';
    const quota = access.quota;

    return (
        <div className="min-h-screen bg-[#08080c] text-white">
            <Header />
            <main className="page">
                <section className="container" style={{ maxWidth: 980, display: 'grid', gap: 'var(--space-xl)' }}>
                    <div className="glass-card" style={{ padding: 'var(--space-2xl)', display: 'grid', gap: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                            <div>
                                <span className="badge badge-info">Billing</span>
                                <h1 style={{ margin: 'var(--space-sm) 0 0' }}>Seu acesso Sens PUBG</h1>
                            </div>
                            <span className="badge badge-info">{access.accessState}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)' }}>Tier</span>
                                <strong style={{ display: 'block', fontSize: 'var(--text-2xl)' }}>{access.effectiveTier}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)' }}>Billing</span>
                                <strong style={{ display: 'block', fontSize: 'var(--text-2xl)' }}>{access.billingStatus}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)' }}>Quota</span>
                                <strong style={{ display: 'block', fontSize: 'var(--text-2xl)' }}>
                                    {quota.used}/{quota.limit}
                                </strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)' }}>Periodo</span>
                                <strong style={{ display: 'block', fontSize: 'var(--text-base)' }}>{formatDate(access.periodEnd)}</strong>
                            </div>
                        </div>
                        {access.blockers.length > 0 ? (
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {access.blockers.map((blocker) => (
                                    <p key={blocker.code} style={{ margin: 0, color: 'var(--color-warning)' }}>
                                        {blocker.message}
                                    </p>
                                ))}
                            </div>
                        ) : null}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                            {canOpenPortal ? (
                                <form action={openPortalAction}>
                                    <button className="btn btn-primary" type="submit">
                                        Abrir Stripe Billing Portal
                                    </button>
                                </form>
                            ) : (
                                <Link href="/pricing" className="btn btn-primary">
                                    Ver Pro
                                </Link>
                            )}
                            <Link href="/history" className="btn btn-secondary">
                                Ver historico
                            </Link>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 'var(--space-xl)', display: 'grid', gap: 'var(--space-md)' }}>
                        <h2 style={{ margin: 0 }}>Suporte de beta</h2>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                            Cancelamento, falha de pagamento, reembolso e disputa seguem a verdade da Stripe e auditoria interna.
                            Historico salvo fica preservado; o que muda e o acesso aos recursos Pro depois do periodo, graca ou suspensao aplicavel.
                        </p>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                            Para launch publico, a politica legal e fiscal do Brasil precisa de revisao humana antes de ampliar a venda.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
