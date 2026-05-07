import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { EvidenceChip } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';

import styles from '../../billing/billing.module.css';

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
    const sessionReceived = Boolean(params?.session_id);

    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <section className={styles.shell} aria-labelledby="checkout-success-title">
                    <div className={styles.receiptPanel}>
                        <div className={styles.chips} aria-label="Status do recibo">
                            <EvidenceChip
                                label="Checkout"
                                value={confirmed ? 'confirmado' : 'pendente'}
                                tone={confirmed ? 'success' : 'warning'}
                            />
                            <EvidenceChip
                                label="Sessao"
                                value={sessionReceived ? 'recebida' : 'ausente'}
                                tone={sessionReceived ? 'info' : 'warning'}
                            />
                            <EvidenceChip label="Fonte" value="servidor" tone="info" />
                        </div>
                        <div>
                            <p className={styles.eyebrow}>Recibo Stripe</p>
                            <h1 id="checkout-success-title">
                                {confirmed ? 'Pro confirmado pelo webhook' : 'Pagamento recebido, aguardando webhook'}
                            </h1>
                            <p>
                                A URL de sucesso nao concede Pro. O acesso vem apenas do estado de billing confirmado
                                no servidor; o identificador da sessao ajuda suporte, mas nao libera recurso sozinho.
                            </p>
                        </div>
                        <div className={styles.receiptMeta} aria-label="Resumo do checkout">
                            <span>
                                Status de acesso
                                <strong>{access.accessState}</strong>
                            </span>
                            <span>
                                Billing
                                <strong>{access.billingStatus}</strong>
                            </span>
                            <span>
                                Proxima acao
                                <strong>{confirmed ? 'abrir dashboard' : 'ver billing'}</strong>
                            </span>
                        </div>
                        <div className={styles.receiptActions}>
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
