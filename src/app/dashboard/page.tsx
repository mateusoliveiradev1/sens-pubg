import Link from 'next/link';

import {
    getDashboardStats,
    type DashboardStats,
    type DashboardTrendEvidenceState,
} from '@/actions/dashboard';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';
import { LoopRail, type LoopStageKey } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import { WeaponIcon } from '@/ui/components/weapon-icon';

import { buildDashboardTruthViewModel, type DashboardTruthViewModel } from './dashboard-truth-view-model';
import { TrendChart } from './trend-chart';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ScoreTone {
    readonly textClass: string;
    readonly borderClass: string;
    readonly badgeClass: string;
    readonly barClass: string;
    readonly glowClass: string;
    readonly label: string;
}

interface RankedWeapon {
    readonly weaponId: string;
    readonly displayName: string;
    readonly category: string;
    readonly avgScore: number;
    readonly count: number;
    readonly share: number;
    readonly tone: ScoreTone;
}

interface DashboardPrimaryAction {
    readonly label: string;
    readonly href: string;
    readonly disabled?: boolean;
}

interface DashboardEvidenceItem {
    readonly label: string;
    readonly value?: string;
    readonly tone?: EvidenceTone;
    readonly detail?: string;
}

function clampPercent(value: number): number {
    return Math.max(4, Math.min(100, Math.round(value)));
}

function formatSignedPoints(value: number): string {
    if (value > 0) {
        return `+${value} pts`;
    }

    if (value < 0) {
        return `${value} pts`;
    }

    return '0 pts';
}

function formatDateLabel(date: string | Date): string {
    return new Date(date).toLocaleDateString('pt-BR');
}

function formatWeaponDisplayName(weaponName: string, weaponId: string): string {
    const raw = weaponName && !UUID_PATTERN.test(weaponName) ? weaponName : weaponId;

    if (!raw || UUID_PATTERN.test(raw)) {
        return 'Perfil interno';
    }

    return raw
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((chunk) => {
            if (chunk.length <= 4 || /\d/.test(chunk)) {
                return chunk.toUpperCase();
            }

            return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
        })
        .join(' ');
}

function formatWeaponCategory(category: string | null): string {
    return category ? category.toUpperCase() : 'SEM CATEGORIA';
}

function getScoreTone(score: number): ScoreTone {
    if (score >= 60) {
        return {
            textClass: 'text-emerald-400',
            borderClass: 'border-emerald-500/20',
            badgeClass: 'badge badge-success',
            barClass: 'bg-emerald-500',
            glowClass: 'shadow-[0_0_35px_rgba(16,185,129,0.08)]',
            label: 'forte',
        };
    }

    if (score >= 30) {
        return {
            textClass: 'text-cyan-400',
            borderClass: 'border-cyan-500/20',
            badgeClass: 'badge badge-info',
            barClass: 'bg-cyan-500',
            glowClass: 'shadow-[0_0_35px_rgba(6,182,212,0.08)]',
            label: 'em progresso',
        };
    }

    return {
        textClass: 'text-orange-400',
        borderClass: 'border-orange-500/20',
        badgeClass: 'badge badge-warning',
        barClass: 'bg-orange-500',
        glowClass: 'shadow-[0_0_35px_rgba(249,115,22,0.08)]',
        label: 'pedindo ajuste',
    };
}

function getEvidenceTone(state: DashboardTrendEvidenceState): EvidenceTone {
    switch (state) {
        case 'strong':
            return 'success';
        case 'moderate':
            return 'info';
        case 'weak':
        case 'missing':
            return 'warning';
    }
}

function getMetricTone(score: number): EvidenceTone {
    if (score >= 60) {
        return 'success';
    }

    if (score >= 30) {
        return 'info';
    }

    return 'warning';
}

function isPrecisionValidationRoute(stats: DashboardStats): boolean {
    const trend = stats.principalPrecisionTrend;

    if (!trend) {
        return false;
    }

    switch (trend.label) {
        case 'baseline':
        case 'initial_signal':
        case 'in_validation':
        case 'oscillation':
        case 'not_comparable':
        case 'validated_regression':
            return true;
        case 'validated_progress':
        case 'consolidated':
            return false;
    }
}

function getDashboardBlockerCount(stats: DashboardStats): number {
    return (stats.latestMastery?.blockedRecommendations.length ?? 0)
        + (stats.principalPrecisionTrend?.blockerReasons.length ?? 0)
        + (stats.activeCoachLoop?.status === 'conflict' ? 1 : 0);
}

function isDashboardBlocked(stats: DashboardStats): boolean {
    const actionState = stats.latestMastery?.actionState;

    return actionState === 'capture_again'
        || actionState === 'inconclusive'
        || stats.trendEvidence.evidenceState === 'weak'
        || stats.trendEvidence.evidenceState === 'missing'
        || stats.principalPrecisionTrend?.label === 'not_comparable'
        || getDashboardBlockerCount(stats) > 0
        || stats.activeCoachLoop?.status === 'conflict';
}

function resolveDashboardPrimaryAction(
    stats: DashboardStats,
    truthView: DashboardTruthViewModel,
): DashboardPrimaryAction {
    if (truthView.activeCoachLoop) {
        return {
            label: truthView.activeCoachLoop.ctaLabel,
            href: truthView.activeCoachLoop.ctaHref,
        };
    }

    switch (stats.latestMastery?.actionState) {
        case undefined:
            return { label: 'Gravar clip comparavel', href: '/analyze' };
        case 'capture_again':
            return { label: 'Recapturar clip', href: '/analyze' };
        case 'inconclusive':
            return { label: 'Validar com novo clip', href: '/analyze' };
        case 'ready':
        case 'testable':
            break;
    }

    if (isPrecisionValidationRoute(stats)) {
        return { label: truthView.nextActionTitle, href: '/analyze' };
    }

    if (stats.trendEvidence.evidenceState === 'weak' || stats.trendEvidence.evidenceState === 'missing') {
        return { label: 'Validar com novo clip', href: '/analyze' };
    }

    if (truthView.nextBlock) {
        return { label: 'Abrir bloco no historico', href: '/history' };
    }

    return { label: 'Analisar novo clip', href: '/analyze' };
}

function resolveDashboardLoopStage(
    stats: DashboardStats,
    truthView: DashboardTruthViewModel,
): LoopStageKey {
    if (!stats.latestMastery) {
        return 'clip';
    }

    if (truthView.activeCoachLoop?.status === 'conflict' || truthView.activeCoachLoop?.status === 'validation_needed') {
        return 'validation';
    }

    if (truthView.activeCoachLoop) {
        return 'outcome';
    }

    if (stats.latestMastery.actionState === 'capture_again') {
        return 'clip';
    }

    if (stats.latestMastery.actionState === 'inconclusive') {
        return 'validation';
    }

    if (isPrecisionValidationRoute(stats)) {
        return 'validation';
    }

    if (stats.trendEvidence.evidenceState === 'weak' || stats.trendEvidence.evidenceState === 'missing') {
        return 'validation';
    }

    if (stats.principalPrecisionTrend?.label === 'validated_progress' || stats.principalPrecisionTrend?.label === 'consolidated') {
        return 'checkpoint';
    }

    if (truthView.nextBlock) {
        return 'block';
    }

    return 'evidence';
}

function getMomentumTone(delta: number): {
    readonly title: string;
    readonly textClass: string;
    readonly badgeClass: string;
    readonly description: string;
} {
    if (delta >= 10) {
        return {
            title: 'Subindo forte',
            textClass: 'text-emerald-400',
            badgeClass: 'badge badge-success',
            description: 'Sua média recente ganhou tração real. Vale consolidar sem trocar muita variável ao mesmo tempo.',
        };
    }

    if (delta > 0) {
        return {
            title: 'Subindo com cautela',
            textClass: 'text-cyan-400',
            badgeClass: 'badge badge-info',
            description: 'A curva está viva, mas ainda pede repetição para virar padrão estável.',
        };
    }

    if (delta < 0) {
        return {
            title: 'Oscilando',
            textClass: 'text-orange-400',
            badgeClass: 'badge badge-warning',
            description: 'A linha perdeu força na janela recente. O próximo clip deve atacar consistência antes de buscar pico.',
        };
    }

    return {
        title: 'Estável',
        textClass: 'text-zinc-200',
        badgeClass: 'badge badge-info',
        description: 'Seu painel está lateralizado. Agora a diferença vem de qualidade de execução, não de volume.',
    };
}

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function getPositiveStreak(data: { avgScore: number }[]): number {
    if (data.length <= 1) {
        return data.length;
    }

    let streak = 1;

    for (let index = data.length - 1; index > 0; index -= 1) {
        if (data[index]!.avgScore >= data[index - 1]!.avgScore) {
            streak += 1;
            continue;
        }

        break;
    }

    return streak;
}

export default async function DashboardPage() {
    const stats = await getDashboardStats();

    if (!stats || stats.totalSessions === 0) {
        const emptyPrimaryAction: DashboardPrimaryAction = {
            label: 'Analisar meu spray',
            href: '/analyze',
        };

        return (
            <div className="min-h-screen bg-[#08080c] text-white">
                <Header />

                <main className="page">
                    <div className="container" style={{ maxWidth: '1280px' }}>
                        <PageCommandHeader
                            body="Envie um clip utilizavel para criar a primeira leitura com confianca, cobertura e um proximo bloco testavel."
                            evidenceItems={[
                                { label: 'Estado', value: 'Sem leitura recente', tone: 'warning' },
                                { label: 'Loop', value: 'Clip', tone: 'info' },
                                { label: 'Proxima acao', value: emptyPrimaryAction.label, tone: 'info' },
                            ]}
                            primaryAction={emptyPrimaryAction}
                            roleLabel="Command center"
                            title="Nenhuma linha ativa ainda"
                        />
                        <div className="mt-6">
                            <LoopRail
                                blocked
                                currentStage="clip"
                                evidenceLabel="Sem evidencia recente"
                                nextActionLabel={emptyPrimaryAction.label}
                            />
                        </div>
                        <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Estado inicial do dashboard">
                            <MetricTile
                                helper="Crie a primeira leitura antes de abrir tendencia ou coach."
                                label="Sessoes"
                                tone="warning"
                                value="0"
                            />
                            <MetricTile
                                helper="A dashboard so compara clips quando existe contexto utilizavel."
                                label="Evidencia"
                                tone="warning"
                                value="Aguardando"
                            />
                            <MetricTile
                                helper="O historico entra depois da primeira analise salva."
                                label="Historico"
                                tone="info"
                                value="Vazio"
                            />
                        </section>
                    </div>
                </main>
            </div>
        );
    }

    const firstTrend = stats.weeklyTrend[0];
    const latestTrend = stats.weeklyTrend.at(-1);
    const latestAverage = latestTrend?.avgScore ?? stats.avgSprayScore;
    const latestPeak = latestTrend?.peakScore ?? stats.bestSprayScore;
    const trendDelta = firstTrend && latestTrend
        ? latestTrend.avgScore - firstTrend.avgScore
        : stats.lastSessionDelta;
    const peakDelta = firstTrend && latestTrend
        ? latestTrend.peakScore - firstTrend.peakScore
        : 0;
    const streak = getPositiveStreak(stats.weeklyTrend);
    const consistencyGap = Math.max(stats.bestSprayScore - stats.avgSprayScore, 0);
    const momentum = getMomentumTone(trendDelta);
    const lastCheckpointLabel = latestTrend ? formatDateLabel(latestTrend.date) : new Date().toLocaleDateString('pt-BR');

    const rankedWeapons: RankedWeapon[] = stats.weaponStats.map((weapon) => ({
        weaponId: weapon.weaponId,
        displayName: formatWeaponDisplayName(weapon.weaponName, weapon.weaponId),
        category: formatWeaponCategory(weapon.weaponCategory),
        avgScore: weapon.avgScore,
        count: weapon.count,
        share: Math.max(1, Math.round((weapon.count / Math.max(stats.totalSessions, 1)) * 100)),
        tone: getScoreTone(weapon.avgScore),
    }));

    const bestWeapon = rankedWeapons[0] ?? null;
    const weakestWeapon = rankedWeapons.length > 0
        ? [...rankedWeapons].sort((left, right) => left.avgScore - right.avgScore)[0]!
        : null;
    const truthView = buildDashboardTruthViewModel(stats);
    const latestMastery = stats.latestMastery;
    const nextActionTitle = truthView.nextActionTitle;
    const nextActionBody = truthView.nextActionBody;
    const activeCoachLoop = truthView.activeCoachLoop;
    const dashboardPrimaryAction = resolveDashboardPrimaryAction(stats, truthView);
    const dashboardLoopStage = resolveDashboardLoopStage(stats, truthView);
    const dashboardBlocked = isDashboardBlocked(stats);
    const dashboardEvidenceTone = getEvidenceTone(truthView.evidenceState);
    const dashboardBlockerCount = getDashboardBlockerCount(stats);
    const dashboardEvidenceItems: DashboardEvidenceItem[] = [
        {
            label: 'Acao atual',
            value: latestMastery?.actionLabel ?? 'Gravar clip',
            tone: dashboardBlocked ? 'warning' : 'info',
        },
        {
            label: 'Confianca',
            value: latestMastery ? formatPercent(latestMastery.evidence.confidence) : truthView.evidenceLabel,
            tone: dashboardEvidenceTone,
        },
        {
            label: 'Cobertura',
            value: latestMastery ? formatPercent(latestMastery.evidence.coverage) : 'aguardando',
            tone: dashboardEvidenceTone,
        },
        {
            label: 'Bloqueadores',
            value: String(dashboardBlockerCount),
            tone: dashboardBlockerCount > 0 ? 'warning' : 'success',
        },
        {
            label: 'Trend',
            value: truthView.precisionTrendLabel ?? truthView.trendTitle,
            tone: dashboardBlocked ? 'warning' : dashboardEvidenceTone,
        },
    ];

    const heroSummary = bestWeapon
        ? `Sua media operacional fechou em ${latestAverage}% na ultima leitura, com pico recente de ${latestPeak}%. ${bestWeapon.displayName} e hoje a arma que melhor converte suas sessoes em resultado; a tendencia atual e ${truthView.trendTitle.toLowerCase()}.`
        : `Sua media operacional fechou em ${latestAverage}% na ultima leitura, com pico recente de ${latestPeak}%. A tendencia atual e ${truthView.trendTitle.toLowerCase()} e ainda ha ${consistencyGap} pts de folga ate seu topo historico.`;

    return (
        <div className="min-h-screen bg-[#08080c] text-white">
            <Header />

            <main className="page">
                <div className="container" style={{ maxWidth: '1380px' }}>
                    <PageCommandHeader
                        body={`${nextActionTitle}. ${nextActionBody}`}
                        evidenceItems={dashboardEvidenceItems}
                        primaryAction={dashboardPrimaryAction}
                        roleLabel="Command center"
                        title="Dashboard de performance"
                    />
                    <div className="mb-8 mt-6">
                        <LoopRail
                            blocked={dashboardBlocked}
                            currentStage={dashboardLoopStage}
                            evidenceLabel={truthView.evidenceLabel}
                            nextActionLabel={dashboardPrimaryAction.label}
                        />
                    </div>

                    <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.85fr)]">
                        <div className="glass-card relative overflow-hidden border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_32%),rgba(9,9,12,0.92)] p-0">
                            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-orange-500/60 to-transparent" />
                            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_28%,transparent_72%,rgba(255,255,255,0.04))]" />
                            <div className="relative p-8 md:p-10">
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <span className="badge badge-info">Painel tatico</span>
                                    <span className="badge badge-info">Janela 30 dias</span>
                                    <span className="badge badge-info">Ultimo checkpoint {lastCheckpointLabel}</span>
                                    {truthView.precisionTrendLabel ? (
                                        <span className="badge badge-info">Trend principal: {truthView.precisionTrendLabel}</span>
                                    ) : null}
                                </div>

                                <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-400">
                                    Telemetria de combate // leitura continua
                                </p>
                                <h2 className="max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                                    Dashboard de performance
                                </h2>
                                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">
                                    {heroSummary}
                                </p>

                                <div className="mt-8 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                                        <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                                            Momento
                                        </span>
                                        <strong className={`block text-2xl font-black ${momentum.textClass}`}>{truthView.trendTitle}</strong>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{truthView.trendBody}</p>
                                    </div>

                                    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                                        <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                                            Ritmo 30d
                                        </span>
                                        <strong className={`block text-2xl font-black ${trendDelta >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                            {formatSignedPoints(trendDelta)}
                                        </strong>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                                            Sua media saiu de {firstTrend?.avgScore ?? stats.avgSprayScore}% para {latestAverage}% dentro da janela exibida.
                                        </p>
                                    </div>

                                    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                                        <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                                            Gap ate o pico
                                        </span>
                                        <strong className="block text-2xl font-black text-zinc-100">{consistencyGap} pts</strong>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                                            Essa e a distancia entre sua media operacional e o teto historico de {stats.bestSprayScore}%.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Link href={dashboardPrimaryAction.href} className="btn btn-primary">
                                        {dashboardPrimaryAction.label}
                                    </Link>
                                    <Link href="/history" className="btn btn-secondary">
                                        Abrir historico
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <div className="glass-card border border-zinc-800/80 bg-black/30 p-7">
                                <span className="mb-3 block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                                    Leitura de agora
                                </span>
                                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <strong className={`block text-4xl font-black leading-none ${getScoreTone(latestMastery?.actionableScore ?? latestAverage).textClass}`}>
                                            {truthView.scoreLabel}
                                        </strong>
                                        <p className="mt-2 text-sm text-zinc-500">
                                            {latestMastery
                                                ? `${latestMastery.mechanicalLevelLabel} mecanico, ${latestMastery.mechanicalScore}/100 mecanica`
                                                : 'score medio do ultimo checkpoint'}
                                        </p>
                                    </div>
                                    <span className={momentum.badgeClass}>{truthView.truthBadgeLabel}</span>
                                </div>
                                <div className="flex flex-wrap gap-2" aria-label="Evidencia atual do dashboard">
                                    {dashboardEvidenceItems.map((item) => {
                                        const chipProps = {
                                            ...(item.value ? { value: item.value } : {}),
                                            ...(item.detail ? { detail: item.detail } : {}),
                                        };

                                        return (
                                            <EvidenceChip
                                                key={`${item.label}:${item.value ?? ''}`}
                                                label={item.label}
                                                tone={item.tone ?? 'info'}
                                                {...chipProps}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="glass-card border border-zinc-800/80 bg-black/30 p-7">
                                <span className="mb-3 block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                                    Proximo passo
                                </span>
                                <h2 className="text-2xl font-black uppercase tracking-tight">{nextActionTitle}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                                    {nextActionBody}
                                </p>
                                {activeCoachLoop ? (
                                    <div className={`mt-5 rounded-[18px] border p-4 ${activeCoachLoop.status === 'conflict' ? 'border-amber-400/30 bg-amber-400/10' : 'border-cyan-400/20 bg-cyan-400/10'}`}>
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className={activeCoachLoop.status === 'conflict' ? 'badge badge-warning' : 'badge badge-info'}>
                                                Loop ativo: {activeCoachLoop.statusLabel}
                                            </span>
                                            <span className="badge badge-info">{activeCoachLoop.primaryFocusTitle}</span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-zinc-400">
                                            {activeCoachLoop.nextBlockTitle}. {activeCoachLoop.memorySummary ?? 'Memoria do coach em formacao.'}
                                        </p>
                                    </div>
                                ) : null}
                                {truthView.nextBlock ? (
                                    <div className="mt-5 rounded-[18px] border border-white/8 bg-zinc-950/60 p-4">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="badge badge-info">{truthView.nextBlock.durationLabel}</span>
                                            <span className="badge badge-info">{truthView.evidenceLabel}</span>
                                        </div>
                                        <ol className="space-y-2 pl-4 text-sm leading-relaxed text-zinc-400">
                                            {truthView.nextBlock.steps.map((step) => (
                                                <li key={step}>{step}</li>
                                            ))}
                                        </ol>
                                        {truthView.nextBlock.validation ? (
                                            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                                                Validacao: {truthView.nextBlock.validation}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Link href={dashboardPrimaryAction.href} className="btn btn-primary">
                                        {dashboardPrimaryAction.label}
                                    </Link>
                                    <Link href="/history" className="btn btn-ghost">
                                        Ver sessoes
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        <MetricTile
                            helper={`${rankedWeapons.length} armas com historico na base atual.`}
                            label="Sessoes mapeadas"
                            tone={getMetricTone(Math.min(100, stats.totalSessions * 3))}
                            value={String(stats.totalSessions)}
                        />
                        <MetricTile
                            helper={`${formatSignedPoints(stats.lastSessionDelta)} vs anterior, com leitura condicionada por evidencia.`}
                            label="Media de spray"
                            tone={getMetricTone(stats.avgSprayScore)}
                            value={`${stats.avgSprayScore}%`}
                        />
                        <MetricTile
                            helper={`Topo registrado: ${stats.bestStabilityScore}%.`}
                            label="Estabilidade base"
                            tone={getMetricTone(stats.avgStabilityScore)}
                            value={`${stats.avgStabilityScore}%`}
                        />
                        <MetricTile
                            helper={`${consistencyGap} pts de distancia entre media e teto historico.`}
                            label="Pico historico"
                            tone={getMetricTone(stats.bestSprayScore)}
                            value={`${stats.bestSprayScore}%`}
                        />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
                        <div className="glass-card border border-zinc-800/80 bg-black/30 p-7 md:p-8">
                            <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                                        Tendencia operacional
                                    </p>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">Ritmo recente</h2>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                                        {truthView.trendBody}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="badge badge-info">30 dias</span>
                                    <span className="badge badge-info">Ultima leitura {lastCheckpointLabel}</span>
                                    <span className="badge badge-info">{truthView.evidenceLabel}</span>
                                    {truthView.precisionTrendSummary ? (
                                        <span className="badge badge-info">{truthView.precisionTrendSummary}</span>
                                    ) : null}
                                    <span className={trendDelta >= 0 ? 'badge badge-success' : 'badge badge-warning'}>
                                        {formatSignedPoints(trendDelta)} na media
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6 grid gap-3 md:grid-cols-3">
                                <div className="rounded-[20px] border border-white/6 bg-zinc-950/60 p-4">
                                    <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.26em] text-zinc-500">
                                        Ultima media
                                    </span>
                                    <strong className={`block text-2xl font-black ${getScoreTone(latestAverage).textClass}`}>
                                        {latestAverage}%
                                    </strong>
                                </div>
                                <div className="rounded-[20px] border border-white/6 bg-zinc-950/60 p-4">
                                    <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.26em] text-zinc-500">
                                        Ultimo pico
                                    </span>
                                    <strong className="block text-2xl font-black text-orange-400">{latestPeak}%</strong>
                                </div>
                                <div className="rounded-[20px] border border-white/6 bg-zinc-950/60 p-4">
                                    <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.26em] text-zinc-500">
                                        Sequencia
                                    </span>
                                    <strong className="block text-2xl font-black text-cyan-400">{streak} checkpoints</strong>
                                </div>
                            </div>

                            <div className="h-[340px]">
                                {stats.weeklyTrend.length > 0 ? (
                                    <TrendChart data={stats.weeklyTrend} />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-zinc-800 bg-zinc-950/50">
                                        <div className="text-4xl opacity-20">[]</div>
                                        <p className="max-w-sm text-center font-mono text-xs text-zinc-500">
                                            Faca mais analises para abrir uma curva que conte historia de verdade.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 grid gap-3 md:grid-cols-3">
                                <div className="rounded-[20px] border border-white/6 bg-zinc-950/60 p-4">
                                    <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.26em] text-zinc-500">
                                        Tracao
                                    </span>
                                    <p className="text-sm leading-relaxed text-zinc-400">
                                        {truthView.trendTitle}: {truthView.evidenceSummary}
                                    </p>
                                </div>
                                <div className="rounded-[20px] border border-white/6 bg-zinc-950/60 p-4">
                                    <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.26em] text-zinc-500">
                                        Pico da janela
                                    </span>
                                    <p className="text-sm leading-relaxed text-zinc-400">
                                        O pico recente variou {formatSignedPoints(peakDelta)} frente ao inicio do periodo; use junto da evidencia antes de tratar como progresso.
                                    </p>
                                </div>
                                <div className="rounded-[20px] border border-white/6 bg-zinc-950/60 p-4">
                                    <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.26em] text-zinc-500">
                                        Consistencia
                                    </span>
                                    <p className="text-sm leading-relaxed text-zinc-400">
                                        Ainda faltam {consistencyGap} pts para sua media encostar no melhor teto que voce ja mostrou.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card border border-zinc-800/80 bg-black/30 p-7 md:p-8">
                            <div className="mb-6 flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-6">
                                <div>
                                    <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                                        Arsenal prioritario
                                    </p>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">Arsenal</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                                        {truthView.arsenalFocus?.body ?? 'Aqui fica claro qual arma sustenta sua curva e qual arma ainda esta cobrando caro da sua media.'}
                                    </p>
                                </div>
                                <Link href="/history" className="btn btn-ghost">
                                    Ver sessoes
                                </Link>
                            </div>

                            {bestWeapon ? (
                                <>
                                    <div className={`rounded-[28px] border ${bestWeapon.tone.borderClass} ${bestWeapon.tone.glowClass} bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="rounded-[20px] border border-white/8 bg-black/35 p-3">
                                                    <WeaponIcon
                                                        category={bestWeapon.category}
                                                        framed={false}
                                                        showStatus
                                                        size={42}
                                                        weaponId={bestWeapon.weaponId}
                                                        weaponName={bestWeapon.displayName}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                                                        Arma lider
                                                    </p>
                                                    <h3 className="truncate text-2xl font-black uppercase italic tracking-tight">
                                                        {bestWeapon.displayName}
                                                    </h3>
                                                    <p className="mt-2 text-xs text-zinc-500">
                                                        {bestWeapon.category} • {bestWeapon.count} sessoes • {bestWeapon.share}% do volume analisado
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-4xl font-black ${bestWeapon.tone.textClass}`}>
                                                    {bestWeapon.avgScore}%
                                                </div>
                                                <span className={bestWeapon.tone.badgeClass}>{bestWeapon.tone.label}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {weakestWeapon && weakestWeapon.weaponId !== bestWeapon.weaponId ? (
                                        <div className="mt-4 rounded-[22px] border border-orange-500/15 bg-orange-500/[0.05] p-4">
                                            <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.26em] text-orange-300">
                                                Ponto de atencao
                                            </p>
                                            <p className="text-sm leading-relaxed text-zinc-300">
                                                {weakestWeapon.displayName} esta em {weakestWeapon.avgScore}% e hoje e o elo mais caro da sua media.
                                                Se voce quer ganho rapido, comece por ela.
                                            </p>
                                        </div>
                                    ) : null}

                                    <div className="mt-6 space-y-4">
                                        {rankedWeapons.slice(0, 5).map((weapon, index) => (
                                            <div key={weapon.weaponId} className="rounded-[22px] border border-white/6 bg-zinc-950/60 p-4">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <span className="w-6 text-center font-mono text-xs text-zinc-500">
                                                            {String(index + 1).padStart(2, '0')}
                                                        </span>
                                                        <WeaponIcon
                                                            category={weapon.category}
                                                            framed={false}
                                                            showStatus
                                                            size={28}
                                                            weaponId={weapon.weaponId}
                                                            weaponName={weapon.displayName}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-black uppercase tracking-wide">
                                                                {weapon.displayName}
                                                            </div>
                                                            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                                                                {weapon.category} • {weapon.count} sessoes • {weapon.share}% share
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`text-right text-xl font-black ${weapon.tone.textClass}`}>
                                                        {weapon.avgScore}%
                                                    </div>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                                                    <div
                                                        className={`h-full rounded-full ${weapon.tone.barClass}`}
                                                        style={{ width: `${clampPercent(weapon.avgScore)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-[28px] border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
                                    Nenhuma arma analisada ainda.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
