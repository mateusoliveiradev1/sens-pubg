import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { openBillingPortal } from '@/actions/billing';
import { auth } from '@/auth';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import type { ProductAccessState, BillingStatus, ProductTier } from '@/types/monetization';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';
import { MetricTile } from '@/ui/components/metric-tile';
import { ProductState } from '@/ui/components/product-state';

import styles from './billing.module.css';

export const metadata: Metadata = {
    title: 'Assinatura Sens PUBG',
    description: 'Estado de assinatura, quota, acesso Pro e Portal Stripe.',
};

function formatDate(date: Date | null): string {
    return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date) : 'sem periodo ativo';
}

function formatTier(tier: ProductTier): string {
    if (tier === 'founder') {
        return 'Pro Founder';
    }

    return tier === 'pro' ? 'Pro' : 'Free';
}

function billingStatusLabel(status: BillingStatus): string {
    const labels: Record<BillingStatus, string> = {
        none: 'sem billing',
        checkout_pending: 'checkout pendente',
        active: 'ativo',
        trialing: 'trial',
        past_due: 'pagamento pendente',
        canceling: 'cancelando',
        canceled: 'cancelado',
        unpaid: 'nao pago',
        incomplete: 'incompleto',
        incomplete_expired: 'checkout expirado',
        paused: 'pausado',
        manual_grant: 'grant manual',
        suspended: 'suspenso',
    };

    return labels[status];
}

function accessStateCopy(accessState: ProductAccessState): {
    readonly title: string;
    readonly body: string;
    readonly tone: EvidenceTone;
} {
    switch (accessState) {
        case 'free':
            return {
                title: 'Free ativo',
                body: 'Seu Free continua util: 3 analises uteis salvas por mes, verdade do clip, confianca, cobertura e resumo do coach.',
                tone: 'info',
            };
        case 'free_limit_reached':
            return {
                title: 'Quota Free usada',
                body: 'A verdade do clip continua visivel, mas novos saves uteis ficam bloqueados ate renovar o periodo ou entrar no Pro.',
                tone: 'warning',
            };
        case 'checkout_pending':
            return {
                title: 'Checkout em verificacao',
                body: 'A success URL nao concede Pro. O servidor espera webhook e assinatura confiavel antes de liberar acesso pago.',
                tone: 'warning',
            };
        case 'pro_active':
        case 'founder_active':
            return {
                title: 'Pro confirmado pelo servidor',
                body: 'Seu acesso veio de billing confiavel: coach completo, historico profundo, trends compativeis e validacao ficam abertos.',
                tone: 'success',
            };
        case 'past_due_grace':
            return {
                title: 'Pagamento em graca',
                body: 'Pro continua por enquanto, mas o billing precisa voltar para um estado confiavel antes do fim da graca.',
                tone: 'warning',
            };
        case 'past_due_blocked':
            return {
                title: 'Pagamento bloqueando Pro',
                body: 'O Free e o historico salvo ficam preservados; recursos Pro voltam quando o billing for recuperado.',
                tone: 'error',
            };
        case 'canceling':
            return {
                title: 'Cancelamento agendado',
                body: 'Pro segue ate o periodo aplicavel. Depois, o produto volta para Free sem apagar historico salvo.',
                tone: 'warning',
            };
        case 'canceled':
            return {
                title: 'Plano cancelado',
                body: 'Seu historico salvo fica preservado. Voce pode continuar pelo Free ou reabrir Pro quando quiser.',
                tone: 'info',
            };
        case 'suspended':
            return {
                title: 'Acesso suspenso',
                body: 'Acesso pago esta bloqueado por revisao operacional. O suporte precisa reconciliar o caso antes de novas acoes Pro.',
                tone: 'error',
            };
        case 'manual_grant_active':
            return {
                title: 'Acesso manual ativo',
                body: 'Seu Pro vem de grant auditado, nao de checkout. Portal Stripe pode nao estar disponivel para este estado.',
                tone: 'pro',
            };
        case 'manual_grant_expired':
            return {
                title: 'Grant manual expirado',
                body: 'O acesso voltou para Free. Historico salvo fica preservado e o suporte pode revisar o grant se necessario.',
                tone: 'warning',
            };
    }
}

function portalAllowed(status: BillingStatus, accessState: ProductAccessState): boolean {
    return (
        status === 'active'
        || status === 'trialing'
        || status === 'past_due'
        || accessState === 'canceling'
    );
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
    const state = accessStateCopy(access.accessState);
    const quota = access.quota;
    const canOpenPortal = access.features['billing.portal_access'].granted
        && access.accessState !== 'suspended'
        && portalAllowed(access.billingStatus, access.accessState);
    const quotaTone: EvidenceTone = quota.remaining <= 0
        ? 'error'
        : quota.state === 'warning'
            ? 'warning'
            : 'info';

    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <section className={styles.shell} aria-labelledby="billing-title">
                    <div className={styles.command}>
                        <div>
                            <p className={styles.eyebrow}>Assinatura</p>
                            <h1 id="billing-title">Seu acesso Sens PUBG</h1>
                            <p>
                                Este painel mostra a verdade de acesso lida do servidor. Webhook, assinatura e Portal Stripe
                                controlam Pro; success URL, estado local ou estado visual nao concedem acesso.
                            </p>
                        </div>
                        <div className={styles.chips} aria-label="Estado do produto">
                            <EvidenceChip label="Tier" value={formatTier(access.effectiveTier)} tone={access.effectiveTier === 'free' ? 'info' : 'pro'} />
                            <EvidenceChip label="Acesso" value={access.accessState} tone={state.tone} />
                            <EvidenceChip label="Billing" value={billingStatusLabel(access.billingStatus)} tone={state.tone} />
                            <EvidenceChip label="Quota" value={quota.state} tone={quotaTone} />
                        </div>
                    </div>

                    <div className={styles.metrics}>
                        <MetricTile
                            label="Tier atual"
                            value={formatTier(access.effectiveTier)}
                            helper={access.effectiveTier === 'free' ? 'Free continua util.' : 'Pro abre continuidade/depth.'}
                            tone={access.effectiveTier === 'free' ? 'info' : 'pro'}
                        />
                        <MetricTile
                            label="Quota"
                            value={`${quota.used}/${quota.limit}`}
                            helper={`${quota.remaining} saves uteis restantes neste periodo.`}
                            tone={quotaTone}
                        />
                        <MetricTile
                            label="Periodo"
                            value={formatDate(access.periodEnd)}
                            helper="Periodo vem do resolver de acesso, nao do cliente."
                            tone="info"
                        />
                        <MetricTile
                            label="Billing"
                            value={billingStatusLabel(access.billingStatus)}
                            helper="Portal Stripe abre apenas por action confiavel."
                            tone={state.tone}
                        />
                    </div>

                    <div className={styles.stateGrid}>
                        <ProductState
                            state={state.tone === 'error' ? 'error' : state.tone === 'warning' ? 'weak' : 'empty'}
                            title={state.title}
                            body={state.body}
                            tone={state.tone}
                            action={canOpenPortal ? (
                                <form action={openPortalAction}>
                                    <button className="btn btn-primary" type="submit">
                                        Abrir Portal Stripe
                                    </button>
                                </form>
                            ) : (
                                <Link href={access.effectiveTier === 'free' ? '/pricing' : '/history'} className="btn btn-primary">
                                    {access.effectiveTier === 'free' ? 'Ver Pro' : 'Ver historico'}
                                </Link>
                            )}
                        />
                        <section className={styles.blockerPanel} aria-label="Bloqueios e suporte">
                            <h2>Bloqueios, suporte e proxima acao</h2>
                            {access.blockers.length > 0 ? (
                                <ul className={styles.blockerList}>
                                    {access.blockers.map((blocker) => (
                                        <li key={blocker.code}>
                                            <strong>{blocker.code}</strong>
                                            <span>{blocker.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Nenhum blocker ativo no resolver. Continue pelo proximo clip ou revise historico.</p>
                            )}
                            <div className={styles.actionRow}>
                                <Link href="/analyze" className="btn btn-secondary">
                                    Analisar clip
                                </Link>
                                <Link href="/history" className="btn btn-secondary">
                                    Ver historico
                                </Link>
                            </div>
                        </section>
                    </div>

                    <section className={styles.supportPanel}>
                        <h2>Suporte de beta</h2>
                        <p>
                            Cancelamento, falha de pagamento, reembolso e disputa seguem a verdade da Stripe e auditoria interna.
                            Historico salvo fica preservado; o que muda e o acesso aos recursos Pro depois do periodo, graca,
                            cancelamento ou suspensao aplicavel.
                        </p>
                        <p>
                            Para launch publico, a politica legal e fiscal do Brasil precisa de revisao humana antes de ampliar a venda.
                            Founder beta continua controlado ate o checklist Stripe em modo teste ser refeito.
                        </p>
                    </section>
                </section>
            </main>
        </div>
    );
}
