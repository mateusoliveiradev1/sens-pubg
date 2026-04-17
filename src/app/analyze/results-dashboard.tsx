/**
 * Results Dashboard — Metrics, Diagnoses, Sensitivity, Coach.
 * Fully supports multi-spray aggregation and sub-session deep-dives.
 */

'use client';

import { useState } from 'react';
import type {
    AnalysisResult,
    DiagnosisType,
    SensitivityProfile,
    VideoQualityBlockingReason,
    VideoQualityFrameIssue,
    VideoQualityFrameTimeline,
    VideoQualityTier,
} from '@/types/engine';
import { formatAnalysisDistancePresentation } from './analysis-distance-presentation';
import { SprayVisualization } from './spray-visualization';
import { summarizeAnalysisTracking } from './tracking-summary';
import { createTrackingTimeline } from './tracking-timeline';
import styles from './analysis.module.css';

// ═══ Radial Gauge Component ═══
function RadialGauge({ value, max = 100, label, color }: { value: number; max?: number; label: string; color: string }) {
    const pct = Math.min(Math.max(value / max, 0), 1);
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct);
    const bgColor = 'rgba(255,255,255,0.06)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r={r} fill="none" stroke={bgColor} strokeWidth="8" />
                <circle
                    cx="50" cy="50" r={r} fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color})` }}
                />
                <text
                    x="50" y="50" textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize="20" fontWeight="800" fontFamily="var(--font-mono)"
                    style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
                >
                    {Math.round(value)}
                </text>
            </svg>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                {label}
            </span>
        </div>
    );
}

interface Props {
    readonly result: AnalysisResult;
}

// ═══ Diagnosis Icons & Labels ═══
const DIAG_META: Record<string, { icon: string; label: string; color: string }> = {
    overpull: { icon: '⬇️', label: 'OVERPULL', color: '#ff3d3d' },
    underpull: { icon: '⬆️', label: 'UNDERPULL', color: '#f59e0b' },
    late_compensation: { icon: '⏱️', label: 'LATE RESPONSE', color: '#f97316' },
    excessive_jitter: { icon: '〰️', label: 'JITTER', color: '#ef4444' },
    horizontal_drift: { icon: '↔️', label: 'H. DRIFT', color: '#a855f7' },
    inconsistency: { icon: '🎲', label: 'INCONSISTENCY', color: '#eab308' },
};

// ═══ Profile Icons ═══
const PROFILE_META: Record<string, { icon: string; subtitle: string }> = {
    low: { icon: '🎯', subtitle: 'Máx. Precisão' },
    balanced: { icon: '⚖️', subtitle: 'Equilíbrio' },
    high: { icon: '⚡', subtitle: 'Máx. Velocidade' },
};

const PROFILE_THEME: Record<'low' | 'balanced' | 'high', { eyebrow: string; accent: string }> = {
    low: { eyebrow: 'Controle fino', accent: '#14b8a6' },
    balanced: { eyebrow: 'Faixa segura', accent: '#f59e0b' },
    high: { eyebrow: 'Entrada curta', accent: '#22c55e' },
};

function SeverityDots({ severity }: { severity: number }) {
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: i <= severity
                            ? severity >= 4 ? '#ef4444' : severity >= 3 ? '#f59e0b' : '#22c55e'
                            : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease',
                        boxShadow: i <= severity && severity >= 4 ? '0 0 6px #ef4444' : 'none',
                    }}
                />
            ))}
            <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: severity >= 4 ? '#ef4444' : severity >= 3 ? '#f59e0b' : '#22c55e',
                marginLeft: '4px',
                fontWeight: 700,
            }}>
                {severity}/5
            </span>
        </div>
    );
}

function MetricTooltip({ text }: { text: string }) {
    return (
        <span style={{
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            cursor: 'help',
            opacity: 0.6,
        }} title={text}>ⓘ</span>
    );
}

const METRIC_TOOLTIPS: Record<string, string> = {
    'Estabilidade': 'Score geral do spray (0-100). Mede quanto seu spray ficou concentrado.',
    'Controle Vertical': 'Razão entre pulldown real vs ideal. 1.0 = perfeito. >1 = overpull. <1 = underpull.',
    'Ruído Horizontal': 'Variação lateral angular do spray em graus. Menor = mais estável.',
    'Erro Linear': 'Erro projetado no alvo considerando a distância da análise.',
    'Tempo de Resposta': 'Tempo (ms) até iniciar compensação de recuo após o primeiro tiro.',
    'Consistência': 'Quão similar são seus sprays entre si (0-100).',
    'VSM Sugerido': 'Multiplicador Vertical de Sensibilidade recomendado baseado na sua análise.',
};

const VIDEO_QUALITY_REASON_LABELS: Record<VideoQualityBlockingReason, string> = {
    low_sharpness: 'baixa nitidez',
    high_compression_burden: 'compressao pesada',
    low_reticle_contrast: 'baixo contraste da mira',
    unstable_roi: 'instabilidade visual na area da mira',
    unstable_fps: 'FPS instavel',
};
const VIDEO_QUALITY_TIER_LABELS: Record<VideoQualityTier, string> = {
    cinematic: 'Cinematico',
    production_ready: 'Producao',
    analysis_ready: 'Analisavel',
    limited: 'Limitado',
    poor: 'Fraco',
};
const VIDEO_QUALITY_FRAME_ISSUE_LABELS: Record<VideoQualityFrameIssue, string> = {
    low_sharpness: 'baixa nitidez',
    compression: 'compressao',
    low_reticle_contrast: 'baixo contraste',
    reticle_lost: 'mira perdida',
};
const TRACKING_DISTURBANCE_LABELS = {
    muzzleFlash: 'muzzle flash',
    blur: 'blur',
    shake: 'camera shake',
    occlusion: 'oclusao',
} as const;

function formatVideoQualityReason(reason: VideoQualityBlockingReason): string {
    return VIDEO_QUALITY_REASON_LABELS[reason];
}

function formatVideoQualityReasons(reasons: readonly VideoQualityBlockingReason[]): string {
    if (reasons.length === 0) {
        return 'nenhum bloqueio detectado';
    }

    return reasons.map(formatVideoQualityReason).join(', ');
}

function formatDurationMs(valueMs: number): string {
    return `${(Math.max(0, valueMs) / 1000).toFixed(2)}s`;
}

function formatTrackingWindowRange(startMs: number | null, endMs: number | null): string {
    if (startMs === null || endMs === null) {
        return 'janela agregada';
    }

    return `${formatDurationMs(startMs)} - ${formatDurationMs(endMs)}`;
}

function formatTrackingSegmentTitle(status: AnalysisResult['trajectory']['trackingFrames'][number]['status']): string {
    switch (status) {
        case 'tracked':
            return 'Mira rastreada';
        case 'uncertain':
            return 'Tracking instavel';
        case 'occluded':
            return 'Mira ocluida';
        case 'lost':
            return 'Mira perdida';
    }
}

function getTrackingSegmentBadge(status: AnalysisResult['trajectory']['trackingFrames'][number]['status']): string {
    switch (status) {
        case 'tracked':
            return 'badge-success';
        case 'uncertain':
        case 'occluded':
        case 'lost':
            return 'badge-warning';
    }
}

function buildTrackingSegmentSummary(segment: ReturnType<typeof createTrackingTimeline>['segments'][number]): string {
    const confidenceText = `confianca media ${Math.round(segment.meanConfidence * 100)}%`;
    const disturbanceText = segment.dominantDisturbance
        ? `Disturbio dominante: ${TRACKING_DISTURBANCE_LABELS[segment.dominantDisturbance]} (${Math.round(segment.dominantDisturbanceLevel * 100)}%).`
        : 'Sem disturbio dominante acima do ruido base.';

    if (segment.status === 'tracked') {
        return `${segment.frameCount} frames com ${confidenceText}. ${disturbanceText}`;
    }

    const reacquisitionText = segment.maxReacquisitionFrames > 0
        ? ` Reacoplou em ate ${segment.maxReacquisitionFrames} frames.`
        : '';

    return `${segment.frameCount} frames em janela de atencao, ${confidenceText}.${reacquisitionText} ${disturbanceText}`;
}

function VideoQualityTimelineEvidence({ timeline }: { readonly timeline: VideoQualityFrameTimeline }): React.JSX.Element {
    const totalFrames = Math.max(timeline.summary.totalFrames, 1);
    const readableFrames = timeline.summary.goodFrames + timeline.summary.degradedFrames;
    const readablePercent = Math.round((readableFrames / totalFrames) * 100);

    return (
        <div style={{ display: 'grid', gap: '8px' }}>
            <span className="metric-label">Evidencia frame-a-frame</span>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <span className="badge badge-success">
                    Bons {timeline.summary.goodFrames}/{timeline.summary.totalFrames}
                </span>
                <span className="badge badge-warning">
                    Degradados {timeline.summary.degradedFrames}
                </span>
                <span className="badge badge-info">
                    Leitura {readablePercent}%
                </span>
                {timeline.summary.lostFrames > 0 ? (
                    <span className="badge badge-warning">
                        Mira perdida {timeline.summary.lostFrames}
                    </span>
                ) : null}
            </div>
            {timeline.degradedSegments.length > 0 ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                    {timeline.degradedSegments.map((segment) => (
                        <p key={`${Number(segment.startMs)}-${Number(segment.endMs)}-${segment.primaryIssue}`} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
                            Trecho {formatTrackingWindowRange(Number(segment.startMs), Number(segment.endMs))}: {VIDEO_QUALITY_FRAME_ISSUE_LABELS[segment.primaryIssue]} ({segment.frameCount} frames)
                        </p>
                    ))}
                </div>
            ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
                    Nenhum trecho degradado dentro da janela selecionada.
                </p>
            )}
        </div>
    );
}

function formatEvidencePercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatCoachMode(mode: 'standard' | 'low-confidence' | 'inconclusive'): string {
    if (mode === 'inconclusive') {
        return 'Leitura inconclusiva';
    }

    if (mode === 'low-confidence') {
        return 'Revisar com novo clip';
    }

    return 'Alta confianca';
}

function buildSensitivitySummary(
    recommendedProfileLabel: string,
    topDiagnosisLabel: string | null,
    suggestedVsm: number | undefined,
    sampleCount: number,
    confidence: number,
    coverage: number
): string {
    const parts = [`Perfil recomendado: ${recommendedProfileLabel}.`];

    if (topDiagnosisLabel) {
        parts.push(`A prioridade desta leitura e ${topDiagnosisLabel.toLowerCase()}.`);
    } else {
        parts.push('A leitura nao encontrou um desvio dominante acima do restante.');
    }

    if (suggestedVsm !== undefined) {
        parts.push(`Teste tambem VSM ${suggestedVsm.toFixed(2)} como ponto de partida.`);
    }

    if (sampleCount < 3) {
        parts.push(`Como esta analise usa ${sampleCount} spray${sampleCount === 1 ? '' : 's'}, trate o ajuste como inicial e confirme com 3 sprays antes de fechar a sens.`);
    } else if (confidence < 0.8 || coverage < 0.8) {
        parts.push('Antes de consolidar a sens, vale repetir o clip com tracking mais limpo para aumentar a confianca da leitura.');
    } else {
        parts.push('Use isso como base de teste e valide no proximo bloco de sprays, nao como valor final absoluto.');
    }

    return parts.join(' ');
}

function formatSignedPercent(value: number): string {
    const rounded = Math.round(value);
    return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

function getAverageScopeDelta(profile: SensitivityProfile): number {
    if (profile.scopes.length === 0) {
        return 0;
    }

    const total = profile.scopes.reduce((sum, scope) => sum + scope.changePercent, 0);
    return total / profile.scopes.length;
}

function getProfileScopePreview(profile: SensitivityProfile): readonly SensitivityProfile['scopes'][number][] {
    return [...profile.scopes]
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))
        .slice(0, 3);
}

function buildProfileNarrative(
    profile: SensitivityProfile,
    topDiagnosisType: DiagnosisType | null,
    isRecommended: boolean
): string {
    const avgScopeDelta = getAverageScopeDelta(profile);
    const deltaLine = avgScopeDelta === 0
        ? 'As miras quase nao saem da base atual.'
        : avgScopeDelta > 0
            ? `As miras sobem em media ${Math.abs(Math.round(avgScopeDelta))}% versus a base.`
            : `As miras descem em media ${Math.abs(Math.round(avgScopeDelta))}% versus a base.`;

    const diagnosisLine = (() => {
        switch (topDiagnosisType) {
            case 'underpull':
                if (profile.type === 'low') return 'Combina com o clip atual porque devolve margem para segurar a subida do spray.';
                if (profile.type === 'balanced') return 'Ajuda a cortar a subida sem travar demais a mobilidade.';
                return 'So faz sentido se voce aceitar menos controle para ganhar giro e resposta.';
            case 'overpull':
                if (profile.type === 'low') return 'Pode exagerar o controle se voce ja esta descendo demais a mira.';
                if (profile.type === 'balanced') return 'Segura o excesso sem desmontar o feeling do spray.';
                return 'Abre espaco para aliviar a mao se o problema e excesso de forca no pulldown.';
            case 'late_compensation':
                if (profile.type === 'low') return 'Fica mais exigente para reagir cedo ao primeiro tiro.';
                if (profile.type === 'balanced') return 'Entrega uma janela mais limpa sem sacrificar demais a resposta.';
                return 'Favorece correcao rapida e readesao no alvo logo na abertura.';
            case 'excessive_jitter':
            case 'inconsistency':
                if (profile.type === 'high') return 'Risco maior com o clip atual porque a leitura ja mostrou falta de estabilidade.';
                if (profile.type === 'balanced') return 'Tende a limpar o spray sem tirar totalmente a velocidade de giro.';
                return 'E o perfil com mais folga para domar tremor e repeticao de spray.';
            case 'horizontal_drift':
                if (profile.type === 'balanced') return 'Costuma ser o meio-termo mais seguro para recentralizar o eixo lateral.';
                if (profile.type === 'high') return 'Ajuda na correcao lateral rapida, mas cobra mao mais firme.';
                return 'Da controle bruto para alinhar o eixo, mas pode deixar a reaceleracao mais lenta.';
            default:
                if (profile.type === 'low') return 'Prioriza controle puro para spray longo e leitura calma.';
                if (profile.type === 'balanced') return 'Segura consistencia sem te tirar da zona de conforto.';
                return 'Empurra o jogo para velocidade de entrada, flick curto e reengage rapido.';
        }
    })();

    const recommendationLine = isRecommended
        ? 'Este e o melhor encaixe para o padrao detectado neste clip.'
        : 'Funciona como alternativa se voce preferir outro ritmo de mira.';

    return `${diagnosisLine} ${deltaLine} ${recommendationLine}`;
}

function buildProfileHighlights(
    profile: SensitivityProfile,
    topDiagnosisType: DiagnosisType | null
): readonly string[] {
    const avgScopeDelta = getAverageScopeDelta(profile);
    const scopeDelta = avgScopeDelta === 0
        ? 'Miras quase sem mudanca em relacao a base.'
        : avgScopeDelta > 0
            ? `Miras em media ${formatSignedPercent(avgScopeDelta)} mais rapidas.`
            : `Miras em media ${formatSignedPercent(avgScopeDelta)} mais controladas.`;

    const roleLine = profile.type === 'low'
        ? 'Melhor para spray longo, puxada continua e rastreio sem pressa.'
        : profile.type === 'balanced'
            ? 'Melhor para quem quer trocar pouco de giro por mais consistencia.'
            : 'Melhor para entrada curta, CQB e recaptura rapida do alvo.';

    const riskLine = (() => {
        if (topDiagnosisType === 'late_compensation' && profile.type === 'high') {
            return 'Casa com o erro atual porque reduz o atraso de reacao.';
        }

        if ((topDiagnosisType === 'underpull' || topDiagnosisType === 'excessive_jitter' || topDiagnosisType === 'inconsistency') && profile.type === 'high') {
            return 'Risco alto neste momento: pede mais mao do que o clip mostrou.';
        }

        if ((topDiagnosisType === 'underpull' || topDiagnosisType === 'excessive_jitter') && profile.type === 'low') {
            return 'Casa bem com o erro dominante porque amplia a janela de controle.';
        }

        if (profile.type === 'balanced') {
            return 'Faixa mais segura para testar sem pular direto para extremos.';
        }

        return profile.type === 'low'
            ? 'Troca velocidade por margem maior de correcao.'
            : 'Troca estabilidade por resposta mais curta.';
    })();

    return [roleLine, riskLine, scopeDelta];
}

export function ResultsDashboard({ result }: Props): React.JSX.Element {
    const [activeSession, setActiveSession] = useState<AnalysisResult>(result);
    const [expandedDiag, setExpandedDiag] = useState<number | null>(null);
    const [showAllScopes, setShowAllScopes] = useState<Record<string, boolean>>({});
    const [expandedCoach, setExpandedCoach] = useState<number | null>(null);
    const [showMinorDiags, setShowMinorDiags] = useState(false);
    const isAggregated = activeSession.id === result.id;
    const trackingOverview = summarizeAnalysisTracking(activeSession);
    const analysisContext = activeSession.analysisContext;
    const targetDistanceMeters = analysisContext?.targetDistanceMeters ?? activeSession.metrics.targetDistanceMeters;
    const distanceMode = analysisContext?.distanceMode ?? 'estimated';
    const distanceNote = analysisContext?.distanceNote;
    const distancePresentation = formatAnalysisDistancePresentation({
        targetDistanceMeters,
        distanceMode,
        distanceNote,
    });
    const hasIdealPattern = (activeSession.metrics.shotResiduals?.length ?? 0) > 0;
    const linearErrorLabel = distanceMode === 'unknown' ? 'Erro Linear (ref.)' : 'Erro Linear';
    const linearErrorUnit = distanceMode === 'unknown'
        ? `cm @ ref. ${targetDistanceMeters ?? 30}m`
        : distanceMode === 'exact'
            ? `cm @ ${targetDistanceMeters ?? 30}m`
            : `cm @ aprox. ${targetDistanceMeters ?? 30}m`;
    const videoQualityReport = activeSession.videoQualityReport;
    const videoQualityReasons = videoQualityReport
        ? formatVideoQualityReasons(videoQualityReport.blockingReasons)
        : null;
    const videoQualityDiagnostic = videoQualityReport?.diagnostic;
    const videoQualityTimeline = videoQualityDiagnostic?.timeline;
    const trackingWindowRange = formatTrackingWindowRange(
        trackingOverview.effectiveWindowStartMs,
        trackingOverview.effectiveWindowEndMs
    );
    const trackingTimelineFrames = isAggregated && activeSession.subSessions && activeSession.subSessions.length > 0
        ? activeSession.subSessions.flatMap((session) => session.trajectory.trackingFrames ?? [])
        : activeSession.trajectory.trackingFrames ?? [];
    const trackingTimeline = createTrackingTimeline(trackingTimelineFrames);

    const { metrics, diagnoses, sensitivity, coaching } = activeSession;
    const sampleCount = isAggregated ? (result.subSessions?.length ?? 1) : 1;

    const stabilityVal = Number(metrics.stabilityScore);
    const consistencyVal = Number(metrics.consistencyScore);
    const stabilityColor = stabilityVal >= 70 ? '#22c55e' : stabilityVal >= 40 ? '#f59e0b' : '#ef4444';
    const consistencyColor = consistencyVal >= 65 ? '#22c55e' : consistencyVal >= 40 ? '#f59e0b' : '#ef4444';

    const metricCards = [
        { label: 'Controle Vertical', value: metrics.verticalControlIndex.toFixed(2), unit: '× ideal', color: Math.abs(metrics.verticalControlIndex - 1) < 0.15 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Ruído Horizontal', value: metrics.horizontalNoiseIndex.toFixed(1), unit: 'deg', color: metrics.horizontalNoiseIndex <= 3 ? 'var(--color-success)' : 'var(--color-error)' },
        { label: linearErrorLabel, value: (metrics.linearErrorCm ?? 0).toFixed(1), unit: linearErrorUnit, color: (metrics.linearErrorSeverity ?? 0) <= 100 ? 'var(--color-success)' : 'var(--color-error)' },
        { label: 'Tempo de Resposta', value: Number(metrics.initialRecoilResponseMs).toFixed(0), unit: 'ms', color: Number(metrics.initialRecoilResponseMs) <= 180 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'VSM Sugerido', value: sensitivity.suggestedVSM?.toFixed(2) ?? '1.00', unit: '', color: sensitivity.suggestedVSM && sensitivity.suggestedVSM !== 1 ? 'var(--color-warning)' : 'var(--color-primary)' },
    ];

    // Sort diagnoses by severity (most critical first)
    const sortedDiagnoses = [...diagnoses].sort((a, b) => b.severity - a.severity);
    const majorDiags = sortedDiagnoses.filter(d => d.severity >= 3);
    const minorDiags = sortedDiagnoses.filter(d => d.severity < 3);
    const topDiagnosisType = sortedDiagnoses[0]?.type ?? null;
    const topDiagnosisMeta = sortedDiagnoses[0] ? DIAG_META[sortedDiagnoses[0].type] : null;
    const recommendedProfile = sensitivity.profiles.find((profile) => profile.type === sensitivity.recommended);
    const sensitivitySummary = buildSensitivitySummary(
        recommendedProfile?.label ?? 'Balanceada',
        topDiagnosisMeta?.label ?? null,
        sensitivity.suggestedVSM,
        sampleCount,
        trackingOverview.confidence,
        trackingOverview.coverage
    );

    // Group coach feedback by similar diagnosis types for deduplication
    const groupedCoaching = [...coaching].reduce<{ key: string; items: (typeof coaching)[number][] }[]>((acc, c) => {
        const existing = acc.find(g => g.key === c.diagnosis.type);
        if (existing) {
            existing.items.push(c);
        } else {
            acc.push({ key: c.diagnosis.type, items: [c] });
        }
        return acc;
    }, []);
    // Sort groups by max severity
    groupedCoaching.sort((a, b) => {
        const maxA = Math.max(...a.items.map(i => i.diagnosis.severity));
        const maxB = Math.max(...b.items.map(i => i.diagnosis.severity));
        return maxB - maxA;
    });

    return (
        <div className={styles.dashboard}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--space-md)',
                }}
            >
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">Patch {activeSession.patchVersion}</span>
                    <span className="badge badge-info">
                        Cobertura {Math.round(trackingOverview.coverage * 100)}%
                    </span>
                    <span className="badge badge-info">
                        Confiança {Math.round(trackingOverview.confidence * 100)}%
                    </span>
                    <span className="badge badge-info">
                        Frames perdidos {trackingOverview.framesLost}/{trackingOverview.framesProcessed}
                    </span>
                    {analysisContext ? (
                        <>
                            <span className="badge badge-info">Mira {analysisContext.optic.opticName}</span>
                            <span className="badge badge-info">Estado {analysisContext.optic.opticStateName}</span>
                        </>
                    ) : (
                        <span className="badge badge-info">Mira não registrada</span>
                    )}
                    <span className="badge badge-info" title={distancePresentation.note}>
                        {distancePresentation.badgeLabel}
                    </span>
                    {analysisContext?.optic.ambiguityNote ? (
                        <span className="badge badge-info" title={analysisContext.optic.ambiguityNote}>
                            Estado óptico assumido
                        </span>
                    ) : null}
                    {videoQualityReport ? (
                        <span className="badge badge-info" title={`Motivos: ${videoQualityReasons}`}>
                            Qualidade do clip {Math.round(videoQualityReport.overallScore)}/100
                        </span>
                    ) : null}
                </div>
                {isAggregated && result.subSessions && result.subSessions.length > 0 ? (
                    <span className="badge badge-info">
                        Média de {result.subSessions.length} sprays
                    </span>
                ) : null}
            </div>
            {/* ═══ Sub-Sessions Selector ═══ */}
            {result.subSessions && result.subSessions.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🎯 Segmentação de Sprays</h3>
                    <div className={styles.subSessionsGrid}>
                        <div
                            className={`${styles.subSessionCard} glass-card ${isAggregated ? styles.subSessionCardActive : ''}`}
                            onClick={() => setActiveSession(result)}
                        >
                            <strong>📊 Média Geral</strong>
                            <p style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>{result.subSessions.length} sprays</p>
                        </div>
                        {result.subSessions.map((sub, idx) => (
                            <div
                                key={sub.id}
                                className={`${styles.subSessionCard} glass-card ${activeSession.id === sub.id ? styles.subSessionCardActive : ''}`}
                                onClick={() => setActiveSession(sub)}
                            >
                                <strong>Spray #{idx + 1}</strong>
                                <p style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>
                                    {(sub.trajectory.durationMs / 1000).toFixed(1)}s
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {videoQualityReport ? (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Qualidade do clip</h3>
                    <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-lg)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                            <div style={{ maxWidth: '560px' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: '8px', lineHeight: 1.6 }}>
                                    Score estimado do arquivo analisado. Ele ajuda a separar erro real de leitura limitada por nitidez, compressao, contraste ou estabilidade do video.
                                </p>
                                <strong style={{ fontSize: '2rem', color: videoQualityReport.usableForAnalysis ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    {Math.round(videoQualityReport.overallScore)}/100
                                </strong>
                            </div>
                            <div style={{ minWidth: '220px' }}>
                                <span className={`badge ${videoQualityReport.usableForAnalysis ? 'badge-success' : 'badge-warning'}`}>
                                    {videoQualityReport.usableForAnalysis ? 'Analisavel' : 'Leitura limitada'}
                                </span>
                                <p style={{ marginTop: '10px', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                    Motivos: {videoQualityReasons}
                                </p>
                            </div>
                        </div>
                        <div className={styles.metricsGrid}>
                            {[
                                { label: 'Nitidez', value: videoQualityReport.sharpness },
                                { label: 'Compressao', value: 100 - videoQualityReport.compressionBurden },
                                { label: 'Contraste da mira', value: videoQualityReport.reticleContrast },
                                { label: 'ROI estavel', value: videoQualityReport.roiStability },
                                { label: 'FPS estavel', value: videoQualityReport.fpsStability },
                            ].map((qualityMetric) => (
                                <div key={qualityMetric.label} className={`glass-card ${styles.metricCard}`}>
                                    <span className="metric-label">{qualityMetric.label}</span>
                                    <span className="metric-value" style={{ color: 'var(--color-primary)', WebkitTextFillColor: 'var(--color-primary)', background: 'none' }}>
                                        {Math.round(qualityMetric.value)}
                                    </span>
                                    <span className={styles.metricUnit}>/100</span>
                                </div>
                            ))}
                        </div>
                        {videoQualityDiagnostic ? (
                            <div style={{ marginTop: 'var(--space-lg)', display: 'grid', gap: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span className="badge badge-info">Laudo automatico</span>
                                    <span className={`badge ${videoQualityDiagnostic.tier === 'cinematic' ? 'badge-success' : 'badge-info'}`}>
                                        {VIDEO_QUALITY_TIER_LABELS[videoQualityDiagnostic.tier]}
                                    </span>
                                    <span className="badge badge-info">
                                        {videoQualityDiagnostic.preprocessing.normalizationApplied ? 'Normalizacao aplicada' : 'Sem normalizacao'}
                                    </span>
                                    <span className="badge badge-info">
                                        {videoQualityDiagnostic.preprocessing.selectedFrames}/{videoQualityDiagnostic.preprocessing.sampledFrames} frames uteis
                                    </span>
                                    {videoQualityDiagnostic.preprocessing.sprayWindow ? (
                                        <span className="badge badge-success">
                                            Janela {formatTrackingWindowRange(
                                                Number(videoQualityDiagnostic.preprocessing.sprayWindow.startMs),
                                                Number(videoQualityDiagnostic.preprocessing.sprayWindow.endMs)
                                            )}
                                        </span>
                                    ) : null}
                                </div>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                    {videoQualityDiagnostic.summary}
                                </p>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {videoQualityDiagnostic.recommendations.map((recommendation) => (
                                        <p key={recommendation} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                                            - {recommendation}
                                        </p>
                                    ))}
                                </div>
                                {videoQualityTimeline ? (
                                    <VideoQualityTimelineEvidence timeline={videoQualityTimeline} />
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </section>
            ) : null}

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Leitura tecnica do tracking</h3>
                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        Transparencia da leitura do video: mostra a janela realmente analisada, perdas de mira e quanto o tracker precisou se reacoplar ao reticulo.
                    </p>
                    <div className={styles.metricsGrid}>
                        <div className={`glass-card ${styles.metricCard}`}>
                            <span className="metric-label">Janela efetiva</span>
                            <span className="metric-value" style={{ color: 'var(--color-primary)', WebkitTextFillColor: 'var(--color-primary)', background: 'none' }}>
                                {formatDurationMs(trackingOverview.effectiveWindowMs)}
                            </span>
                            <span className={styles.metricUnit}>{trackingWindowRange}</span>
                        </div>
                        <div className={`glass-card ${styles.metricCard}`}>
                            <span className="metric-label">Frames perdidos</span>
                            <span className="metric-value" style={{ color: trackingOverview.framesLost > 0 ? 'var(--color-warning)' : 'var(--color-success)', WebkitTextFillColor: trackingOverview.framesLost > 0 ? 'var(--color-warning)' : 'var(--color-success)', background: 'none' }}>
                                {trackingOverview.framesLost}
                            </span>
                            <span className={styles.metricUnit}>de {trackingOverview.framesProcessed}</span>
                        </div>
                        <div className={`glass-card ${styles.metricCard}`}>
                            <span className="metric-label">Reaquisicoes</span>
                            <span className="metric-value" style={{ color: trackingOverview.reacquisitionEvents > 0 ? 'var(--color-warning)' : 'var(--color-success)', WebkitTextFillColor: trackingOverview.reacquisitionEvents > 0 ? 'var(--color-warning)' : 'var(--color-success)', background: 'none' }}>
                                {trackingOverview.reacquisitionEvents}
                            </span>
                            <span className={styles.metricUnit}>media {trackingOverview.meanReacquisitionFrames.toFixed(1)} frames</span>
                        </div>
                        <div className={`glass-card ${styles.metricCard}`}>
                            <span className="metric-label">Maior reacoplamento</span>
                            <span className="metric-value" style={{ color: trackingOverview.maxReacquisitionFrames > 1 ? 'var(--color-warning)' : 'var(--color-success)', WebkitTextFillColor: trackingOverview.maxReacquisitionFrames > 1 ? 'var(--color-warning)' : 'var(--color-success)', background: 'none' }}>
                                {trackingOverview.maxReacquisitionFrames}
                            </span>
                            <span className={styles.metricUnit}>frames ate voltar</span>
                        </div>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-md)', lineHeight: 1.6 }}>
                        Breakdown: tracked {trackingOverview.statusCounts.tracked}, uncertain {trackingOverview.statusCounts.uncertain}, occluded {trackingOverview.statusCounts.occluded}, lost {trackingOverview.statusCounts.lost}.
                    </p>
                    {trackingTimeline.segments.length > 0 ? (
                        <div style={{ marginTop: 'var(--space-lg)', display: 'grid', gap: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className="badge badge-info">Linha do tracking</span>
                                <span className="badge badge-success">
                                    Janelas rastreadas {trackingTimeline.summary.trackedSegments}
                                </span>
                                <span className="badge badge-warning">
                                    Janelas de atencao {trackingTimeline.summary.attentionSegments}
                                </span>
                                {trackingTimeline.summary.worstReacquisitionFrames > 0 ? (
                                    <span className="badge badge-warning">
                                        Pior reacoplamento {trackingTimeline.summary.worstReacquisitionFrames} frames
                                    </span>
                                ) : null}
                            </div>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {trackingTimeline.segments.map((segment) => (
                                    <div
                                        key={`${segment.status}-${segment.startMs}-${segment.endMs}`}
                                        className="glass-card"
                                        style={{ padding: 'var(--space-md)' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: '6px' }}>
                                            <strong style={{ fontSize: 'var(--text-sm)' }}>
                                                {formatTrackingSegmentTitle(segment.status)}
                                            </strong>
                                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                                <span className={`badge ${getTrackingSegmentBadge(segment.status)}`}>
                                                    {formatTrackingWindowRange(segment.startMs, segment.endMs)}
                                                </span>
                                                <span className="badge badge-info">
                                                    {segment.frameCount} frames
                                                </span>
                                            </div>
                                        </div>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                                            {buildTrackingSegmentSummary(segment)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>

            {/* ═══ Metrics & Visualization ═══ */}
            <div className={styles.vizGrid}>
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>📊 Métricas {isAggregated ? '(Médias)' : ''}</h3>

                    {/* Gauge Charts for key scores */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '24px', padding: '20px 0' }}>
                        <RadialGauge value={stabilityVal} label="Estabilidade" color={stabilityColor} />
                        <RadialGauge value={consistencyVal} label="Consistência" color={consistencyColor} />
                        <RadialGauge value={Number(metrics.sprayScore || 0)} label="Spray Score" color={Number(metrics.sprayScore || 0) >= 60 ? '#22c55e' : Number(metrics.sprayScore || 0) >= 30 ? '#f59e0b' : '#ef4444'} />
                    </div>

                    <div className={styles.metricsGrid}>
                        {metricCards.map((m, i) => (
                            <div key={m.label} className={`glass-card ${styles.metricCard} animate-fade-in-up stagger-${i + 1}`}>
                                <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {m.label} <MetricTooltip text={m.label === linearErrorLabel ? (distanceNote ?? METRIC_TOOLTIPS['Erro Linear'] ?? '') : (METRIC_TOOLTIPS[m.label] || '')} />
                                </span>
                                <span className="metric-value" style={{ color: m.color, WebkitTextFillColor: m.color, background: 'none' }}>
                                    {m.value}
                                </span>
                                <span className={styles.metricUnit}>{m.unit}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.phasesContainer} style={{ marginTop: 'var(--space-md)' }}>
                        <div className={styles.phaseBar}>
                            <div className={styles.phaseSegment} style={{ flex: 1 }}>
                                <span>Burst (1-10)</span>
                                <strong>VCI {metrics.burstVCI.toFixed(2)}</strong>
                            </div>
                            <div className={styles.phaseSegment} style={{ flex: 1, borderLeft: '1px solid var(--color-white-10)' }}>
                                <span>Meio (11-20)</span>
                                <strong>VCI {metrics.sustainedVCI.toFixed(2)}</strong>
                            </div>
                            <div className={styles.phaseSegment} style={{ flex: 1, borderLeft: '1px solid var(--color-white-10)' }}>
                                <span>Fadiga (21+)</span>
                                <strong>VCI {metrics.fatigueVCI.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🎯 Trajetória do Recuo</h3>
                    <div className={`${styles.vizCard} glass-card`}>
                        <div className={styles.canvasContainer}>
                            <SprayVisualization
                                trajectory={activeSession.trajectory}
                                shotResiduals={activeSession.metrics.shotResiduals}
                            />
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '12px', textAlign: 'center' }}>
                            {hasIdealPattern
                                ? 'Linha Azul = Padrao ideal patch-aware | Linha Laranja = Seu movimento real | Alvo = centro inicial'
                                : 'Linha Laranja = Seu movimento real | Alvo = centro inicial'}
                        </p>
                    </div>
                </section>
            </div>

            {/* ═══ Diagnoses — Improved ═══ */}
            {sortedDiagnoses.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🩺 Leituras da Análise</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        A análise destaca primeiro o que mais está derrubando o spray agora. Use os blocos abaixo como priorização prática, não como sentença final.
                    </p>
                    <div className={styles.diagnosisList}>
                        {/* Major diagnoses (severity >= 3) — always visible */}
                        {majorDiags.map((d, i) => {
                            const meta = DIAG_META[d.type] || { icon: '⚠️', label: d.type.toUpperCase(), color: '#f59e0b' };
                            const matchingCoach = coaching.find(c => c.diagnosis.type === d.type);
                            const isExpanded = expandedDiag === i;

                            return (
                                <div
                                    key={d.type + i}
                                    className={`glass-card ${styles.diagnosisCard}`}
                                    style={{ borderLeftColor: meta.color, cursor: 'pointer' }}
                                    onClick={() => setExpandedDiag(isExpanded ? null : i)}
                                >
                                    <div className={styles.diagnosisHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                                            <SeverityDots severity={d.severity} />
                                        </div>
                                        <span className={styles.diagnosisType} style={{ color: meta.color }}>
                                            {meta.label}
                                        </span>
                                    </div>
                                    <p className={styles.diagnosisDesc}>{d.description}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por que acontece</span>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>{d.cause}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Como corrigir</span>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>{d.remediation}</p>
                                        </div>
                                    </div>
                                    {matchingCoach && (
                                        <div style={{ marginTop: '12px', overflow: 'hidden', maxHeight: isExpanded ? '300px' : '0', opacity: isExpanded ? 1 : 0, transition: 'all 0.3s ease' }}>
                                            <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏋️ Drill Profissional</span>
                                                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '6px' }}>{matchingCoach.howToTest}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>⏱️ Adaptação estimada</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                                                        {matchingCoach.adaptationTimeDays} {matchingCoach.adaptationTimeDays === 1 ? 'dia' : 'dias'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {matchingCoach && (
                                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                            {isExpanded ? '▲ Fechar drill' : '▼ Ver drill profissional'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Minor diagnoses (severity < 3) — collapsed by default */}
                        {minorDiags.length > 0 && (
                            <>
                                <button
                                    onClick={() => setShowMinorDiags(prev => !prev)}
                                    style={{
                                        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)',
                                        border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px',
                                        color: 'var(--color-text-muted)', fontSize: '12px', cursor: 'pointer',
                                        fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
                                    }}
                                >
                                    {showMinorDiags ? '▲ Esconder' : '▼ Mostrar'} {minorDiags.length} diagnóstico{minorDiags.length > 1 ? 's' : ''} menor{minorDiags.length > 1 ? 'es' : ''}
                                </button>

                                {showMinorDiags && minorDiags.map((d, i) => {
                                    const meta = DIAG_META[d.type] || { icon: '⚠️', label: d.type.toUpperCase(), color: '#f59e0b' };
                                    const idx = majorDiags.length + i;
                                    return (
                                        <div
                                            key={d.type + idx}
                                            className={`glass-card ${styles.diagnosisCard}`}
                                            style={{ borderLeftColor: meta.color, opacity: 0.7 }}
                                        >
                                            <div className={styles.diagnosisHeader}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                                                    <SeverityDots severity={d.severity} />
                                                </div>
                                                <span className={styles.diagnosisType} style={{ color: meta.color }}>{meta.label}</span>
                                            </div>
                                            <p className={styles.diagnosisDesc}>{d.description}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{d.remediation}</p>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </section>
            )}

            {/* ═══ Sensitivity Profiles — Improved ═══ */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>⚙️ Calibração de Sensibilidade</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)', lineHeight: 1.6 }}>
                    {sensitivitySummary}
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-lg)', opacity: 0.75 }}>
                    Base atual: cobertura {formatEvidencePercent(trackingOverview.coverage)}, confianca {formatEvidencePercent(trackingOverview.confidence)} e {sampleCount} spray{sampleCount === 1 ? '' : 's'} validado{sampleCount === 1 ? '' : 's'}.
                </p>
                <div className={styles.profilesGrid}>
                    {sensitivity.profiles.map(profile => {
                        const pmeta = PROFILE_META[profile.type] || { icon: '⚙️', subtitle: '' };
                        const isRecommended = profile.type === sensitivity.recommended;
                        const showScopes = isRecommended || showAllScopes[profile.type];
                        const theme = PROFILE_THEME[profile.type];
                        const profileNarrative = buildProfileNarrative(profile, topDiagnosisType, isRecommended);
                        const profileHighlights = buildProfileHighlights(profile, topDiagnosisType);
                        const scopePreview = getProfileScopePreview(profile);

                        return (
                            <div
                                key={profile.type}
                                className={`glass-card ${styles.profileCard} ${isRecommended ? styles.profileRecommended : ''}`}
                                style={{
                                    ...(isRecommended ? {} : { opacity: 0.82 }),
                                    ['--profile-accent' as string]: theme.accent,
                                }}
                            >
                                {isRecommended && (
                                    <span className={`badge badge-success ${styles.recommendedBadge}`}>⭐ Match Ideal</span>
                                )}

                                {/* Icon + Title */}
                                <div className={styles.profileHeader}>
                                    <div className={styles.profileIconWrap}>
                                        <span style={{ fontSize: '2rem' }}>{pmeta.icon}</span>
                                    </div>
                                    <div className={styles.profileHeading}>
                                        <span className={styles.profileEyebrow}>{theme.eyebrow}</span>
                                        <h4>{profile.label}</h4>
                                        <p className={styles.profileTone}>{pmeta.subtitle}</p>
                                    </div>
                                </div>
                                <p className={styles.profileNarrative}>{profileNarrative}</p>

                                {/* Stats */}
                                <div className={styles.profileStats}>
                                    <div className={styles.profileStat}>
                                        <span className="metric-label">Sensibilidade Geral</span>
                                        <span className={styles.profileValue}>{profile.general}</span>
                                    </div>
                                    <div className={styles.profileStat}>
                                        <span className="metric-label">ADS</span>
                                        <span className={styles.profileValue}>{profile.ads}</span>
                                    </div>
                                    <div className={styles.profileStat}>
                                        <span className="metric-label">cm/360°</span>
                                        <span className={styles.profileValue}>{profile.cmPer360}</span>
                                    </div>
                                </div>

                                {/* Scope Table — always available, toggle for non-recommended */}
                                <div className={styles.profileHighlights}>
                                    {profileHighlights.map((highlight) => (
                                        <div key={highlight} className={styles.profileHighlight}>
                                            {highlight}
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.profileScopePreview}>
                                    <span className={styles.profilePreviewLabel}>Miras mais afetadas</span>
                                    <div className={styles.profileMiniScopes}>
                                        {scopePreview.map((scope) => (
                                            <div key={scope.scopeName} className={styles.profileMiniScope}>
                                                <span className={styles.profileMiniScopeName}>{scope.scopeName}</span>
                                                <span className={styles.profileMiniScopeValue}>{formatSignedPercent(scope.changePercent)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {showScopes && (
                                    <div className={styles.scopeTableContainer}>
                                        <table className={styles.scopeTable}>
                                            <thead>
                                                <tr>
                                                    <th>Mira</th>
                                                    <th>Atual</th>
                                                    <th>Novo</th>
                                                    <th>Δ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {profile.scopes.map((s, idx) => (
                                                    <tr key={idx}>
                                                        <td className={styles.scopeName}>{s.scopeName}</td>
                                                        <td style={{ opacity: 0.6, fontSize: '0.8rem' }}>{s.current}</td>
                                                        <td className={styles.scopeValue}>{s.recommended}</td>
                                                        <td className={`${styles.scopeChange} ${s.changePercent > 0 ? styles.scopeChangePos : s.changePercent < 0 ? styles.scopeChangeNeg : styles.scopeChangeNeut}`}>
                                                            {s.changePercent > 0 ? '+' : ''}{s.changePercent}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Toggle scopes for non-recommended */}
                                {!isRecommended && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAllScopes(prev => ({ ...prev, [profile.type]: !prev[profile.type] }));
                                        }}
                                        className={styles.profileToggle}
                                    >
                                        {showScopes ? '▲ Esconder miras' : '▼ Ver miras detalhadas'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═══ Coach Feedback — Accordion + Grouped ═══ */}
            {groupedCoaching.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🏆 Plano do Coach</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        O coach abaixo prioriza o que mexe mais no resultado agora. Quando a amostra ainda está curta, a orientação vira plano de teste, não veredito final.
                    </p>
                    <div className={styles.coachList}>
                        {groupedCoaching.map((group, gi) => {
                            const c = group.items[0];
                            if (!c) return null;
                            const meta = DIAG_META[c.diagnosis.type] || { icon: '⚠️', label: '', color: '#f59e0b' };
                            const maxSeverity = Math.max(...group.items.map(i => i.diagnosis.severity));
                            const priorityColor = maxSeverity >= 4 ? '#ef4444' : maxSeverity >= 3 ? '#f59e0b' : '#22c55e';
                            const priorityLabel = maxSeverity >= 4 ? '🔴 CRÍTICO' : maxSeverity >= 3 ? '🟡 IMPORTANTE' : '🟢 MENOR';
                            const isOpen = expandedCoach === gi;

                            return (
                                <div
                                    key={gi}
                                    className={`glass-card ${styles.coachCard}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setExpandedCoach(isOpen ? null : gi)}
                                >
                                    {/* Accordion Header — always visible */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: priorityColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                                                {priorityLabel}
                                            </span>
                                            <span className="badge badge-info">{formatCoachMode(c.mode)}</span>
                                            <span className="badge badge-info">Conf. {formatEvidencePercent(c.evidence.confidence)}</span>
                                            <span className="badge badge-info">Cob. {formatEvidencePercent(c.evidence.coverage)}</span>
                                            {group.items.length > 1 && (
                                                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                                    ({group.items.length}x)
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <SeverityDots severity={maxSeverity} />
                                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                        </div>
                                    </div>

                                    {/* Summary always visible */}
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
                                        {c.whatIsWrong}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
                                        {c.verifyNextClip}
                                    </p>

                                    {/* Accordion Body — expandable */}
                                    <div style={{
                                        overflow: 'hidden',
                                        maxHeight: isOpen ? '800px' : '0',
                                        opacity: isOpen ? 1 : 0,
                                        transition: 'all 0.4s ease',
                                        marginTop: isOpen ? '16px' : '0',
                                    }}>
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                            <div className={styles.coachRow}>
                                                <span className={styles.coachLabel}>Mecânica do Erro</span>
                                                <p>{c.likelyCause}</p>
                                            </div>
                                            <div className={styles.coachRow}>
                                                <span className={styles.coachLabel}>Protocolo de Ajuste</span>
                                                <p>{c.whatToAdjust}</p>
                                            </div>
                                            {c.evidence.recommendedAttachments && c.evidence.recommendedAttachments.length > 0 && (
                                                <div className={styles.coachRow}>
                                                    <span className={styles.coachLabel}>Attachments para Testar</span>
                                                    <p>
                                                        {c.evidence.recommendedAttachments.map((attachment) => attachment.name).join(', ')}
                                                    </p>
                                                </div>
                                            )}
                                            <div className={styles.coachRow}>
                                                <span className={styles.coachLabel}>Como Validar</span>
                                                <p>{c.verifyNextClip}</p>
                                            </div>
                                            <div className={styles.coachRow}>
                                                <span className={styles.coachLabel}>🏋️ Drill Profissional</span>
                                                <p>{c.howToTest}</p>
                                            </div>

                                            {/* Adaptation bar */}
                                            <div className={styles.coachAdapt}>
                                                <div style={{ flex: 1 }}>
                                                    <span>⏱️ Ciclo de Adaptação Estimado</span>
                                                    <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${(c.adaptationTimeDays / 7) * 100}%`, background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)', borderRadius: '4px', transition: 'width 1s ease' }} />
                                                    </div>
                                                </div>
                                                <span className={styles.coachDays} style={{ marginLeft: '16px', whiteSpace: 'nowrap' }}>
                                                    {c.adaptationTimeDays} {c.adaptationTimeDays === 1 ? 'dia' : 'dias'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
