import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import type { PremiumFeatureLock } from '@/types/monetization';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { LoopRail, type LoopStageKey } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { ProductState, type ProductStateKind } from '@/ui/components/product-state';
import { ProLockPreview } from '@/ui/components/pro-lock-preview';

export const metadata = {
    title: 'Phase 7 State Matrix',
};

const pageStyle: CSSProperties = {
    minHeight: '100vh',
    padding: '32px',
    boxSizing: 'border-box',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
};

const shellStyle: CSSProperties = {
    display: 'grid',
    gap: '24px',
    width: 'min(1180px, 100%)',
    margin: '0 auto',
};

const gridStyle: CSSProperties = {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
};

const panelStyle: CSSProperties = {
    display: 'grid',
    gap: '16px',
    padding: '16px',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px',
    background: 'var(--color-bg-card)',
};

const titleStyle: CSSProperties = {
    margin: 0,
};

interface StateCase {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly kind: ProductStateKind;
    readonly tone: EvidenceTone;
    readonly actionLabel: string;
}

const stateCases: readonly StateCase[] = [
    {
        id: 'free',
        title: 'Free util',
        body: 'Mostra verdade do clip, confianca, cobertura, blockers e resumo curto sem esconder evidencia.',
        kind: 'empty',
        tone: 'info',
        actionLabel: 'Analisar meu spray',
    },
    {
        id: 'pro',
        title: 'Pro ativo',
        body: 'Desbloqueia continuidade: protocolo completo, historico profundo, outcomes e validacao compativel.',
        kind: 'empty',
        tone: 'success',
        actionLabel: 'Registrar resultado do bloco',
    },
    {
        id: 'low-quota',
        title: 'Poucas analises uteis restantes',
        body: 'Aviso de quota aparece antes do bloqueio e ainda preserva a leitura do clip.',
        kind: 'weak',
        tone: 'warning',
        actionLabel: 'Ver Planos',
    },
    {
        id: 'exhausted-quota',
        title: 'Limite Free do mes atingido',
        body: 'Novos saves uteis ficam bloqueados; a verdade visivel do clip nao vira paywall.',
        kind: 'locked',
        tone: 'error',
        actionLabel: 'Entrar no Pro Founder',
    },
    {
        id: 'checkout-disabled',
        title: 'Checkout fechado no momento',
        body: 'Founder beta controlado, sem fingir disponibilidade quando o servidor nao permite checkout.',
        kind: 'locked',
        tone: 'warning',
        actionLabel: 'Testar Free com um clip',
    },
    {
        id: 'billing-active',
        title: 'Assinatura ativa',
        body: 'Acesso vem de webhook e billing confiavel, nao de URL de sucesso ou estado visual.',
        kind: 'empty',
        tone: 'success',
        actionLabel: 'Abrir Portal Stripe',
    },
    {
        id: 'billing-grace',
        title: 'Pagamento em graca',
        body: 'Pro continua temporariamente, mas a tela mostra que o billing precisa de atencao.',
        kind: 'weak',
        tone: 'warning',
        actionLabel: 'Abrir Portal Stripe',
    },
    {
        id: 'billing-canceled',
        title: 'Plano cancelado',
        body: 'Historico salvo fica preservado e o periodo aplicavel continua honesto.',
        kind: 'empty',
        tone: 'info',
        actionLabel: 'Ver Historico',
    },
    {
        id: 'billing-suspended',
        title: 'Acesso suspenso',
        body: 'Acesso pago bloqueado por revisao operacional, com caminho de suporte claro.',
        kind: 'error',
        tone: 'error',
        actionLabel: 'Falar com suporte',
    },
    {
        id: 'lock',
        title: 'Pro desbloqueia continuidade',
        body: 'Lock contextual explica valor Pro sem blur falso nem dados inventados.',
        kind: 'locked',
        tone: 'pro',
        actionLabel: 'Entrar no Pro Founder',
    },
    {
        id: 'weak-evidence',
        title: 'Evidencia fraca',
        body: 'Metrica forte fica visualmente rebaixada quando cobertura ou confianca nao sustentam decisao.',
        kind: 'weak',
        tone: 'warning',
        actionLabel: 'Gravar outro clip',
    },
    {
        id: 'inconclusive',
        title: 'Leitura inconclusiva',
        body: 'Explica blocker e pede captura melhor em vez de vender certeza que nao existe.',
        kind: 'inconclusive',
        tone: 'warning',
        actionLabel: 'Escolher clip de spray',
    },
    {
        id: 'empty',
        title: 'Nenhuma linha ativa ainda',
        body: 'Estado vazio aponta para o primeiro clip utilizavel e nao parece tela quebrada.',
        kind: 'empty',
        tone: 'info',
        actionLabel: 'Analisar meu spray',
    },
    {
        id: 'loading',
        title: 'Lendo frames no navegador',
        body: 'Loading mantem dimensoes estaveis e reforca browser-first.',
        kind: 'loading',
        tone: 'info',
        actionLabel: 'Aguardar leitura',
    },
    {
        id: 'error',
        title: 'Nao foi possivel concluir esta acao',
        body: 'Erro mostra recuperacao: revisar clip, recarregar ou usar historico/suporte.',
        kind: 'error',
        tone: 'error',
        actionLabel: 'Tentar de novo',
    },
];

const locks: readonly PremiumFeatureLock[] = [
    {
        featureKey: 'coach.full_plan',
        reason: 'pro_feature',
        title: 'Plano completo do coach',
        body: 'Free ve resumo testavel; Pro abre passos, criterios e validacao.',
        ctaHref: '/pricing',
    },
    {
        featureKey: 'trends.compatible_full',
        reason: 'not_enough_history',
        title: 'Trend compativel profundo',
        body: 'Historico ainda curto; Pro mostra continuidade quando existir evidencia suficiente.',
        ctaHref: '/pricing',
    },
    {
        featureKey: 'billing.portal_access',
        reason: 'payment_issue',
        title: 'Billing precisa de atencao',
        body: 'Portal Stripe resolve pagamento; estado visual sozinho nao reativa Pro.',
        ctaHref: '/billing',
    },
    {
        featureKey: 'metrics.advanced',
        reason: 'weak_evidence',
        title: 'Metricas avancadas bloqueadas',
        body: 'Evidencia fraca nao sustenta leitura agressiva; capture outro clip antes de aplicar mudanca forte.',
        ctaHref: null,
    },
];

const loopCases: readonly {
    readonly id: string;
    readonly stage: LoopStageKey;
    readonly blocked?: boolean;
    readonly evidenceLabel: string;
    readonly nextActionLabel: string;
}[] = [
    {
        id: 'clip',
        stage: 'clip',
        evidenceLabel: 'sem clip recente',
        nextActionLabel: 'Analisar meu spray',
    },
    {
        id: 'evidence',
        stage: 'evidence',
        evidenceLabel: '86% confianca / 84% cobertura',
        nextActionLabel: 'Gravar analise util',
    },
    {
        id: 'blocked',
        stage: 'validation',
        blocked: true,
        evidenceLabel: 'Evidencia fraca',
        nextActionLabel: 'Validar clip compativel',
    },
];

function renderAction(label: string): ReactNode {
    return (
        <a className="btn btn-secondary btn-sm" href="/pricing">
            {label}
        </a>
    );
}

export default function Phase7StateMatrixPage() {
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    return (
        <main style={pageStyle}>
            <div style={shellStyle}>
                <header style={panelStyle}>
                    <p className="badge badge-info">Phase 7 visual verification</p>
                    <h1 style={titleStyle}>Free, Pro, lock, evidence, billing, and error state matrix</h1>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                        Development-only matrix for No False Perfect evidence. It proves states render as product surfaces without fake certainty.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} aria-label="State matrix coverage">
                        <EvidenceChip label="States" value={String(stateCases.length)} tone="info" />
                        <EvidenceChip label="Locks" value={String(locks.length)} tone="pro" />
                        <EvidenceChip label="Truth" value="Partial allowed" tone="warning" />
                    </div>
                </header>

                <section aria-label="Loop state matrix" style={gridStyle}>
                    {loopCases.map((loopCase) => (
                        <article data-phase7-loop-state={loopCase.id} key={loopCase.id} style={panelStyle}>
                            <LoopRail
                                blocked={loopCase.blocked ?? false}
                                currentStage={loopCase.stage}
                                evidenceLabel={loopCase.evidenceLabel}
                                nextActionLabel={loopCase.nextActionLabel}
                            />
                        </article>
                    ))}
                </section>

                <section aria-label="Product state matrix" style={gridStyle}>
                    {stateCases.map((stateCase) => (
                        <article data-phase7-state-card={stateCase.id} key={stateCase.id}>
                            <ProductState
                                action={renderAction(stateCase.actionLabel)}
                                body={stateCase.body}
                                state={stateCase.kind}
                                title={stateCase.title}
                                tone={stateCase.tone}
                            />
                        </article>
                    ))}
                </section>

                <section aria-label="Lock preview matrix" style={gridStyle}>
                    {locks.map((lock) => (
                        <article data-phase7-lock-card={lock.reason} key={`${lock.featureKey}-${lock.reason}`}>
                            <ProLockPreview
                                currentValueLabel="Verdade visivel: confianca, cobertura e blockers"
                                lock={lock}
                                proValueLabel="Continuidade, historico profundo e validacao"
                            />
                        </article>
                    ))}
                </section>

                <section aria-label="Evidence metric stability" style={gridStyle}>
                    <MetricTile label="Confianca" value="86%" helper="Valor mono estavel." tone="info" />
                    <MetricTile label="Cobertura" value="84%" helper="Nunca some em lock." tone="success" />
                    <MetricTile label="Frames perdidos" value="2/42" helper="Visivel antes da recomendacao." tone="warning" />
                </section>
            </div>
        </main>
    );
}
