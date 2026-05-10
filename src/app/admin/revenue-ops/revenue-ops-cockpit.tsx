import Link from 'next/link';

import type { RevenueOpsLaunchGateEvaluation } from '@/core/revenue-ops-readiness';
import type {
    RevenueOpsDetailReason,
    RevenueOpsFunnelMetricKey,
    RevenueOpsLaunchBlocker,
    RevenueOpsOperationalStatus,
} from '@/types/revenue-ops';

import styles from './revenue-ops.module.css';

type ViewerRole = 'admin' | 'support' | 'mod';

interface MetricCard {
    readonly key: RevenueOpsFunnelMetricKey;
    readonly label: string;
    readonly count: number;
    readonly status: RevenueOpsOperationalStatus;
    readonly detail: string;
    readonly rate?: number | null;
    readonly reasonCodes?: readonly string[];
}

interface FunnelSnapshot {
    readonly generatedAt?: string;
    readonly metrics?: readonly MetricCard[];
    readonly conversion?: {
        readonly checkoutStartedToConfirmedRate?: number | null;
        readonly upgradeIntentToCheckoutRate?: number | null;
    };
    readonly breakdowns?: {
        readonly ignoredPassiveImpressions?: number;
        readonly churnStates?: Record<string, number>;
        readonly quotaStates?: Record<string, number>;
    };
    readonly privacy?: {
        readonly defaultMode?: 'aggregate_only';
        readonly userDetailRequiresReason?: true;
        readonly prohibitedInputFieldCount?: number;
    };
}

interface SupportCause {
    readonly code: string;
    readonly domain: string;
    readonly status: RevenueOpsOperationalStatus;
    readonly impact: string;
    readonly owner: RevenueOpsLaunchBlocker['owner'];
    readonly runbook: string;
    readonly nextSafeAction: string;
    readonly evidenceRefs?: readonly string[];
}

interface SupportDomain {
    readonly domain: string;
    readonly status: RevenueOpsOperationalStatus;
    readonly firstCause?: SupportCause | null;
    readonly impact: string;
    readonly owner: RevenueOpsLaunchBlocker['owner'];
    readonly runbook: string;
    readonly nextSafeAction: string;
}

interface SupportDetail {
    readonly user?: {
        readonly id?: string;
        readonly email?: string | null;
        readonly name?: string | null;
    };
    readonly diagnosis?: {
        readonly firstCause: SupportCause;
        readonly domains: readonly SupportDomain[];
        readonly safeSummary: string;
    };
}

export interface RevenueOpsCockpitSnapshot {
    readonly viewerRole?: ViewerRole;
    readonly rangeDays?: number;
    readonly aggregateOnly?: boolean;
    readonly funnel?: FunnelSnapshot;
}

export interface RevenueOpsSupportSnapshot {
    readonly detailReason?: RevenueOpsDetailReason;
    readonly detail?: SupportDetail | null;
}

export interface RevenueOpsCockpitProps {
    readonly contractCopy: {
        readonly noGoLabels: readonly [string, string, string, string, string, string];
        readonly serverTruth: string;
    };
    readonly snapshot: RevenueOpsCockpitSnapshot;
    readonly supportSnapshot: RevenueOpsSupportSnapshot | null;
    readonly launchReadiness: RevenueOpsLaunchGateEvaluation;
}

const keyMetrics: readonly RevenueOpsFunnelMetricKey[] = [
    'first_usable_analysis',
    'upgrade_intent',
    'checkout_started',
    'checkout_confirmed',
    'pro_active',
    'quota_limit_hit',
];

const fallbackMetric: MetricCard = {
    key: 'first_usable_analysis',
    label: 'Sem dados',
    count: 0,
    status: 'WARN',
    detail: 'Nenhum evento agregado encontrado para este periodo.',
};

function metricFor(snapshot: RevenueOpsCockpitSnapshot, key: RevenueOpsFunnelMetricKey): MetricCard {
    return snapshot.funnel?.metrics?.find((metric) => metric.key === key)
        ?? { ...fallbackMetric, key, label: key.replaceAll('_', ' ') };
}

function statusClass(status: RevenueOpsOperationalStatus): string {
    switch (status) {
        case 'PASS':
            return styles.statusPass ?? '';
        case 'WARN':
            return styles.statusWarn ?? '';
        case 'BLOCKED':
            return styles.statusBlocked ?? '';
        case 'NO-GO':
            return styles.statusNoGo ?? '';
        case 'FAIL':
            return styles.statusFail ?? '';
    }
}

function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return 'sem base';
    }

    return `${Math.round(value * 100)}%`;
}

function formatGeneratedAt(value: string | undefined): string {
    if (!value) {
        return 'agora';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function primaryBlocker(readiness: RevenueOpsLaunchGateEvaluation): RevenueOpsLaunchBlocker {
    return readiness.publicPaidLaunch.blockers[0]
        ?? readiness.founderBetaLaunch.blockers[0]
        ?? readiness.safeDegradation.blocker
        ?? {
            id: 'launch.pass',
            status: 'PASS',
            blocker: 'Nenhum bloqueio ativo nas evidencias carregadas.',
            impact: 'O cockpit nao detectou blocker a partir da matriz recebida.',
            owner: 'ops',
            runbook: 'docs/revenue-ops-launch-readiness.md',
            missingEvidence: 'None',
            smallestNextStep: 'Manter as linhas de evidencia datadas e verificaveis.',
        };
}

function overallStatus(readiness: RevenueOpsLaunchGateEvaluation): RevenueOpsOperationalStatus {
    if (readiness.publicPaidLaunch.status === 'PASS' && readiness.founderBetaLaunch.status === 'PASS') {
        return 'PASS';
    }

    if (readiness.publicPaidLaunch.status === 'FAIL' || readiness.founderBetaLaunch.status === 'FAIL') {
        return 'FAIL';
    }

    if (readiness.publicPaidLaunch.status === 'NO-GO' || readiness.founderBetaLaunch.status === 'NO-GO') {
        return 'NO-GO';
    }

    if (readiness.publicPaidLaunch.status === 'BLOCKED' || readiness.founderBetaLaunch.status === 'BLOCKED') {
        return 'BLOCKED';
    }

    return 'WARN';
}

function StatusBadge({ status }: { readonly status: RevenueOpsOperationalStatus }): React.JSX.Element {
    return <span className={`${styles.statusBadge} ${statusClass(status)}`}>{status}</span>;
}

export function RevenueOpsCockpit({
    contractCopy,
    launchReadiness,
    snapshot,
    supportSnapshot,
}: RevenueOpsCockpitProps): React.JSX.Element {
    const blocker = primaryBlocker(launchReadiness);
    const status = overallStatus(launchReadiness);
    const highestBlockers = [
        ...launchReadiness.publicPaidLaunch.blockers,
        ...launchReadiness.founderBetaLaunch.blockers,
        ...(launchReadiness.safeDegradation.blocker ? [launchReadiness.safeDegradation.blocker] : []),
    ].slice(0, 3);
    const supportDetail = supportSnapshot?.detail ?? null;
    const supportCause = supportDetail?.diagnosis?.firstCause ?? null;
    const generatedAt = formatGeneratedAt(snapshot.funnel?.generatedAt);
    const rangeDays = snapshot.rangeDays ?? 30;

    return (
        <div className={styles.cockpit} data-server-truth={contractCopy.serverTruth}>
            <section className={styles.firstFold} aria-label="Resumo de lancamento Revenue Ops">
                <div className={styles.launchDecision}>
                    <div>
                        <span className={styles.sectionKicker}>Launch decision</span>
                        <h2>Launch state: {status}</h2>
                        <p>
                            A tela abre com a decisao operacional antes de qualquer grafico. Stripe,
                            webhook, subscription e resolver server continuam sendo a verdade de acesso Pro.
                        </p>
                    </div>
                    <div className={styles.gateGrid}>
                        <div className={styles.gateTile}>
                            <span>Overall</span>
                            <StatusBadge status={status} />
                        </div>
                        <div className={styles.gateTile}>
                            <span>Founder/Beta</span>
                            <StatusBadge status={launchReadiness.founderBetaLaunch.status} />
                        </div>
                        <div className={styles.gateTile}>
                            <span>Public paid</span>
                            <StatusBadge status={launchReadiness.publicPaidLaunch.status} />
                        </div>
                    </div>
                    {highestBlockers.length > 0 ? (
                        <div className={styles.blockerList} aria-label="Highest blockers">
                            <span>Highest blockers</span>
                            {highestBlockers.map((item) => (
                                <div className={styles.blockerListItem} key={item.id}>
                                    <StatusBadge status={item.status} />
                                    <p>{item.blocker}</p>
                                    <small>{item.owner} / {item.smallestNextStep}</small>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className={styles.blockerPanel}>
                    <div className={styles.blockerHeader}>
                        <StatusBadge status={blocker.status} />
                        <strong>{blocker.blocker}</strong>
                    </div>
                    <dl className={styles.blockerGrid}>
                        <div>
                            <dt>{contractCopy.noGoLabels[0]}</dt>
                            <dd>{blocker.id}</dd>
                        </div>
                        <div>
                            <dt>{contractCopy.noGoLabels[1]}</dt>
                            <dd>{blocker.impact}</dd>
                        </div>
                        <div>
                            <dt>{contractCopy.noGoLabels[2]}</dt>
                            <dd>{blocker.owner}</dd>
                        </div>
                        <div>
                            <dt>{contractCopy.noGoLabels[3]}</dt>
                            <dd>{blocker.runbook}</dd>
                        </div>
                        <div>
                            <dt>{contractCopy.noGoLabels[4]}</dt>
                            <dd>{blocker.missingEvidence}</dd>
                        </div>
                        <div>
                            <dt>{contractCopy.noGoLabels[5]}</dt>
                            <dd>{blocker.smallestNextStep}</dd>
                        </div>
                    </dl>
                </div>

                <div className={styles.metricRail} aria-label="Funil essencial agregado">
                    {keyMetrics.map((key) => {
                        const metric = metricFor(snapshot, key);

                        return (
                            <div className={styles.metricTile} key={key}>
                                <span>{metric.label}</span>
                                <strong>{metric.count}</strong>
                                <StatusBadge status={metric.status} />
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className={styles.infoBand} aria-label="Contexto operacional">
                <div>
                    <span>Periodo</span>
                    <strong>{rangeDays} dias</strong>
                    <p>Snapshot agregado gerado em {generatedAt}.</p>
                </div>
                <div>
                    <span>Privacidade</span>
                    <strong>{snapshot.funnel?.privacy?.defaultMode ?? 'aggregate_only'}</strong>
                    <p>Detalhe de usuario exige motivo operacional aprovado.</p>
                </div>
                <div>
                    <span>Conversao</span>
                    <strong>{formatPercent(snapshot.funnel?.conversion?.upgradeIntentToCheckoutRate)}</strong>
                    <p>Intencao para checkout, sem contar impressoes passivas.</p>
                </div>
            </section>

            <section className={styles.supportPreview} aria-label="Diagnostico de suporte Revenue Ops">
                <div>
                    <span className={styles.sectionKicker}>Support diagnosis</span>
                    <h2>{supportCause ? supportCause.code : 'Detalhe por usuario fechado por padrao'}</h2>
                    <p>
                        {supportCause
                            ? supportCause.nextSafeAction
                            : 'Abra detalhe somente com support_case, webhook_failure, quota_issue, entitlement_mismatch, payment_issue, auth_issue, analysis_save_issue, admin_grant_review ou reconciliation_request.'}
                    </p>
                </div>
                {supportDetail?.user?.id ? (
                    <Link href={`/admin/billing?userId=${supportDetail.user.id}`} className={styles.inlineLink}>
                        Abrir billing com motivo registrado
                    </Link>
                ) : (
                    <Link href="/admin/billing" className={styles.inlineLink}>
                        Abrir suporte de billing
                    </Link>
                )}
            </section>
        </div>
    );
}
