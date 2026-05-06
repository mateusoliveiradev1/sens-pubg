import Link from 'next/link';

import { getDashboardStats } from '@/actions/dashboard';
import { Header } from '@/ui/components/header';
import { WeaponIcon } from '@/ui/components/weapon-icon';

import { buildDashboardTruthViewModel } from './dashboard-truth-view-model';
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

interface DashboardMetricCardProps {
    readonly eyebrow: string;
    readonly value: string;
    readonly note: string;
    readonly detail: string;
    readonly progress: number;
    readonly tone: ScoreTone;
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

function DashboardMetricCard({
    eyebrow,
    value,
    note,
    detail,
    progress,
    tone,
}: DashboardMetricCardProps): React.JSX.Element {
    return (
        <article className={`glass-card h-full border ${tone.borderClass} bg-black/25 p-6 ${tone.glowClass}`}>
            <span className="mb-3 block text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                {eyebrow}
            </span>
            <div className="mb-3 flex items-end justify-between gap-3">
                <strong className={`text-3xl font-black leading-none md:text-4xl ${tone.textClass}`}>{value}</strong>
                <span className={tone.badgeClass}>{note}</span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-zinc-400">{detail}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div
                    className={`h-full rounded-full ${tone.barClass}`}
                    style={{ width: `${clampPercent(progress)}%` }}
                />
            </div>
        </article>
    );
}

export default async function DashboardPage() {
    const stats = await getDashboardStats();

    if (!stats || stats.totalSessions === 0) {
        return (
            <div className="min-h-screen bg-[#08080c] text-white">
                <Header />

                <main className="page">
                    <div className="container" style={{ maxWidth: '1280px' }}>
                        <div className="glass-card relative overflow-hidden border border-dashed border-zinc-800 bg-black/35 p-10 text-center md:p-20">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_30%)]" />
                            <div className="relative flex flex-col items-center">
                                <div className="mb-6 flex h-18 w-18 items-center justify-center rounded-[24px] border border-orange-500/20 bg-black/40 text-orange-400">
                                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
                                        <circle cx="19" cy="19" r="11" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
                                        <path d="M19 5V10M19 28V33M5 19H10M28 19H33" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        <circle cx="19" cy="19" r="3.2" fill="currentColor" />
                                    </svg>
                                </div>
                                <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-400">
                                    Painel tatico // aguardando telemetria
                                </p>
                                <h1 className="mb-4 text-3xl font-black uppercase tracking-tight md:text-5xl">
                                    Sem dados registrados
                                </h1>
                                <p className="mb-10 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                                    Sua dashboard ainda nao tem leitura suficiente para abrir tendencias, arsenal e protocolos.
                                    Suba o primeiro clip e o painel passa a mostrar ritmo, picos e armas que mais estao pesando no seu resultado.
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <Link href="/analyze" className="btn btn-primary btn-lg">
                                        Iniciar primeira analise
                                    </Link>
                                    <Link href="/profile" className="btn btn-secondary btn-lg">
                                        Ajustar perfil
                                    </Link>
                                </div>
                            </div>
                        </div>
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

    const heroSummary = bestWeapon
        ? `Sua media operacional fechou em ${latestAverage}% na ultima leitura, com pico recente de ${latestPeak}%. ${bestWeapon.displayName} e hoje a arma que melhor converte suas sessoes em resultado; a tendencia atual e ${truthView.trendTitle.toLowerCase()}.`
        : `Sua media operacional fechou em ${latestAverage}% na ultima leitura, com pico recente de ${latestPeak}%. A tendencia atual e ${truthView.trendTitle.toLowerCase()} e ainda ha ${consistencyGap} pts de folga ate seu topo historico.`;

    return (
        <div className="min-h-screen bg-[#08080c] text-white">
            <Header />

            <main className="page">
                <div className="container" style={{ maxWidth: '1380px' }}>
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
                                <h1 className="max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                                    Dashboard de performance
                                </h1>
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
                                    <Link href="/analyze" className="btn btn-primary">
                                        Analisar novo clip
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
                                <div className="grid gap-3 text-sm text-zinc-400">
                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-zinc-950/60 px-4 py-3">
                                        <span>Acao atual</span>
                                        <span className="text-cyan-400">
                                            {latestMastery?.actionLabel ?? 'Gravar clip'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-zinc-950/60 px-4 py-3">
                                        <span>Confianca</span>
                                        <span className="text-orange-400">
                                            {latestMastery ? formatPercent(latestMastery.evidence.confidence) : truthView.evidenceLabel}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-zinc-950/60 px-4 py-3">
                                        <span>Cobertura</span>
                                        <span className="text-cyan-400">
                                            {latestMastery ? formatPercent(latestMastery.evidence.coverage) : 'aguardando'}
                                        </span>
                                    </div>
                                    {truthView.precisionTrendLabel ? (
                                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-zinc-950/60 px-4 py-3">
                                            <span>Trend principal</span>
                                            <span className="text-amber-300">
                                                {truthView.precisionTrendLabel}
                                            </span>
                                        </div>
                                    ) : null}
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
                                    <Link href={activeCoachLoop?.ctaHref ?? '/analyze'} className="btn btn-primary">
                                        {activeCoachLoop?.ctaLabel ?? 'Rodar nova analise'}
                                    </Link>
                                    <Link href="/history" className="btn btn-ghost">
                                        Ver sessoes
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        <DashboardMetricCard
                            eyebrow="Sessoes mapeadas"
                            value={String(stats.totalSessions)}
                            note={`${rankedWeapons.length} armas`}
                            detail="Volume bruto da sua base. Quanto mais checkpoints limpos, mais honesta fica a leitura de tendencia e arsenal."
                            progress={(stats.totalSessions / 30) * 100}
                            tone={getScoreTone(Math.min(100, stats.totalSessions * 3))}
                        />
                        <DashboardMetricCard
                            eyebrow="Media de spray"
                            value={`${stats.avgSprayScore}%`}
                            note={`${formatSignedPoints(stats.lastSessionDelta)} vs anterior`}
                            detail="Seu nivel de conversao medio. Aqui o importante nao e um pico isolado, e a capacidade de repetir sessao boa."
                            progress={stats.avgSprayScore}
                            tone={getScoreTone(stats.avgSprayScore)}
                        />
                        <DashboardMetricCard
                            eyebrow="Estabilidade base"
                            value={`${stats.avgStabilityScore}%`}
                            note={`topo ${stats.bestStabilityScore}%`}
                            detail="Mostra o quanto o spray se sustenta sem desmanchar. Hoje essa e sua ancora mais confiavel para ganhar consistencia."
                            progress={stats.avgStabilityScore}
                            tone={getScoreTone(stats.avgStabilityScore)}
                        />
                        <DashboardMetricCard
                            eyebrow="Pico historico"
                            value={`${stats.bestSprayScore}%`}
                            note={`${consistencyGap} pts de folga`}
                            detail="Seu melhor teto registrado. A pergunta da dashboard agora e quanto falta para aproximar sua media desse nivel."
                            progress={stats.bestSprayScore}
                            tone={getScoreTone(stats.bestSprayScore)}
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
                                                        framed={false}
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
                                                            framed={false}
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
