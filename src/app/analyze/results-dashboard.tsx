/**
 * Results Dashboard — Metrics, Diagnoses, Sensitivity, Coach.
 * Fully supports multi-spray aggregation and sub-session deep-dives.
 */

'use client';

import { useState } from 'react';
import type {
    AnalysisResult,
    CoachAttachmentEvidence,
    CoachFeedback,
    CoachDecisionTier,
    DiagnosisType,
    ProfileType,
    RecommendationEvidenceTier,
    SensitivityAcceptanceOutcome,
    SensitivityProfile,
    SensitivityRecommendationTier,
    VideoQualityBlockingReason,
    VideoQualityFrameIssue,
    VideoQualityFrameTimeline,
    VideoQualityTier,
} from '@/types/engine';
import { formatDiagnosisTruthLabel } from '@/core/measurement-truth';
import { formatAnalysisDistancePresentation } from './analysis-distance-presentation';
import { SprayTrailPanel } from './spray-trail-panel';
import { summarizeAnalysisTracking } from './tracking-summary';
import { createTrackingTimeline } from './tracking-timeline';
import { EvidenceChip } from '@/ui/components/evidence-chip';
import { LoopRail, type LoopStageKey } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import { ProLockPreview } from '@/ui/components/pro-lock-preview';
import {
    buildAdaptiveCoachLoopModel,
    buildAnalysisQuotaNoticeModel,
    buildCaptureGuidanceModel,
    buildEvidenceBadges,
    buildMasteryPillarCards,
    buildPremiumLockCards,
    buildPrecisionTrendBlockModel,
    buildResultMetricCards,
    buildResultVerdictModel,
    groupCoachFeedbackByDiagnosis,
    splitDiagnosesBySeverity,
    type ResultMetricTone,
} from './results-dashboard-view-model';
import styles from './analysis.module.css';

// ═══ Radial Gauge Component ═══
function RadialGauge({ value, max = 100, label, color }: { value: number; max?: number; label: string; color: string }) {
    const pct = Math.min(Math.max(value / max, 0), 1);
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct);
    const bgColor = 'rgba(255,255,255,0.06)';

    return (
        <div
            className={styles.radialGauge}
            style={{ '--gauge-color': color } as React.CSSProperties}
        >
            <svg
                width="100"
                height="100"
                viewBox="0 0 100 100"
                className={styles.radialGaugeSvg}
                role="img"
                aria-label={`${label}: ${Math.round(value)}`}
            >
                <title>{`${label}: ${Math.round(value)}`}</title>
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
            <span className={styles.radialGaugeLabel}>
                {label}
            </span>
        </div>
    );
}

interface Props {
    readonly result: AnalysisResult;
    readonly mode?: 'full' | 'audit-detail';
}

// ═══ Diagnosis Icons & Labels ═══
const DIAG_META: Record<DiagnosisType, { icon: string; color: string }> = {
    overpull: { icon: 'DOWN', color: '#ff3d3d' },
    underpull: { icon: 'UP', color: '#f59e0b' },
    late_compensation: { icon: 'LATE', color: '#f97316' },
    excessive_jitter: { icon: 'NOISE', color: '#ef4444' },
    horizontal_drift: { icon: 'DRIFT', color: '#a855f7' },
    inconsistency: { icon: 'VAR', color: '#eab308' },
    inconclusive: { icon: 'CHECK', color: '#f59e0b' },
};

function getDiagnosisMeta(type: DiagnosisType): { icon: string; label: string; color: string } {
    const meta = DIAG_META[type];

    return {
        ...meta,
        label: formatDiagnosisTruthLabel(type),
    };
}

// ═══ Profile Icons ═══
const PROFILE_META: Record<string, { subtitle: string }> = {
    low: { subtitle: 'Máx. Precisão' },
    balanced: { subtitle: 'Equilíbrio' },
    high: { subtitle: 'Máx. Velocidade' },
};

const PROFILE_THEME: Record<'low' | 'balanced' | 'high', { eyebrow: string; accent: string }> = {
    low: { eyebrow: 'Controle fino', accent: '#14b8a6' },
    balanced: { eyebrow: 'Faixa segura', accent: '#f59e0b' },
    high: { eyebrow: 'Entrada curta', accent: '#22c55e' },
};

function SensitivityProfileGlyph({ type }: { type: ProfileType }): React.JSX.Element {
    if (type === 'low') {
        return (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.8" opacity="0.8" />
                <path d="M14 5.5V9.5M14 18.5V22.5M5.5 14H9.5M18.5 14H22.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="14" cy="14" r="2.6" fill="currentColor" />
            </svg>
        );
    }

    if (type === 'high') {
        return (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M15.8 4.5L8.8 15.1H13.6L12.3 23.5L19.2 12.9H14.5L15.8 4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
        );
    }

    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="5" y="7" width="18" height="14" rx="7" stroke="currentColor" strokeWidth="1.8" opacity="0.85" />
            <path d="M14 7V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="14" cy="14" r="2.2" fill="currentColor" />
        </svg>
    );
}

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
    'Controle Vertical': 'Razão entre pulldown real vs ideal. 1.0 = ideal. >1 = desce demais. <1 = sobe demais.',
    'Ruído Horizontal': 'Variação lateral angular do spray em graus. Menor = mais estável.',
    'Ruido Horizontal': 'Variacao lateral angular do spray em graus. Menor = mais estavel.',
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

function finiteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getCoachFeedbackEvidenceDisplay(
    feedback: CoachFeedback,
    fallback: { readonly confidence: number; readonly coverage: number }
): {
    readonly confidenceLabel: string;
    readonly coverageLabel: string;
    readonly recommendedAttachments: readonly CoachAttachmentEvidence[];
    readonly isLegacyEvidence: boolean;
} {
    const evidence = feedback.evidence as Partial<CoachFeedback['evidence']> | undefined;
    const confidence = finiteNumber(evidence?.confidence)
        ?? finiteNumber(feedback.confidence)
        ?? fallback.confidence;
    const coverage = finiteNumber(evidence?.coverage) ?? fallback.coverage;
    const recommendedAttachments = Array.isArray(evidence?.recommendedAttachments)
        ? evidence.recommendedAttachments
        : [];

    return {
        confidenceLabel: formatEvidencePercent(confidence),
        coverageLabel: formatEvidencePercent(coverage),
        recommendedAttachments,
        isLegacyEvidence: !evidence || finiteNumber(evidence.confidence) === null || finiteNumber(evidence.coverage) === null,
    };
}

function resultToneClass(tone: ResultMetricTone): string {
    switch (tone) {
        case 'success':
            return styles.toneSuccess ?? '';
        case 'warning':
            return styles.toneWarning ?? '';
        case 'error':
            return styles.toneError ?? '';
        case 'info':
            return styles.toneInfo ?? '';
    }
}

function formatReportEvidenceLabel(confidence: number, coverage: number): string {
    return `${Math.round(confidence * 100)}% confianca / ${Math.round(coverage * 100)}% cobertura`;
}

function resolveReportLoopStage(input: {
    readonly quotaTone: ResultMetricTone | undefined;
    readonly adaptiveState: 'unsaved' | 'pending' | 'validation_needed' | 'conflict' | 'ready' | undefined;
    readonly hasNextBlock: boolean;
}): LoopStageKey {
    if (input.quotaTone === 'error') {
        return 'evidence';
    }

    if (input.adaptiveState === 'validation_needed' || input.adaptiveState === 'conflict') {
        return 'validation';
    }

    if (input.adaptiveState === 'pending' || input.adaptiveState === 'ready' || input.hasNextBlock) {
        return 'block';
    }

    return 'evidence';
}

function resolveReportPrimaryAction(input: {
    readonly quotaNotice: ReturnType<typeof buildAnalysisQuotaNoticeModel>;
    readonly adaptiveCoachLoop: ReturnType<typeof buildAdaptiveCoachLoopModel>;
    readonly historySessionId: string | null | undefined;
}): { readonly label: string; readonly href: string; readonly disabled?: boolean } {
    if (input.quotaNotice?.tone === 'error' && input.quotaNotice.href) {
        return {
            label: input.quotaNotice.href === '/billing' ? 'Ver Assinatura' : 'Ver Planos',
            href: input.quotaNotice.href,
        };
    }

    if (input.adaptiveCoachLoop?.cta.href) {
        return {
            label: input.adaptiveCoachLoop.cta.label,
            href: input.adaptiveCoachLoop.cta.href,
        };
    }

    if (input.historySessionId) {
        return {
            label: 'Registrar resultado do bloco',
            href: `/history/${input.historySessionId}`,
        };
    }

    return {
        label: 'Gravar analise util',
        href: '#save-analysis',
        disabled: true,
    };
}

function handleCardKeyboardActivation(
    event: React.KeyboardEvent<HTMLElement>,
    action: () => void
): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
        return;
    }

    event.preventDefault();
    action();
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

function formatCoachDecisionTierLabel(tier: CoachDecisionTier): string {
    switch (tier) {
        case 'capture_again':
            return 'Capturar novamente';
        case 'test_protocol':
            return 'Testar protocolo';
        case 'stabilize_block':
            return 'Estabilizar bloco';
        case 'apply_protocol':
            return 'Aplicar protocolo';
    }
}

function formatCoachDecisionTierReason(tier: CoachDecisionTier): string {
    switch (tier) {
        case 'capture_again':
            return 'A leitura ainda pede captura mais limpa antes de ajuste forte.';
        case 'test_protocol':
            return 'Existe direcao util, mas o proximo bloco ainda precisa confirmar.';
        case 'stabilize_block':
            return 'O foco dominante precisa de repeticao antes de mexer em mais variaveis.';
        case 'apply_protocol':
            return 'A evidencia sustenta aplicar o protocolo com validacao curta.';
    }
}

function formatSensitivityTierLabel(tier: SensitivityRecommendationTier): string {
    if (tier === 'capture_again') {
        return 'Gravar novo clip';
    }

    if (tier === 'apply_ready') {
        return 'Pronto para aplicar';
    }

    return 'Testar perfis';
}

function formatSensitivityEvidenceTier(evidenceTier: RecommendationEvidenceTier): string {
    if (evidenceTier === 'strong') {
        return 'forte';
    }

    if (evidenceTier === 'weak') {
        return 'fraca';
    }

    return 'moderada';
}

function formatSensitivityAcceptanceOutcome(outcome: SensitivityAcceptanceOutcome): string {
    if (outcome === 'improved') {
        return 'melhorou';
    }

    if (outcome === 'worse') {
        return 'piorou';
    }

    return 'ficou igual';
}

function buildSensitivityTierExplanation(
    tier: SensitivityRecommendationTier,
    sampleCount: number
): string {
    if (tier === 'capture_again') {
        return 'Este clip ainda nao sustenta mudanca segura de sens. O melhor proximo passo e repetir a captura com tracking mais limpo antes de mexer no setup.';
    }

    if (tier === 'apply_ready') {
        return `A recomendacao ja ganhou consistencia suficiente para aplicacao controlada. Ainda assim, valide em mais um bloco curto de ${sampleCount} sprays antes de tratar como ajuste permanente.`;
    }

    return `A direcao da leitura faz sentido, mas ainda esta em modo de teste. Use os perfis como experimento guiado e confirme a convergencia antes de consolidar a troca.`;
}

function buildSensitivitySummary(
    recommendedProfileLabel: string,
    topDiagnosisLabel: string | null,
    suggestedVsm: number | undefined,
    sampleCount: number,
    tier: SensitivityRecommendationTier,
    evidenceTier: RecommendationEvidenceTier,
    confidenceScore: number,
    confidence: number,
    coverage: number
): string {
    const parts = [
        `Perfil recomendado: ${recommendedProfileLabel}.`,
        `Tier atual: ${formatSensitivityTierLabel(tier)}.`,
    ];

    if (topDiagnosisLabel) {
        parts.push(`A prioridade desta leitura e ${topDiagnosisLabel.toLowerCase()}.`);
    } else {
        parts.push('A leitura nao encontrou um desvio dominante acima do restante.');
    }

    if (suggestedVsm !== undefined) {
        parts.push(`Teste tambem VSM ${suggestedVsm.toFixed(2)} como ponto de partida.`);
    }

    parts.push(`A evidencia especifica da sens esta ${formatSensitivityEvidenceTier(evidenceTier)} (${Math.round(confidenceScore * 100)}% de confianca interna).`);

    if (sampleCount < 3 && tier !== 'capture_again') {
        parts.push(`Como esta analise usa ${sampleCount} spray${sampleCount === 1 ? '' : 's'}, ainda nao vale tratar o ajuste como permanente.`);
    }

    if (confidence < 0.8 || coverage < 0.8) {
        parts.push('O tracking geral ainda pode ficar melhor, entao trate a recomendacao como orientacao calibrada, nao como leitura unica.');
    }

    return parts.join(' ');
}

function buildSensitivityDecisionInsight(
    recommended: ProfileType,
    tier: SensitivityRecommendationTier,
    evidenceTier: RecommendationEvidenceTier,
    confidenceScore: number,
    sampleCount: number
): { title: string; body: string } {
    if (recommended === 'balanced') {
        if (tier === 'capture_again' || evidenceTier === 'weak' || confidenceScore < 0.58) {
            return {
                title: 'Por que repetiu a Balanceada?',
                body: 'Porque este clip ainda não trouxe sinal forte o bastante para empurrar a sens de forma segura para Baixa ou Alta. Hoje o motor preferiu preservar uma faixa neutra em vez de inventar mudança agressiva.',
            };
        }

        if (tier === 'apply_ready') {
            return {
                title: 'Por que continuou Balanceada?',
                body: 'Porque a leitura entende que você já está perto do centro útil do seu setup. Nesse caso repetir a Balanceada é esperado: o sistema está lendo que vale lapidar, não virar o volante para um extremo.',
            };
        }

        return {
            title: 'Por que ficou Balanceada de novo?',
            body: `Porque a amostra ainda pede ajuste conservador. Com ${sampleCount} spray${sampleCount === 1 ? '' : 's'} validados, a direção existe, mas a evidência ainda não sustenta um salto permanente para um extremo.`,
        };
    }

    if (recommended === 'low') {
        return {
            title: 'Leitura atual: puxar para controle',
            body: 'Aqui o clip trouxe sinal suficiente de excesso de subida, jitter ou drift para abrir mais margem de controle. A ideia é ganhar estabilidade primeiro e depois reavaliar a velocidade.',
        };
    }

    return {
        title: 'Leitura atual: puxar para velocidade',
        body: 'Aqui o clip mostrou que você pode encurtar a resposta sem desmontar o spray. A recomendação sobe o ritmo, mas ainda pede validação curta antes de virar nova sens fixa.',
    };
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

export function ResultsDashboard({ result, mode = 'full' }: Props): React.JSX.Element {
    const [activeSession, setActiveSession] = useState<AnalysisResult>(result);
    const [expandedDiag, setExpandedDiag] = useState<number | null>(null);
    const [selectedProfileType, setSelectedProfileType] = useState<ProfileType | null>(null);
    const [expandedCoach, setExpandedCoach] = useState<number | null>(null);
    const [showMinorDiags, setShowMinorDiags] = useState(false);
    const isAggregated = activeSession.id === result.id;
    const subSessions = result.subSessions ?? [];
    const hasMultipleSubSessions = subSessions.length > 1;
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
    const coachPlan = activeSession.coachPlan;
    const sampleCount = isAggregated ? (result.subSessions?.length ?? 1) : 1;

    const stabilityVal = Number(metrics.stabilityScore);
    const consistencyVal = Number(metrics.consistencyScore);
    const stabilityColor = stabilityVal >= 70 ? '#22c55e' : stabilityVal >= 40 ? '#f59e0b' : '#ef4444';
    const consistencyColor = consistencyVal >= 65 ? '#22c55e' : consistencyVal >= 40 ? '#f59e0b' : '#ef4444';

    const metricCards = buildResultMetricCards({
        metrics,
        diagnoses,
        sensitivity,
        linearErrorLabel,
        linearErrorUnit,
    });

    const {
        sortedDiagnoses,
        majorDiagnoses: majorDiags,
        minorDiagnoses: minorDiags,
    } = splitDiagnosesBySeverity(diagnoses);
    const topDiagnosisType = sortedDiagnoses[0]?.type ?? null;
    const topDiagnosisMeta = sortedDiagnoses[0] ? getDiagnosisMeta(sortedDiagnoses[0].type) : null;
    const recommendedProfile = sensitivity.profiles.find((profile) => profile.type === sensitivity.recommended);
    const sensitivitySummary = buildSensitivitySummary(
        recommendedProfile?.label ?? 'Balanceada',
        topDiagnosisMeta?.label ?? null,
        sensitivity.suggestedVSM,
        sampleCount,
        sensitivity.tier,
        sensitivity.evidenceTier,
        sensitivity.confidenceScore,
        trackingOverview.confidence,
        trackingOverview.coverage
    );
    const sensitivityTierLabel = formatSensitivityTierLabel(sensitivity.tier);
    const sensitivityEvidenceLabel = formatSensitivityEvidenceTier(sensitivity.evidenceTier);
    const sensitivityTierExplanation = buildSensitivityTierExplanation(
        sensitivity.tier,
        sampleCount
    );
    const sensitivityAcceptanceFeedback = sensitivity.acceptanceFeedback;
    const sensitivityAcceptanceLabel = sensitivityAcceptanceFeedback
        ? formatSensitivityAcceptanceOutcome(sensitivityAcceptanceFeedback.outcome)
        : null;
    const selectedProfile = (sensitivity.profiles.find((profile) => profile.type === selectedProfileType)
        ?? recommendedProfile
        ?? sensitivity.profiles[0])!;
    const selectedProfileTheme = PROFILE_THEME[selectedProfile.type];
    const selectedProfileNarrative = buildProfileNarrative(
        selectedProfile,
        topDiagnosisType,
        selectedProfile.type === sensitivity.recommended
    );
    const sensitivityDecisionInsight = buildSensitivityDecisionInsight(
        sensitivity.recommended,
        sensitivity.tier,
        sensitivity.evidenceTier,
        sensitivity.confidenceScore,
        sampleCount
    );

    const groupedCoaching = groupCoachFeedbackByDiagnosis(coaching);
    const verdictModel = buildResultVerdictModel({
        mastery: activeSession.mastery,
        coachPlan,
        trackingOverview,
        sensitivity,
        diagnoses,
        analysisDecision: activeSession.analysisDecision,
    });
    const masteryPillars = activeSession.mastery
        ? buildMasteryPillarCards(activeSession.mastery)
        : [];
    const evidenceBadges = buildEvidenceBadges({
        mastery: activeSession.mastery,
        trackingOverview,
    });
    const adaptiveCoachLoop = buildAdaptiveCoachLoopModel(activeSession);
    const precisionTrendBlock = buildPrecisionTrendBlockModel(activeSession.precisionTrend);
    const quotaNotice = buildAnalysisQuotaNoticeModel({ quota: activeSession.quota ?? null });
    const premiumLocks = buildPremiumLockCards(activeSession.premiumProjection);
    const captureGuidance = buildCaptureGuidanceModel(activeSession);
    const reportEvidenceLabel = formatReportEvidenceLabel(trackingOverview.confidence, trackingOverview.coverage);
    const reportLoopStage = resolveReportLoopStage({
        quotaTone: quotaNotice?.tone,
        adaptiveState: adaptiveCoachLoop?.state,
        hasNextBlock: verdictModel.nextBlock !== null,
    });
    const primaryReportAction = resolveReportPrimaryAction({
        quotaNotice,
        adaptiveCoachLoop,
        historySessionId: activeSession.historySessionId,
    });
    const reportBlocked = verdictModel.scoreTone === 'error'
        || quotaNotice?.tone === 'error'
        || verdictModel.actionLabel === 'Capturar de novo'
        || verdictModel.actionLabel === 'Incerto';
    const visibleTruthLabel = `Confianca ${Math.round(trackingOverview.confidence * 100)}%, cobertura ${Math.round(trackingOverview.coverage * 100)}%, bloqueadores ${verdictModel.blockedReasons.length}.`;
    const showReportChrome = mode === 'full';

    return (
        <div className={`${styles.dashboard} ${mode === 'audit-detail' ? styles.dashboardAuditDetail : ''}`}>
            {showReportChrome ? (
                <PageCommandHeader
                body={verdictModel.primaryExplanation}
                className={styles.reportCommandHeader ?? ''}
                evidenceItems={[
                    { label: 'Confianca', value: `${Math.round(trackingOverview.confidence * 100)}%`, tone: verdictModel.scoreTone === 'error' ? 'warning' : 'info' },
                    { label: 'Cobertura', value: `${Math.round(trackingOverview.coverage * 100)}%`, tone: trackingOverview.coverage >= 0.8 ? 'success' : 'warning' },
                    { label: 'Bloqueadores', value: `${verdictModel.blockedReasons.length}`, tone: verdictModel.blockedReasons.length > 0 ? 'warning' : 'success' },
                ]}
                primaryAction={primaryReportAction}
                roleLabel="Relatorio de spray"
                title={`Resultado: ${verdictModel.actionLabel}`}
                />
            ) : null}
            {showReportChrome ? (
                <LoopRail
                blocked={reportBlocked}
                currentStage={reportLoopStage}
                evidenceLabel={reportEvidenceLabel}
                nextActionLabel={primaryReportAction.label}
                />
            ) : null}
            {showReportChrome ? (
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
                {isAggregated && hasMultipleSubSessions ? (
                    <span className="badge badge-info">
                        Media de {subSessions.length} sprays
                    </span>
                ) : null}
                </div>
            ) : null}
            {showReportChrome && quotaNotice ? (
                <section className={styles.quotaNotice} data-tone={quotaNotice.tone} aria-label="Estado da quota de saves">
                    <div>
                        <strong>{quotaNotice.label}</strong>
                        <p>{quotaNotice.body}</p>
                    </div>
                    <div className={styles.quotaNoticeAction}>
                        <span>{quotaNotice.usageLabel}</span>
                        {quotaNotice.href && quotaNotice.ctaLabel ? (
                            <a className="btn btn-ghost btn-sm" href={quotaNotice.href}>
                                {quotaNotice.ctaLabel}
                            </a>
                        ) : null}
                    </div>
                </section>
            ) : null}
            {showReportChrome ? (
                <section className={styles.premiumLockPanel} aria-label="Guia de captura e estado Pro">
                <div className={styles.premiumLockIntro}>
                    <span className={styles.reportEyebrow}>Free / Pro</span>
                    <h3>{captureGuidance.title}</h3>
                    {captureGuidance.weakCaptureBody ? (
                        <p>{captureGuidance.weakCaptureBody}</p>
                    ) : (
                        <p>Free continua mostrando a verdade do clip. Pro abre o plano completo, historico profundo, metricas avancadas e loop de validacao quando a evidencia sustenta.</p>
                    )}
                </div>
                <div className={styles.captureGuidanceGrid}>
                    {captureGuidance.checklist.map((item) => (
                        <span key={item}>{item}</span>
                    ))}
                </div>
                {premiumLocks.length > 0 ? (
                    <div className={styles.premiumLockGrid}>
                        {premiumLocks.map((lock) => (
                            <ProLockPreview
                                key={`${lock.featureKey}-${lock.reasonLabel}`}
                                {...(lock.ctaLabel === 'Abrir billing' ? { ctaLabel: 'Ver Assinatura' } : {})}
                                currentValueLabel={visibleTruthLabel}
                                lock={{
                                    featureKey: lock.featureKey,
                                    reason: lock.reason,
                                    title: lock.title,
                                    body: lock.body,
                                    ctaHref: lock.href,
                                }}
                                proValueLabel="Pro adiciona protocolo completo, historico profundo e validacao compativel quando a evidencia sustenta."
                            />
                        ))}
                    </div>
                ) : null}
                </section>
            ) : null}
            {/* ═══ Sub-Sessions Selector ═══ */}
            {hasMultipleSubSessions ? (
                <section className={styles.section} aria-labelledby="spray-segments-title">
                    <h3 id="spray-segments-title" className={styles.sectionTitle}>Sprays analisados</h3>
                    <div className={styles.subSessionsGrid}>
                        <button
                            type="button"
                            className={`${styles.subSessionCard} ${isAggregated ? styles.subSessionCardActive : ''}`}
                            onClick={() => setActiveSession(result)}
                            aria-pressed={isAggregated}
                            aria-label="Ver media consolidada dos sprays"
                        >
                            <strong>Media consolidada</strong>
                            <span>{subSessions.length} sprays</span>
                        </button>
                        {subSessions.map((sub, idx) => (
                            <button
                                key={sub.id}
                                type="button"
                                className={`${styles.subSessionCard} ${activeSession.id === sub.id ? styles.subSessionCardActive : ''}`}
                                onClick={() => setActiveSession(sub)}
                                aria-pressed={activeSession.id === sub.id}
                                aria-label={`Ver spray ${idx + 1}`}
                            >
                                <strong>Spray #{idx + 1}</strong>
                                <span>
                                    {(sub.trajectory.durationMs / 1000).toFixed(1)}s
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}

            <section className={styles.verdictReport} aria-labelledby="measurement-truth-title">
                <div className={styles.verdictHeader}>
                    <div className={styles.verdictHeaderMain}>
                        <span className={styles.reportEyebrow}>Leitura de mastery</span>
                        <h3 id="measurement-truth-title" className={styles.verdictTitle}>
                            {verdictModel.actionLabel}
                        </h3>
                        <p className={styles.verdictText}>{verdictModel.primaryExplanation}</p>
                        {verdictModel.diagnosisLabel ? (
                            <span className="badge badge-info">
                                Sinal principal: {verdictModel.diagnosisLabel}
                            </span>
                        ) : null}
                    </div>
                    <div className={styles.verdictScoreGrid}>
                        <MetricTile
                            helper="score acionavel"
                            label="Acao"
                            tone={verdictModel.scoreTone}
                            value={String(Math.round(verdictModel.actionableScore))}
                        />
                        <MetricTile
                            helper={`${Math.round(verdictModel.mechanicalScore)}/100`}
                            label="Mecanica"
                            tone="info"
                            value={verdictModel.mechanicalLevelLabel}
                        />
                    </div>
                </div>

                <div className={styles.verdictContentGrid}>
                    {verdictModel.nextBlock ? (
                        <div className={styles.nextBlockPanel}>
                            <div className={styles.nextBlockHeader}>
                                <span className={styles.reportEyebrow}>Proximo bloco</span>
                                <span className="badge badge-info">{verdictModel.nextBlock.durationLabel}</span>
                            </div>
                            <h4 className={styles.nextBlockTitle}>{verdictModel.nextBlock.title}</h4>
                            <ol className={styles.nextBlockSteps}>
                                {verdictModel.nextBlock.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                            {verdictModel.nextBlock.validationSuccess ? (
                                <p className={styles.nextBlockValidation}>
                                    <strong>{verdictModel.nextBlock.validationLabel}</strong>
                                    {verdictModel.nextBlock.validationTarget ? `: ${verdictModel.nextBlock.validationTarget}. ` : '. '}
                                    {verdictModel.nextBlock.validationSuccess}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className={styles.evidenceBadgeGrid} aria-label="Evidencia do resultado">
                        {evidenceBadges.map((badge) => (
                            <EvidenceChip
                                key={badge.key}
                                detail={badge.detail}
                                label={badge.label}
                                tone={badge.tone}
                                value={badge.value}
                            />
                        ))}
                    </div>
                </div>

                {verdictModel.blockedReasons.length > 0 ? (
                    <div className={styles.verdictCautions}>
                        {verdictModel.blockedReasons.slice(0, 3).map((reason) => (
                            <span key={reason}>{reason}</span>
                        ))}
                    </div>
                ) : null}

                {masteryPillars.length > 0 ? (
                    <div className={styles.pillarGrid} aria-label="Pilares de mastery">
                        {masteryPillars.map((pillar) => (
                            <MetricTile
                                key={pillar.key}
                                helper={pillar.summary}
                                label={pillar.label}
                                tone={pillar.tone}
                                value={String(Math.round(pillar.value))}
                            />
                        ))}
                    </div>
                ) : null}

                <SprayTrailPanel
                    actionLabel={verdictModel.actionLabel}
                    blockerReasons={verdictModel.blockedReasons}
                    confidence={trackingOverview.confidence}
                    coverage={trackingOverview.coverage}
                    framesLost={trackingOverview.framesLost}
                    framesProcessed={trackingOverview.framesProcessed}
                    shotResiduals={activeSession.metrics.shotResiduals}
                    trajectory={activeSession.trajectory}
                />
            </section>

            {adaptiveCoachLoop ? (
                <section
                    className={`${styles.adaptiveCoachLoop} ${resultToneClass(adaptiveCoachLoop.cta.tone)}`}
                    aria-labelledby="adaptive-coach-loop-title"
                >
                    <div className={styles.adaptiveCoachHeader}>
                        <div className={styles.adaptiveCoachIntro}>
                            <span className={styles.reportEyebrow}>Coach Extremo</span>
                            <h3 id="adaptive-coach-loop-title" className={styles.adaptiveCoachTitle}>
                                {adaptiveCoachLoop.statusLabel}
                            </h3>
                            <p className={styles.adaptiveCoachBody}>{adaptiveCoachLoop.statusBody}</p>
                        </div>
                        <div className={styles.adaptiveCoachBadges}>
                            {adaptiveCoachLoop.badges.map((badge) => (
                                <span key={badge.key} className={`badge ${badge.tone === 'error' ? 'badge-warning' : badge.tone === 'success' ? 'badge-success' : 'badge-info'}`} title={badge.detail}>
                                    {badge.label}: {badge.value}
                                </span>
                            ))}
                        </div>
                    </div>

                    {adaptiveCoachLoop.warningCopy ? (
                        <div className={styles.adaptiveCoachWarning} role="status">
                            {adaptiveCoachLoop.warningCopy}
                        </div>
                    ) : null}

                    <div className={styles.adaptiveCoachGrid}>
                        <div className={styles.adaptiveCoachFocus}>
                            <span className={styles.reportEyebrow}>Foco principal</span>
                            <h4>{adaptiveCoachLoop.primaryFocus.title}</h4>
                            <p>{adaptiveCoachLoop.primaryFocus.whyNow}</p>
                            <div className={styles.adaptiveCoachChips}>
                                <span>{adaptiveCoachLoop.primaryFocus.area}</span>
                                <span>Conf. {adaptiveCoachLoop.primaryFocus.confidenceLabel}</span>
                                <span>Cob. {adaptiveCoachLoop.primaryFocus.coverageLabel}</span>
                            </div>
                            {adaptiveCoachLoop.secondaryFocuses.length > 0 ? (
                                <div className={styles.adaptiveCoachSecondary} aria-label="Focos secundarios">
                                    {adaptiveCoachLoop.secondaryFocuses.map((focus) => (
                                        <span key={`${focus.area}-${focus.title}`}>
                                            {focus.title}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className={styles.adaptiveCoachBlock}>
                            <div className={styles.nextBlockHeader}>
                                <span className={styles.reportEyebrow}>Proximo bloco</span>
                                <span className="badge badge-info">{adaptiveCoachLoop.nextBlock.durationLabel}</span>
                            </div>
                            <h4>{adaptiveCoachLoop.nextBlock.title}</h4>
                            <ol>
                                {adaptiveCoachLoop.nextBlock.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                            {adaptiveCoachLoop.nextBlock.validationTarget ? (
                                <p>Validar: {adaptiveCoachLoop.nextBlock.validationTarget}</p>
                            ) : null}
                        </div>
                    </div>

                    <div className={styles.adaptiveCoachFooter}>
                        {adaptiveCoachLoop.cta.href ? (
                            <a href={adaptiveCoachLoop.cta.href} className="btn btn-primary">
                                {adaptiveCoachLoop.cta.label}
                            </a>
                        ) : (
                            <span className={styles.adaptiveCoachDisabledCta}>
                                {adaptiveCoachLoop.cta.label}
                            </span>
                        )}
                        <span>{adaptiveCoachLoop.tierLabel} exige feedback do bloco e validacao compativel antes de consolidar.</span>
                    </div>
                </section>
            ) : null}

            {precisionTrendBlock ? (
                <section
                    className={`${styles.precisionTrendBlock} ${resultToneClass(precisionTrendBlock.tone)}`}
                    aria-labelledby="precision-trend-title"
                >
                    <div className={styles.precisionTrendHeader}>
                        <div className={styles.precisionTrendIntro}>
                            <span className={styles.reportEyebrow}>Controle de precisao</span>
                            <h3 id="precision-trend-title" className={styles.precisionTrendTitle}>
                                {precisionTrendBlock.label}
                            </h3>
                            <p className={styles.precisionTrendBody}>{precisionTrendBlock.body}</p>
                        </div>
                        <div className={styles.precisionTrendBadges}>
                            <span className="badge badge-info">{precisionTrendBlock.compatibleCountLabel}</span>
                            <span className="badge badge-info">{precisionTrendBlock.evidenceSummary}</span>
                        </div>
                    </div>

                    <div className={styles.precisionTrendGrid}>
                        <div className={styles.precisionTrendMain}>
                            <span className={styles.reportEyebrow}>Proxima validacao</span>
                            <p>{precisionTrendBlock.nextValidationHint}</p>
                            {precisionTrendBlock.conservativeReason ? (
                                <p className={styles.precisionTrendReason}>{precisionTrendBlock.conservativeReason}</p>
                            ) : null}
                            <a href="/analyze" className={styles.precisionTrendCta}>
                                {precisionTrendBlock.ctaLabel}
                            </a>
                        </div>

                        {precisionTrendBlock.deltaItems.length > 0 ? (
                            <div className={styles.precisionTrendDeltas} aria-label="Deltas essenciais">
                                {precisionTrendBlock.deltaItems.map((item) => (
                                    <div key={item.key} className={`${styles.precisionTrendDelta} ${resultToneClass(item.tone)}`}>
                                        <span>{item.label}</span>
                                        <strong>{item.value}</strong>
                                        <small>{item.detail}</small>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {precisionTrendBlock.pillarChips.length > 0 ? (
                        <div className={styles.precisionTrendPillars} aria-label="Deltas por pilar">
                            {precisionTrendBlock.pillarChips.map((chip) => (
                                <span key={chip.key} className={`${styles.precisionTrendPillar} ${resultToneClass(chip.tone)}`} title={chip.detail}>
                                    {chip.label} {chip.value}
                                </span>
                            ))}
                        </div>
                    ) : null}

                    {precisionTrendBlock.blockerReasons.length > 0 ? (
                        <div className={styles.precisionTrendBlockers} aria-label="Motivos de bloqueio do trend">
                            {precisionTrendBlock.blockerReasons.map((reason) => (
                                <span key={reason}>{reason}</span>
                            ))}
                        </div>
                    ) : null}
                </section>
            ) : null}

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
            <div className={styles.metricsReportGrid}>
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Metricas salvas {isAggregated ? '(medias)' : ''}</h3>

                    {/* Gauge Charts for key scores */}
                    <div className={styles.gaugeRow}>
                        <RadialGauge value={stabilityVal} label="Estabilidade" color={stabilityColor} />
                        <RadialGauge value={consistencyVal} label="Consistência" color={consistencyColor} />
                        <RadialGauge value={Number(metrics.sprayScore || 0)} label="Spray Score" color={Number(metrics.sprayScore || 0) >= 60 ? '#22c55e' : Number(metrics.sprayScore || 0) >= 30 ? '#f59e0b' : '#ef4444'} />
                    </div>

                    <div className={styles.metricsGrid}>
                        {metricCards.map((m, i) => (
                            <div
                                key={m.label}
                                className={`glass-card ${styles.metricCard} ${resultToneClass(m.tone)} animate-fade-in-up stagger-${i + 1}`}
                            >
                                <div className={styles.metricCardHeader}>
                                    <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {m.label} <MetricTooltip text={m.label === linearErrorLabel ? (distanceNote ?? METRIC_TOOLTIPS['Erro Linear'] ?? '') : (METRIC_TOOLTIPS[m.label] || '')} />
                                    </span>
                                    <span className={styles.metricStatus}>{m.summary}</span>
                                </div>
                                <span className={`metric-value ${styles.metricValueTone}`}>
                                    {m.value}
                                </span>
                                <span className={styles.metricUnit}>{m.unit}</span>
                                <div className={styles.metricReferenceRow}>
                                    <span>{m.reference}</span>
                                    <span>{m.meterPercent}%</span>
                                </div>
                                <div className={styles.metricMeter} aria-hidden="true">
                                    <span style={{ width: `${m.meterPercent}%` }} />
                                </div>
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

            </div>

            {/* ═══ Diagnoses — Improved ═══ */}
            {sortedDiagnoses.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Leituras da analise</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        A análise destaca primeiro o que mais está derrubando o spray agora. Use os blocos abaixo como priorização prática, não como rótulo fechado.
                    </p>
                    <div className={styles.diagnosisList}>
                        {/* Major diagnoses (severity >= 3) — always visible */}
                        {majorDiags.map((d, i) => {
                            const meta = getDiagnosisMeta(d.type);
                            const matchingCoach = coaching.find(c => c.diagnosis.type === d.type);
                            const isExpanded = expandedDiag === i;
                            const diagnosisTone = resultToneClass(d.severity >= 4 ? 'error' : d.severity >= 3 ? 'warning' : 'success');
                            const diagnosisConfidence = d.confidence ?? d.evidence?.confidence;

                            return (
                                <div
                                    key={d.type + i}
                                    className={`glass-card ${styles.diagnosisCard} ${diagnosisTone}`}
                                    style={{ borderLeftColor: meta.color, cursor: 'pointer' }}
                                    onClick={() => setExpandedDiag(isExpanded ? null : i)}
                                    onKeyDown={(event) => handleCardKeyboardActivation(event, () => setExpandedDiag(isExpanded ? null : i))}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
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
                                    {(d.dominantPhase || diagnosisConfidence !== undefined || d.evidence) ? (
                                        <div className={styles.diagnosisEvidenceStrip}>
                                            {d.dominantPhase ? <span>Fase {d.dominantPhase}</span> : null}
                                            {diagnosisConfidence !== undefined ? <span>Conf. {formatEvidencePercent(diagnosisConfidence)}</span> : null}
                                            {d.evidence ? <span>Cob. {formatEvidencePercent(d.evidence.coverage)}</span> : null}
                                            {d.evidence ? <span>Erro {d.evidence.linearErrorCm.toFixed(1)}cm</span> : null}
                                        </div>
                                    ) : null}
                                    <div className={styles.diagnosisActionGrid}>
                                        <div>
                                            <span className={styles.diagnosisActionLabel}>Por que acontece</span>
                                            <p>{d.cause}</p>
                                        </div>
                                        <div>
                                            <span className={styles.diagnosisActionLabel}>Como corrigir</span>
                                            <p>{d.remediation}</p>
                                        </div>
                                    </div>
                                    {matchingCoach && (
                                        <div style={{ marginTop: '12px', overflow: 'hidden', maxHeight: isExpanded ? '300px' : '0', opacity: isExpanded ? 1 : 0, transition: 'all 0.3s ease' }}>
                                            <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drill profissional</span>
                                                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '6px' }}>{matchingCoach.howToTest}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Adaptacao estimada</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                                                        {matchingCoach.adaptationTimeDays} {matchingCoach.adaptationTimeDays === 1 ? 'dia' : 'dias'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {matchingCoach && (
                                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                            {isExpanded ? 'Fechar drill' : 'Ver drill profissional'}
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
                                    {showMinorDiags ? 'Esconder' : 'Mostrar'} {minorDiags.length} diagnostico{minorDiags.length > 1 ? 's' : ''} menor{minorDiags.length > 1 ? 'es' : ''}
                                </button>

                                {showMinorDiags && minorDiags.map((d, i) => {
                                    const meta = getDiagnosisMeta(d.type);
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
                <h3 className={styles.sectionTitle}>Sensibilidade recomendada</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)', lineHeight: 1.6 }}>
                    {sensitivitySummary}
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-lg)', opacity: 0.75 }}>
                    Base atual: cobertura {formatEvidencePercent(trackingOverview.coverage)}, confianca {formatEvidencePercent(trackingOverview.confidence)} e {sampleCount} spray{sampleCount === 1 ? '' : 's'} validado{sampleCount === 1 ? '' : 's'}.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                    <span className={sensitivity.tier === 'apply_ready' ? 'badge badge-success' : sensitivity.tier === 'capture_again' ? 'badge badge-warning' : 'badge badge-info'}>
                        Tier {sensitivityTierLabel}
                    </span>
                    <span className="badge badge-info">
                        Evidencia {sensitivityEvidenceLabel}
                    </span>
                    <span className="badge badge-info">
                        Confianca da sens {Math.round(sensitivity.confidenceScore * 100)}%
                    </span>
                    {sensitivity.historyConvergence ? (
                        <span className="badge badge-info">
                            Historico {sensitivity.historyConvergence.consideredSessions} sessoes
                        </span>
                    ) : null}
                    {sensitivity.acceptanceFeedback ? (
                        <span className={sensitivity.acceptanceFeedback.outcome === 'improved' ? 'badge badge-success' : sensitivity.acceptanceFeedback.outcome === 'worse' ? 'badge badge-warning' : 'badge badge-info'}>
                            Teste real {sensitivityAcceptanceLabel}
                        </span>
                    ) : null}
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                    {sensitivityTierExplanation}
                </p>
                <div className={styles.sensitivityInsight}>
                    <div className={styles.sensitivityInsightHeader}>
                        <span className="badge badge-info">{sensitivityDecisionInsight.title}</span>
                        <span className="badge badge-info">
                            Perfil atual {recommendedProfile?.label ?? 'Balanceada'}
                        </span>
                    </div>
                    <p className={styles.sensitivityInsightText}>{sensitivityDecisionInsight.body}</p>
                </div>
                {sensitivity.historyConvergence ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                        {sensitivity.historyConvergence.summary}
                    </p>
                ) : null}
                {sensitivity.acceptanceFeedback ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                        Resultado validado no historico: o perfil {recommendedProfile?.label ?? sensitivity.acceptanceFeedback.testedProfile} {sensitivityAcceptanceLabel} em teste real. Ultimo registro em {new Date(sensitivity.acceptanceFeedback.recordedAt).toLocaleString('pt-BR')}.
                    </p>
                ) : null}
                <div className={styles.profilesGrid}>
                    {sensitivity.profiles.map(profile => {
                        const pmeta = PROFILE_META[profile.type] || { subtitle: '' };
                        const isRecommended = profile.type === sensitivity.recommended;
                        const isSelected = profile.type === selectedProfile.type;
                        const theme = PROFILE_THEME[profile.type];
                        const profileNarrative = buildProfileNarrative(profile, topDiagnosisType, isRecommended);
                        const profileHighlights = buildProfileHighlights(profile, topDiagnosisType);
                        const scopePreview = getProfileScopePreview(profile);

                        return (
                            <div
                                key={profile.type}
                                className={`glass-card ${styles.profileCard} ${isRecommended ? styles.profileRecommended : ''} ${isSelected ? styles.profileCardActive : ''}`}
                                style={{
                                    ...(isRecommended ? {} : { opacity: 0.82 }),
                                    ['--profile-accent' as string]: theme.accent,
                                }}
                            >
                                {isRecommended && (
                                    <span className={`badge badge-success ${styles.recommendedBadge}`}>⭐ Match sugerido</span>
                                )}

                                {/* Icon + Title */}
                                <div className={styles.profileHeader}>
                                    <div className={styles.profileIconWrap}>
                                        <span className={styles.profileGlyph} aria-hidden="true">
                                            <SensitivityProfileGlyph type={profile.type} />
                                        </span>
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

                                <button
                                    type="button"
                                    onClick={() => setSelectedProfileType(profile.type)}
                                    className={styles.profileToggle}
                                    aria-pressed={isSelected}
                                >
                                    {isSelected ? 'Ajuste em foco abaixo' : 'Ver ajuste completo'}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div
                    className={`glass-card ${styles.selectedProfilePanel}`}
                    style={{ ['--profile-accent' as string]: selectedProfileTheme.accent }}
                >
                    <div className={styles.selectedProfileHeader}>
                        <div className={styles.selectedProfileIntro}>
                            <div className={styles.profileIconWrap}>
                                <span className={styles.profileGlyph} aria-hidden="true">
                                    <SensitivityProfileGlyph type={selectedProfile.type} />
                                </span>
                            </div>
                            <div>
                                <span className={styles.profileEyebrow}>Tabela completa de miras</span>
                                <h4 className={styles.selectedProfileTitle}>{selectedProfile.label}</h4>
                                <p className={styles.selectedProfileText}>{selectedProfileNarrative}</p>
                            </div>
                        </div>
                        <div className={styles.selectedProfileMeta}>
                            <span className={selectedProfile.type === sensitivity.recommended ? 'badge badge-success' : 'badge badge-info'}>
                                {selectedProfile.type === sensitivity.recommended ? 'Match sugerido' : 'Perfil alternativo'}
                            </span>
                            <span className="badge badge-info">Geral {selectedProfile.general}</span>
                            <span className="badge badge-info">ADS {selectedProfile.ads}</span>
                            <span className="badge badge-info">{selectedProfile.cmPer360} cm/360°</span>
                        </div>
                    </div>
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
                                {selectedProfile.scopes.map((scope) => (
                                    <tr key={`${selectedProfile.type}-${scope.scopeName}`}>
                                        <td className={styles.scopeName}>{scope.scopeName}</td>
                                        <td style={{ opacity: 0.6, fontSize: '0.8rem' }}>{scope.current}</td>
                                        <td className={styles.scopeValue}>{scope.recommended}</td>
                                        <td className={`${styles.scopeChange} ${scope.changePercent > 0 ? styles.scopeChangePos : scope.changePercent < 0 ? styles.scopeChangeNeg : styles.scopeChangeNeut}`}>
                                            {scope.changePercent > 0 ? '+' : ''}{scope.changePercent}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ═══ Coach Feedback — Accordion + Grouped ═══ */}
            {(coachPlan || groupedCoaching.length > 0) && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Plano do coach</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        O coach abaixo prioriza o que mexe mais no resultado agora. Quando a amostra ainda está curta, a orientação vira plano de teste, não resultado fechado.
                    </p>
                    {coachPlan ? (
                        <div className={styles.coachPlanSummary}>
                            <div className={styles.coachPlanHeader}>
                                <div className={styles.coachPlanIntro}>
                                    <span className={styles.coachPlanLabel}>Veredito da sessao</span>
                                    <h4 className={styles.coachPlanVerdict}>
                                        {formatCoachDecisionTierLabel(coachPlan.tier)}
                                    </h4>
                                    <p className={styles.coachPlanSummaryText}>{coachPlan.sessionSummary}</p>
                                </div>
                                <div className={styles.coachPlanBadges}>
                                    <span className="badge badge-info">
                                        {formatCoachDecisionTierLabel(coachPlan.tier)}
                                    </span>
                                    <span className="badge badge-info">
                                        Conf. {formatEvidencePercent(coachPlan.primaryFocus.confidence)}
                                    </span>
                                    <span className="badge badge-info">
                                        Cob. {formatEvidencePercent(coachPlan.primaryFocus.coverage)}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.coachPlanGrid}>
                                <div className={styles.coachPlanCell}>
                                    <span className={styles.coachPlanLabel}>Foco principal</span>
                                    <strong className={styles.coachPlanValue}>{coachPlan.primaryFocus.title}</strong>
                                    <p className={styles.coachPlanText}>{coachPlan.primaryFocus.whyNow}</p>
                                </div>
                                <div className={styles.coachPlanCell}>
                                    <span className={styles.coachPlanLabel}>Proximo bloco</span>
                                    <strong className={styles.coachPlanValue}>{coachPlan.nextBlock.title}</strong>
                                    <ol className={styles.coachPlanSteps}>
                                        {coachPlan.nextBlock.steps.slice(0, 3).map((step) => (
                                            <li key={step} className={styles.coachPlanStep}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                            <div className={styles.coachPlanValidation}>
                                <span className={styles.coachPlanLabel}>Motivo do tier</span>
                                <p className={styles.coachPlanText}>{formatCoachDecisionTierReason(coachPlan.tier)}</p>
                                {coachPlan.nextBlock.checks[0] ? (
                                    <p className={styles.coachPlanText}>
                                        Criterio de validacao: {coachPlan.nextBlock.checks[0].successCondition}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                    {groupedCoaching.length > 0 ? (
                        <h4 className={styles.coachEvidenceTitle}>Evidencia detalhada do Coach</h4>
                    ) : null}
                    <div className={styles.coachList}>
                        {groupedCoaching.map((group, gi) => {
                            const c = group.items[0];
                            if (!c) return null;
                            const meta = getDiagnosisMeta(c.diagnosis.type);
                            const maxSeverity = group.maxSeverity;
                            const priorityToneClass = resultToneClass(group.priorityTone);
                            const isOpen = expandedCoach === gi;
                            const coachEvidence = getCoachFeedbackEvidenceDisplay(c, {
                                confidence: trackingOverview.confidence,
                                coverage: trackingOverview.coverage,
                            });

                            return (
                                <div
                                    key={gi}
                                    className={`glass-card ${styles.coachCard} ${priorityToneClass}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setExpandedCoach(isOpen ? null : gi)}
                                    onKeyDown={(event) => handleCardKeyboardActivation(event, () => setExpandedCoach(isOpen ? null : gi))}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isOpen}
                                >
                                    {/* Accordion Header — always visible */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                                            <span className={styles.coachPriority}>
                                                {group.priorityLabel}
                                            </span>
                                            <span className="badge badge-info">{formatCoachMode(c.mode)}</span>
                                            <span className="badge badge-info">Conf. {coachEvidence.confidenceLabel}</span>
                                            <span className="badge badge-info">Cob. {coachEvidence.coverageLabel}</span>
                                            {coachEvidence.isLegacyEvidence ? (
                                                <span className="badge badge-warning">Evidencia legada</span>
                                            ) : null}
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
                                            {coachEvidence.recommendedAttachments.length > 0 ? (
                                                <div className={styles.coachRow}>
                                                    <span className={styles.coachLabel}>Attachments para Testar</span>
                                                    <p>
                                                        {coachEvidence.recommendedAttachments.map((attachment) => attachment.name).join(', ')}
                                                    </p>
                                                </div>
                                            ) : null}
                                            <div className={styles.coachRow}>
                                                <span className={styles.coachLabel}>Como Validar</span>
                                                <p>{c.verifyNextClip}</p>
                                            </div>
                                            <div className={styles.coachRow}>
                                                <span className={styles.coachLabel}>Drill profissional</span>
                                                <p>{c.howToTest}</p>
                                            </div>

                                            {/* Adaptation bar */}
                                            <div className={styles.coachAdapt}>
                                                <div style={{ flex: 1 }}>
                                                    <span>Ciclo de adaptacao estimado</span>
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
