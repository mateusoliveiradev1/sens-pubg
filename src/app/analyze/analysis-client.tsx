/**
 * Analysis Client - upload, setup, and spray analysis pipeline.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    validateAndPrepareVideo,
    releaseVideoUrl,
    extractFrames,
    detectSprayValidity,
    sliceExtractedFramesToWindow,
    buildTrajectory,
    calculateSprayMetrics,
    runDiagnostics,
    generateSensitivityRecommendation,
    generateCoaching,
    resolveMeasurementTruth,
    resolveAnalysisDecision,
} from '@/core';
import type { VideoMetadata } from '@/core';
import { buildCoachPlan } from '@/core/coach-plan-builder';
import type {
    AnalysisDistanceMode,
    AnalysisDecision,
    AnalysisResult,
    SprayValidityReport,
    GripAttachment,
    GripStyle,
    MuzzleAttachment,
    PlayStyle,
    PlayerStance,
    StockAttachment,
    VideoQualityBlockingReason,
    VideoQualityFrameIssue,
    VideoQualityFrameTimeline,
    VideoQualityTier,
    WeaponLoadout,
} from '@/types/engine';
import type { WeaponCategory } from '@/game/pubg/weapon-data';
import { CURRENT_PUBG_PATCH_VERSION, SCOPE_LIST } from '@/game/pubg';
import { getAnalysisSaveAccess, saveAnalysisResult } from '@/actions/history';
import type { PlayerProfile, weaponProfiles } from '@/db/schema';
import { ResultsDashboard } from './results-dashboard';
import { AnalysisGuide } from './analysis-guide';
import { UploadDropzone } from './upload-dropzone';
import { createAnalysisContext } from './analysis-context';
import {
    resolvePersistedAnalysisWeaponId,
    resolvePreferredAnalysisWeaponId,
    resolveSupportedAnalysisWeapon,
    summarizeAnalysisWeaponSupport,
} from './analysis-weapon-support';
import { resolveAnalysisResolutionY } from './analysis-profile';
import {
    calculateExpectedSprayDurationSeconds,
    resolveSprayProjectionConfig,
    resolveWorkerAttachmentMultipliers,
} from './analysis-session-config';
import { formatSprayClipDurationLabel } from '@/core';
import { mapWorkerTrackingResultToEngine } from './tracking-result-mapper';
import { runWorkerTrackingAnalysis } from './analysis-worker-runner';
import { buildAnalysisQuotaNoticeModel } from './results-dashboard-view-model';
import styles from './analysis.module.css';
import type { AnalysisSaveAccessState } from '@/types/monetization';

const clipDurationLabel = formatSprayClipDurationLabel('pt-BR');

const MUZZLE_LABELS: Record<MuzzleAttachment, string> = {
    none: 'Nenhum',
    compensator: 'Compensator',
    flash_hider: 'Flash Hider',
    suppressor: 'Suppressor',
    muzzle_brake: 'Muzzle Brake',
    choke: 'Choke',
    duckbill: 'Duckbill',
};

const GRIP_LABELS: Record<GripAttachment, string> = {
    none: 'Nenhum',
    vertical: 'Vertical Grip',
    angled: 'Angled Grip',
    half: 'Half Grip',
    thumb: 'Thumb Grip',
    lightweight: 'Lightweight Grip',
    laser: 'Laser Sight',
    ergonomic: 'Ergonomic Grip',
    tilted: 'Tilted Grip',
};

const STOCK_LABELS: Record<StockAttachment, string> = {
    none: 'Nenhuma',
    tactical: 'Tactical Stock',
    heavy: 'Heavy Stock',
    folding: 'Folding Stock',
    cheek_pad: 'Cheek Pad',
};

const DISTANCE_PRESETS = [25, 50, 75, 100, 150, 200] as const;
const DISTANCE_UNKNOWN_REFERENCE_METERS = 30;
const GRIP_OPTIONS: readonly GripAttachment[] = ['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic', 'tilted'];
const QUALITY_BLOCKING_REASON_LABELS: Record<VideoQualityBlockingReason, string> = {
    low_sharpness: 'baixa nitidez',
    high_compression_burden: 'compressao pesada',
    low_reticle_contrast: 'baixo contraste da mira',
    unstable_roi: 'instabilidade visual na area da mira',
    unstable_fps: 'instabilidade de frame rate',
};
const QUALITY_TIER_LABELS: Record<VideoQualityTier, string> = {
    cinematic: 'Cinematico',
    production_ready: 'Producao',
    analysis_ready: 'Analisavel',
    limited: 'Limitado',
    poor: 'Fraco',
};
const QUALITY_FRAME_ISSUE_LABELS: Record<VideoQualityFrameIssue, string> = {
    low_sharpness: 'baixa nitidez',
    compression: 'compressao',
    low_reticle_contrast: 'baixo contraste',
    reticle_lost: 'mira perdida',
};

type AnalysisStep = 'upload' | 'settings' | 'processing' | 'done' | 'error';
type ProcessingPhase = 'extracting' | 'tracking' | 'calculating' | 'diagnosing' | 'done';
type CrosshairColor = 'RED' | 'GREEN';

interface Props {
    readonly profile: PlayerProfile;
    readonly dbWeapons: (typeof weaponProfiles.$inferSelect)[];
}

function formatPreviewClipDuration(durationSeconds: number): string {
    const hasFraction = Math.abs(durationSeconds - Math.round(durationSeconds)) >= 0.05;
    const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: hasFraction ? 1 : 0,
        maximumFractionDigits: 1,
    }).format(durationSeconds);

    return `${formatted}s`;
}

function formatQualityBlockingReasons(reasons: readonly VideoQualityBlockingReason[]): string {
    return reasons.map((reason) => QUALITY_BLOCKING_REASON_LABELS[reason] ?? reason).join(', ');
}

function formatDiagnosticWindow(startMs: number, endMs: number): string {
    return `${(startMs / 1000).toFixed(2)}s - ${(endMs / 1000).toFixed(2)}s`;
}

function formatSprayValidityBlockerMessage(report: SprayValidityReport): string {
    const reasons = report.blockerReasons.length > 0
        ? report.blockerReasons.join(', ')
        : 'spray invalido';
    const guidance = report.recaptureGuidance.join(' ');

    return `Clip bloqueado antes do rastreio (${reasons}). ${guidance}`;
}

function attachSprayValidityToVideoQualityReport(
    report: AnalysisResult['videoQualityReport'],
    sprayValidity: SprayValidityReport,
): AnalysisResult['videoQualityReport'] {
    if (!report) {
        return report;
    }

    const diagnostic = report.diagnostic ?? {
        tier: report.usableForAnalysis ? 'analysis_ready' as const : 'poor' as const,
        summary: 'Auditoria de validade do spray salva junto com a analise.',
        recommendations: sprayValidity.recaptureGuidance,
        preprocessing: {
            normalizationApplied: false,
            sampledFrames: sprayValidity.frameCount,
            selectedFrames: sprayValidity.shotLikeEvents,
        },
    };

    return {
        ...report,
        diagnostic: {
            ...diagnostic,
            preprocessing: {
                ...diagnostic.preprocessing,
                ...(sprayValidity.window ? { sprayWindow: sprayValidity.window } : {}),
                sprayValidity,
                validityBlockerReasons: sprayValidity.blockerReasons,
                recaptureGuidance: sprayValidity.recaptureGuidance,
            },
        },
    };
}

function resolveDecisionEvidence(
    metrics: AnalysisResult['metrics'],
    trajectory: AnalysisResult['trajectory'],
    sprayValidity?: SprayValidityReport,
): { readonly confidence: number; readonly coverage: number } {
    const quality = metrics.metricQuality?.sprayScore
        ?? metrics.metricQuality?.shotResiduals
        ?? metrics.metricQuality?.verticalControlIndex;
    const framesProcessed = quality?.framesProcessed ?? trajectory.framesProcessed ?? trajectory.totalFrames ?? 0;
    const framesTracked = quality?.framesTracked ?? trajectory.visibleFrames ?? trajectory.framesTracked ?? 0;
    const fallbackCoverage = framesProcessed > 0
        ? framesTracked / framesProcessed
        : (sprayValidity ? sprayValidity.shotLikeEvents / Math.max(sprayValidity.frameCount - 1, 1) : 0);

    return {
        confidence: quality?.confidence ?? trajectory.trackingQuality ?? sprayValidity?.confidence ?? 0,
        coverage: quality?.coverage ?? fallbackCoverage,
    };
}

function resolveAnalysisDecisionForResult(input: {
    readonly metrics: AnalysisResult['metrics'];
    readonly trajectory: AnalysisResult['trajectory'];
    readonly videoQualityReport: AnalysisResult['videoQualityReport'];
    readonly sprayValidity?: SprayValidityReport;
    readonly blockerReasons?: readonly AnalysisDecision['blockerReasons'][number][];
    readonly commercialEvidence?: boolean;
}): AnalysisDecision {
    const evidence = resolveDecisionEvidence(input.metrics, input.trajectory, input.sprayValidity);

    return resolveAnalysisDecision({
        ...(input.sprayValidity ? { sprayValidity: input.sprayValidity } : {}),
        ...(input.blockerReasons ? { blockerReasons: input.blockerReasons } : {}),
        ...(input.videoQualityReport ? { videoQualityUsable: input.videoQualityReport.usableForAnalysis } : {}),
        confidence: evidence.confidence,
        coverage: evidence.coverage,
        commercialEvidence: input.commercialEvidence === true,
    });
}

function QualityTimelineEvidence({ timeline }: { readonly timeline: VideoQualityFrameTimeline }): React.JSX.Element {
    const totalFrames = Math.max(timeline.summary.totalFrames, 1);
    const readableFrames = timeline.summary.goodFrames + timeline.summary.degradedFrames;
    const readablePercent = Math.round((readableFrames / totalFrames) * 100);

    return (
        <div style={{ marginTop: 'var(--space-md)', display: 'grid', gap: '10px' }}>
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
                            Trecho {formatDiagnosticWindow(Number(segment.startMs), Number(segment.endMs))}: {QUALITY_FRAME_ISSUE_LABELS[segment.primaryIssue]} ({segment.frameCount} frames)
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

export function AnalysisClient({ profile, dbWeapons }: Props): React.JSX.Element {
    const [step, setStep] = useState<AnalysisStep>('upload');
    const [video, setVideo] = useState<VideoMetadata | null>(null);
    const [weaponId, setWeaponId] = useState('');
    const [scopeId, setScopeId] = useState('red-dot');
    const [distance, setDistance] = useState(30);
    const [distanceMode, setDistanceMode] = useState<AnalysisDistanceMode>('estimated');
    const [stance, setStance] = useState<PlayerStance>('standing');
    const [muzzle, setMuzzle] = useState<MuzzleAttachment>('none');
    const [grip, setGrip] = useState<GripAttachment>('none');
    const [stock, setStock] = useState<StockAttachment>('none');
    const [crosshairColor, setCrosshairColor] = useState<CrosshairColor>('RED');
    const [markers, setMarkers] = useState<{ id: string; time: number }[]>([{ id: crypto.randomUUID(), time: 0 }]);
    const [phase, setPhase] = useState<ProcessingPhase>('extracting');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [qualityWarning, setQualityWarning] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isValidatingUpload, setIsValidatingUpload] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [worker, setWorker] = useState<Worker | null>(null);
    const [saveAccess, setSaveAccess] = useState<AnalysisSaveAccessState | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const nextWorker = new Worker(new URL('../../workers/aimAnalyzer.worker.ts', import.meta.url));
        setWorker(nextWorker);

        return () => nextWorker.terminate();
    }, []);

    useEffect(() => {
        let active = true;

        getAnalysisSaveAccess()
            .then((access) => {
                if (active) {
                    setSaveAccess(access);
                }
            })
            .catch((accessError) => {
                console.error('[getAnalysisSaveAccess]', accessError);
            });

        return () => {
            active = false;
        };
    }, []);

    const weaponSupport = useMemo(() => summarizeAnalysisWeaponSupport(dbWeapons), [dbWeapons]);

    const preferredWeaponId = useMemo(
        () => resolvePreferredAnalysisWeaponId(weaponSupport.supported),
        [weaponSupport.supported]
    );

    useEffect(() => {
        const currentSelectionSupported = weaponSupport.supported.some((entry) => entry.dbWeapon.id === weaponId);
        if (currentSelectionSupported || weaponId === preferredWeaponId) {
            return;
        }

        setWeaponId(preferredWeaponId);
    }, [preferredWeaponId, weaponId, weaponSupport.supported]);

    const weaponsByCategory = useMemo(() => {
        const grouped: Record<string, (typeof weaponProfiles.$inferSelect)[]> = {};

        for (const weapon of weaponSupport.supported.map((entry) => entry.dbWeapon)) {
            if (!grouped[weapon.category]) grouped[weapon.category] = [];
            grouped[weapon.category]!.push(weapon);
        }

        return grouped;
    }, [weaponSupport.supported]);

    const currentWeaponEntry = useMemo(
        () => resolveSupportedAnalysisWeapon(weaponSupport.supported, weaponId),
        [weaponId, weaponSupport.supported]
    );
    const currentDbWeapon = currentWeaponEntry?.dbWeapon;
    const uploadWeapon = currentWeaponEntry
        ? {
            id: currentWeaponEntry.dbWeapon.id,
            name: currentWeaponEntry.dbWeapon.name,
            category: currentWeaponEntry.dbWeapon.category,
            supportStatus: currentWeaponEntry.supportStatus,
        }
        : null;

    const effectiveDistanceMeters = distanceMode === 'unknown' ? DISTANCE_UNKNOWN_REFERENCE_METERS : distance;
    const hasAttachment = (type: string) => currentDbWeapon?.attachments?.includes(type);

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        setQualityWarning(null);
        setIsValidatingUpload(true);

        try {
            const prepared = await validateAndPrepareVideo(file);
            if (!prepared.valid) {
                setError(prepared.error.message);
                return;
            }

            if (!prepared.metadata.qualityReport.usableForAnalysis) {
                setQualityWarning(
                    `Qualidade estimada do clip: ${Math.round(prepared.metadata.qualityReport.overallScore)}/100. A leitura vai seguir, mas pode ficar mais conservadora. Pontos detectados: ${formatQualityBlockingReasons(prepared.metadata.qualityReport.blockingReasons)}.`
                );
            }
            else if (prepared.metadata.height < 1080) {
                setQualityWarning(`Resolucao detectada: ${prepared.metadata.height}p. Recomendamos 1080p para maior precisao.`);
            } else if (prepared.metadata.fps < 59) {
                setQualityWarning(`Framerate detectado: ${Math.round(prepared.metadata.fps)} FPS. Recomendamos 60 FPS para capturar cada micro-ajuste.`);
            } else if (prepared.metadata.qualityReport.overallScore < 60) {
                setQualityWarning(`Qualidade estimada do clip: ${Math.round(prepared.metadata.qualityReport.overallScore)}/100. O video e analisavel, mas ainda pode limitar a precisao fina.`);
            }

            setVideo(prepared.metadata);
            setMarkers([{ id: crypto.randomUUID(), time: 0 }]);
            setStep('settings');
        } finally {
            setIsValidatingUpload(false);
        }
    }, []);

    const addMarker = useCallback(() => {
        setMarkers((current) => [
            ...current,
            { id: crypto.randomUUID(), time: video?.duration ? video.duration / 2 : 0 },
        ]);
    }, [video]);

    const removeMarker = useCallback((id: string) => {
        setMarkers((current) => (current.length > 1 ? current.filter((marker) => marker.id !== id) : current));
    }, []);

    const updateMarker = useCallback((id: string, time: number) => {
        setMarkers((current) => current.map((marker) => (marker.id === id ? { ...marker, time } : marker)));

        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!video || !worker) return;

        setStep('processing');
        setPhase('extracting');
        setProgress(0);

        try {
            const selectedWeapon = resolveSupportedAnalysisWeapon(weaponSupport.supported, weaponId);
            const persistedWeaponId = resolvePersistedAnalysisWeaponId(
                weaponSupport.supported,
                weaponId,
            );

            if (!selectedWeapon) {
                throw new Error('A arma selecionada ainda nao possui perfil tecnico completo para analise.');
            }

            if (!persistedWeaponId) {
                throw new Error('Nao foi possivel resolver o identificador tecnico da arma selecionada.');
            }

            const dbWeapon = selectedWeapon.dbWeapon;
            const weaponData = selectedWeapon.technicalWeapon;

            const analysisContext = createAnalysisContext({
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                scopeId,
                distanceMeters: effectiveDistanceMeters,
                distanceMode,
            });
            const coachingContext = {
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                opticId: analysisContext.optic.opticId,
                opticStateId: analysisContext.optic.opticStateId,
                targetDistanceMeters: analysisContext.targetDistanceMeters,
                weaponName: dbWeapon.name,
                weaponCategory: dbWeapon.category,
                ...(analysisContext.distanceMode
                    ? { distanceMode: analysisContext.distanceMode }
                    : {}),
            } as const;
            const loadout: WeaponLoadout = { stance, muzzle, grip, stock };
            const expectedDurationSecs = calculateExpectedSprayDurationSeconds(weaponData);
            const projectionConfig = resolveSprayProjectionConfig({
                widthPx: video.width,
                heightPx: video.height,
                baseHorizontalFovDegrees: profile.fov ?? 90,
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                ...analysisContext.optic,
            });
            const currentMultipliers = resolveWorkerAttachmentMultipliers(
                {
                    canonicalProfile: dbWeapon.canonicalProfile,
                    multipliers: dbWeapon.multipliers,
                },
                loadout
            );

            const subSessions: AnalysisResult[] = [];
            const stepIncrement = 100 / markers.length;

            for (let index = 0; index < markers.length; index++) {
                const marker = markers[index]!;

                const context = {
                    fov: profile.fov ?? 90,
                    resolutionY: resolveAnalysisResolutionY(profile),
                    weapon: {
                        id: dbWeapon.id,
                        name: dbWeapon.name,
                        category: dbWeapon.category,
                        baseVerticalRecoil: dbWeapon.baseVerticalRecoil,
                        baseHorizontalRng: dbWeapon.baseHorizontalRng,
                        fireRateMs: dbWeapon.fireRateMs,
                        multipliers: dbWeapon.multipliers,
                    },
                    multipliers: currentMultipliers,
                    vsm: profile.verticalMultiplier || 1.0,
                    crosshairColor,
                    opticState: analysisContext.optic.opticStateId,
                    opticStateConfidence: analysisContext.optic.ambiguityNote ? 0.5 : 1,
                };

                const extractedFrames = await extractFrames(video.url, Math.min(video.fps, 60), marker.time, expectedDurationSecs, (frameProgress) => {
                    setProgress((index * stepIncrement) + (frameProgress.percent * 0.5 * (stepIncrement / 100)));
                });
                const sprayValidity = detectSprayValidity(extractedFrames, {
                    targetColor: crosshairColor,
                });

                if (sprayValidity.decisionLevel === 'blocked_invalid_clip') {
                    throw new Error(formatSprayValidityBlockerMessage(sprayValidity));
                }

                const framesForTracking = sprayValidity.window
                    ? sliceExtractedFramesToWindow(extractedFrames, sprayValidity.window)
                    : extractedFrames;

                setPhase('tracking');

                const trackingProgressStart = (index * stepIncrement) + (stepIncrement * 0.5);
                const trackingProgressEnd = (index * stepIncrement) + (stepIncrement * 0.85);

                const workerResult = await runWorkerTrackingAnalysis({
                    worker,
                    frames: framesForTracking,
                    context,
                    startX: video.width / 2,
                    startY: video.height / 2,
                    progressStart: trackingProgressStart,
                    progressEnd: trackingProgressEnd,
                    onProgress: setProgress,
                });

                setPhase('calculating');
                setProgress((index * stepIncrement) + (stepIncrement * 0.9));

                const trajectory = buildTrajectory(mapWorkerTrackingResultToEngine(workerResult), weaponData);
                const sprayMetrics = calculateSprayMetrics(trajectory, weaponData, loadout, projectionConfig, effectiveDistanceMeters);
                const weaponCategory = (dbWeapon.category || 'ar').toLowerCase() as WeaponCategory;
                const videoQualityReport = attachSprayValidityToVideoQualityReport(video.qualityReport, sprayValidity);
                const analysisDecision = resolveAnalysisDecisionForResult({
                    metrics: sprayMetrics,
                    trajectory,
                    videoQualityReport,
                    sprayValidity,
                });
                const diagnoses = runDiagnostics(sprayMetrics, weaponCategory, { analysisDecision });
                const pMouseDpi = profile.mouseDpi ?? 800;
                const pPlayStyle = (profile.playStyle as PlayStyle) || 'hybrid';
                const pGripStyle = (profile.gripStyle as GripStyle) || 'claw';
                const pMousepadWidth = profile.mousepadWidth ?? 40;
                const pDeskSpace = profile.deskSpace ?? pMousepadWidth;
                const pScopeSens = profile.scopeSens ?? {};
                const pVerticalMultiplier = profile.verticalMultiplier ?? 1.0;

                const subSessionWithoutMastery: AnalysisResult = {
                    id: crypto.randomUUID(),
                    timestamp: new Date(),
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    analysisContext,
                    ...(videoQualityReport ? { videoQualityReport } : {}),
                    trajectory,
                    loadout,
                    metrics: sprayMetrics,
                    diagnoses,
                    analysisDecision,
                    sensitivity: generateSensitivityRecommendation(sprayMetrics, diagnoses, pMouseDpi, pPlayStyle, pGripStyle, pMousepadWidth, pScopeSens as Record<string, number>, pVerticalMultiplier, 1, pDeskSpace, analysisDecision),
                    coaching: generateCoaching(diagnoses, loadout, coachingContext),
                };
                const subSessionCoachPlan = buildCoachPlan({ analysisResult: subSessionWithoutMastery });

                subSessions.push({
                    ...subSessionWithoutMastery,
                    coachPlan: subSessionCoachPlan,
                    mastery: resolveMeasurementTruth({
                        ...subSessionWithoutMastery,
                        coachPlan: subSessionCoachPlan,
                    }),
                });

                setProgress((index + 1) * stepIncrement);
            }

            const totalDuration = subSessions.reduce((sum, session) => sum + session.trajectory.durationMs, 0) || 1;
            const finalMetrics = {
                ...subSessions[0]!.metrics,
                stabilityScore: Math.round(subSessions.reduce((sum, session) => sum + (session.metrics.stabilityScore * session.trajectory.durationMs), 0) / totalDuration) as never,
                verticalControlIndex: Number((subSessions.reduce((sum, session) => sum + (session.metrics.verticalControlIndex * session.trajectory.durationMs), 0) / totalDuration).toFixed(2)),
                horizontalNoiseIndex: Number((subSessions.reduce((sum, session) => sum + (session.metrics.horizontalNoiseIndex * session.trajectory.durationMs), 0) / totalDuration).toFixed(2)),
                angularErrorDegrees: Number((subSessions.reduce((sum, session) => sum + (session.metrics.angularErrorDegrees * session.trajectory.durationMs), 0) / totalDuration).toFixed(3)),
                linearErrorCm: Number((subSessions.reduce((sum, session) => sum + (session.metrics.linearErrorCm * session.trajectory.durationMs), 0) / totalDuration).toFixed(1)),
                linearErrorSeverity: Number((subSessions.reduce((sum, session) => sum + (session.metrics.linearErrorSeverity * session.trajectory.durationMs), 0) / totalDuration).toFixed(1)),
                targetDistanceMeters: effectiveDistanceMeters,
                initialRecoilResponseMs: Math.round(subSessions.reduce((sum, session) => sum + (session.metrics.initialRecoilResponseMs * session.trajectory.durationMs), 0) / totalDuration) as never,
                consistencyScore: Math.round(subSessions.reduce((sum, session) => sum + (session.metrics.consistencyScore * session.trajectory.durationMs), 0) / totalDuration) as never,
                burstVCI: subSessions.reduce((sum, session) => sum + (session.metrics.burstVCI * session.trajectory.durationMs), 0) / totalDuration,
                sustainedVCI: subSessions.reduce((sum, session) => sum + (session.metrics.sustainedVCI * session.trajectory.durationMs), 0) / totalDuration,
                fatigueVCI: subSessions.reduce((sum, session) => sum + (session.metrics.fatigueVCI * session.trajectory.durationMs), 0) / totalDuration,
            };

            const finalWeaponCategory = (dbWeapon.category || 'ar').toLowerCase() as WeaponCategory;
            const finalVideoQualityReport = subSessions[0]?.videoQualityReport ?? video.qualityReport;
            const finalBlockerReasons = Array.from(new Set(
                subSessions.flatMap((session) => session.analysisDecision?.blockerReasons ?? [])
            ));
            const finalAnalysisDecision = resolveAnalysisDecisionForResult({
                metrics: finalMetrics,
                trajectory: subSessions[0]!.trajectory,
                videoQualityReport: finalVideoQualityReport,
                blockerReasons: finalBlockerReasons,
                commercialEvidence: subSessions.length >= 3,
            });
            const finalDiagnoses = runDiagnostics(finalMetrics, finalWeaponCategory, {
                analysisDecision: finalAnalysisDecision,
            });
            const fMouseDpi = profile.mouseDpi ?? 800;
            const fPlayStyle = (profile.playStyle as PlayStyle) || 'hybrid';
            const fGripStyle = (profile.gripStyle as GripStyle) || 'claw';
            const fMousepadWidth = profile.mousepadWidth ?? 40;
            const fDeskSpace = profile.deskSpace ?? fMousepadWidth;
            const fScopeSens = profile.scopeSens ?? {};
            const fVerticalMultiplier = profile.verticalMultiplier ?? 1.0;

            const finalResultWithoutMastery: AnalysisResult = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                analysisContext,
                ...(finalVideoQualityReport ? { videoQualityReport: finalVideoQualityReport } : {}),
                trajectory: subSessions[0]!.trajectory,
                loadout: { stance, muzzle, grip, stock },
                metrics: finalMetrics,
                diagnoses: finalDiagnoses,
                analysisDecision: finalAnalysisDecision,
                sensitivity: generateSensitivityRecommendation(finalMetrics, finalDiagnoses, fMouseDpi, fPlayStyle, fGripStyle, fMousepadWidth, fScopeSens as Record<string, number>, fVerticalMultiplier, subSessions.length, fDeskSpace, finalAnalysisDecision),
                coaching: generateCoaching(finalDiagnoses, { stance, muzzle, grip, stock }, coachingContext),
                subSessions,
            };
            const finalCoachPlan = buildCoachPlan({ analysisResult: finalResultWithoutMastery });
            const finalResult: AnalysisResult = {
                ...finalResultWithoutMastery,
                coachPlan: finalCoachPlan,
                mastery: resolveMeasurementTruth({
                    ...finalResultWithoutMastery,
                    coachPlan: finalCoachPlan,
                }),
            };

            let resultToDisplay: AnalysisResult = finalResult;

            try {
                const persisted = await saveAnalysisResult(
                    finalResult,
                    persistedWeaponId,
                    scopeId,
                    effectiveDistanceMeters,
                );
                if (persisted.result) {
                    resultToDisplay = persisted.result;
                }
                if (!persisted.success) {
                    console.error('[saveAnalysisResult]', persisted.error);
                }
            } catch (saveError) {
                console.error('[saveAnalysisResult]', saveError);
            }

            setResult(resultToDisplay);
            setStep('done');
        } catch (analysisError) {
            console.error('[Analysis Error]:', analysisError);
            setError(analysisError instanceof Error ? analysisError.message : 'Erro na analise');
            setStep('error');
        }
    }, [video, worker, weaponSupport.supported, weaponId, scopeId, effectiveDistanceMeters, distanceMode, markers, muzzle, profile, crosshairColor, stance, grip, stock]);

    const handleReset = useCallback(() => {
        if (video) releaseVideoUrl(video.url);
        setVideo(null);
        setStep('upload');
        setResult(null);
        setError(null);
        setQualityWarning(null);
        setDragActive(false);
        setIsValidatingUpload(false);
    }, [video]);

    const phaseLabels: Record<ProcessingPhase, string> = {
        extracting: 'Lendo frames no navegador',
        tracking: 'Rastreando mira...',
        calculating: 'Calculando metricas...',
        diagnosing: 'Diagnosticando...',
        done: 'Analise concluida!',
    };
    const uploadedQualityDiagnostic = video?.qualityReport.diagnostic;
    const uploadedQualityTimeline = uploadedQualityDiagnostic?.timeline;
    const saveAccessNotice = buildAnalysisQuotaNoticeModel({ saveAccess });
    const uploadGuidance = `Grave ${clipDurationLabel}, reticulo visivel, uma arma, um spray continuo.`;
    const uploadRequirementLabel = `MP4/WebM, ${clipDurationLabel}, ate 50MB`;
    const uploadState = isValidatingUpload
        ? 'validating'
        : error
            ? 'invalid_file'
            : saveAccessNotice?.tone === 'error'
                ? 'quota_exhausted'
                : saveAccessNotice?.tone === 'warning'
                    ? 'quota_warning'
                    : 'empty';

    if (step === 'upload') {
        return (
            <div>
                <UploadDropzone
                    clipRequirementLabel={uploadRequirementLabel}
                    dragActive={dragActive}
                    errorMessage={error}
                    guidance={uploadGuidance}
                    onDragActiveChange={setDragActive}
                    onFileSelected={(file) => void handleFile(file)}
                    onOpenGuide={() => setIsGuideOpen(true)}
                    quotaNotice={saveAccessNotice}
                    selectedWeapon={uploadWeapon}
                    state={uploadState}
                />

                <AnalysisGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            </div>
        );
    }
    if (step === 'settings' && video) {
        return (
            <div className="animate-fade-in">
                <div className={`glass-card ${styles.videoPreview}`}>
                    <video ref={videoRef} src={video.url} controls className={styles.video} />
                    <div className={styles.videoMeta}>
                        <span className="badge badge-info">{video.width}x{video.height}</span>
                        <span className="badge badge-info">{formatPreviewClipDuration(video.duration)}</span>
                        <span className="badge badge-info">{video.fps} FPS</span>
                    </div>
                    <UploadDropzone
                        clipRequirementLabel={uploadRequirementLabel}
                        density="compact"
                        dragActive={dragActive}
                        guidance={uploadGuidance}
                        onDragActiveChange={setDragActive}
                        onFileSelected={(file) => void handleFile(file)}
                        qualityMessage={qualityWarning}
                        selectedFileLabel={`Clip local pronto: ${video.width}x${video.height}, ${formatPreviewClipDuration(video.duration)}, ${video.fps} FPS`}
                        selectedWeapon={uploadWeapon}
                        state={qualityWarning ? 'quality_warning' : 'file_selected'}
                    />
                </div>

                {qualityWarning ? (
                    <div className={styles.qualityWarning}>
                        <span className={styles.warningIcon}>!</span>
                        <div className={styles.warningText}>
                            <strong>Aviso de Qualidade:</strong> {qualityWarning}
                        </div>
                    </div>
                ) : null}

                {saveAccessNotice ? (
                    <div className={styles.quotaNotice} data-tone={saveAccessNotice.tone}>
                        <div>
                            <strong>{saveAccessNotice.label}</strong>
                            <p>{saveAccessNotice.body}</p>
                        </div>
                        <div className={styles.quotaNoticeAction}>
                            <span>{saveAccessNotice.usageLabel}</span>
                            {saveAccessNotice.href && saveAccessNotice.ctaLabel ? (
                                <a className="btn btn-ghost btn-sm" href={saveAccessNotice.href}>
                                    {saveAccessNotice.ctaLabel}
                                </a>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {uploadedQualityDiagnostic ? (
                    <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                            <div>
                                <span className="metric-label">Laudo do clip</span>
                                <h3 style={{ marginTop: '6px', marginBottom: '6px' }}>
                                    {QUALITY_TIER_LABELS[uploadedQualityDiagnostic.tier]}
                                </h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                    {uploadedQualityDiagnostic.summary}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignContent: 'flex-start' }}>
                                <span className="badge badge-info">
                                    {uploadedQualityDiagnostic.preprocessing.normalizationApplied ? 'Normalizacao ativa' : 'Sem normalizacao'}
                                </span>
                                <span className="badge badge-info">
                                    {uploadedQualityDiagnostic.preprocessing.selectedFrames}/{uploadedQualityDiagnostic.preprocessing.sampledFrames} frames uteis
                                </span>
                                {uploadedQualityDiagnostic.preprocessing.sprayWindow ? (
                                    <span className="badge badge-success">
                                        Janela {formatDiagnosticWindow(
                                            Number(uploadedQualityDiagnostic.preprocessing.sprayWindow.startMs),
                                            Number(uploadedQualityDiagnostic.preprocessing.sprayWindow.endMs)
                                        )}
                                    </span>
                                ) : (
                                    <span className="badge badge-warning">Janela automatica nao encontrada</span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {uploadedQualityDiagnostic.recommendations.map((recommendation) => (
                                <p key={recommendation} style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                                    - {recommendation}
                                </p>
                            ))}
                        </div>
                        {uploadedQualityTimeline ? (
                            <QualityTimelineEvidence timeline={uploadedQualityTimeline} />
                        ) : null}
                    </div>
                ) : null}

                <div className={`glass-card ${styles.settingsForm}`}>
                    <h3>Checklist do clip</h3>
                    <div className={styles.metadataChecklist} aria-label="Checklist guiado de setup">
                        <span>1. Clip validado no navegador</span>
                        <span>2. Arma e mira conferidas</span>
                        <span>3. Distancia aproximada honesta</span>
                        <span>4. Inicio do spray marcado</span>
                    </div>
                    <div className={styles.settingsGrid}>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="weapon">Arma *</label>
                            <select id="weapon" className="input select" value={weaponId} onChange={(event) => setWeaponId(event.target.value)}>
                                {Object.entries(weaponsByCategory).map(([category, weapons]) => (
                                    <optgroup key={category} label={category.toUpperCase()}>
                                        {weapons.map((weapon) => (
                                            <option key={weapon.id} value={weapon.id}>{weapon.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            {currentWeaponEntry ? (
                                <div className={styles.weaponSupportHint}>
                                    <strong>{currentWeaponEntry.supportStatus.label}</strong>
                                    <p>{currentWeaponEntry.supportStatus.description}</p>
                                </div>
                            ) : null}
                            {weaponSupport.unsupported.length > 0 ? (
                                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                                    {weaponSupport.unsupported.length} arma(s) seguem como suporte visual e ficam fora desta analise porque ainda nao possuem perfil tecnico completo no motor.
                                </p>
                            ) : null}
                        </div>

                        <div className={styles.field}>
                            <label className="input-label" htmlFor="scope">Mira *</label>
                            <select id="scope" className="input select" value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                                {SCOPE_LIST.map((scope) => (
                                    <option key={scope.id} value={scope.id}>{scope.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                            <label className="input-label">Distancia aproximada</label>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                                Nao precisa ser exata. Se o alvo estiver entre placas, escolha a faixa mais proxima.
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                <button
                                    type="button"
                                    className={`btn ${distanceMode === 'estimated' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                    aria-pressed={distanceMode === 'estimated'}
                                    onClick={() => setDistanceMode('estimated')}
                                >
                                    Tenho nocao
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${distanceMode === 'unknown' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                    aria-pressed={distanceMode === 'unknown'}
                                    onClick={() => setDistanceMode('unknown')}
                                >
                                    Nao sei
                                </button>
                            </div>

                            {distanceMode === 'unknown' ? (
                                <div className={styles.qualityWarning} style={{ marginBottom: 0 }}>
                                    <span className={styles.warningIcon}>i</span>
                                    <div className={styles.warningText}>
                                        Vamos usar <strong>{DISTANCE_UNKNOWN_REFERENCE_METERS}m</strong> como referencia neutra para as metricas em cm. O padrao do spray e o erro angular continuam sendo priorizados.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                        {DISTANCE_PRESETS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                className={`btn ${distance === preset ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                onClick={() => setDistance(preset)}
                                            >
                                                {preset}m
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                        <input
                                            id="dist"
                                            type="range"
                                            className="slider"
                                            min={10}
                                            max={300}
                                            step={5}
                                            value={distance}
                                            onChange={(event) => setDistance(Number(event.target.value))}
                                        />
                                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-primary)', minWidth: '72px' }}>
                                            ~{distance}m
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label className="input-label" htmlFor="stance">Postura *</label>
                            <select id="stance" className="input select" value={stance} onChange={(event) => setStance(event.target.value as PlayerStance)}>
                                <option value="standing">Em pe</option>
                                <option value="crouching">Agachado</option>
                                <option value="prone">Deitado</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className="input-label" htmlFor="muzzle">Ponta (Muzzle)</label>
                            <select
                                id="muzzle"
                                className="input select"
                                value={muzzle}
                                onChange={(event) => setMuzzle(event.target.value as MuzzleAttachment)}
                                disabled={!hasAttachment('muzzle')}
                            >
                                {['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'].map((attachment) => (
                                    <option key={attachment} value={attachment}>
                                        {MUZZLE_LABELS[attachment as MuzzleAttachment]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className="input-label" htmlFor="grip">Empunhadura (Grip)</label>
                            <select
                                id="grip"
                                className="input select"
                                value={grip}
                                onChange={(event) => setGrip(event.target.value as GripAttachment)}
                                disabled={!hasAttachment('grip')}
                            >
                                {GRIP_OPTIONS.map((attachment) => (
                                    <option key={attachment} value={attachment}>
                                        {GRIP_LABELS[attachment]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className="input-label" htmlFor="stock">Coronha (Stock)</label>
                            <select
                                id="stock"
                                className="input select"
                                value={stock}
                                onChange={(event) => setStock(event.target.value as StockAttachment)}
                                disabled={!hasAttachment('stock')}
                            >
                                {['none', 'tactical', 'heavy', 'folding', 'cheek_pad'].map((attachment) => (
                                    <option key={attachment} value={attachment}>
                                        {STOCK_LABELS[attachment as StockAttachment]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className="input-label" htmlFor="xhair">Cor do Reticulo *</label>
                            <select id="xhair" className="input select" value={crosshairColor} onChange={(event) => setCrosshairColor(event.target.value as CrosshairColor)}>
                                <option value="RED">Vermelho (Padrao)</option>
                                <option value="GREEN">Verde Neon</option>
                            </select>
                        </div>

                        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <label className="input-label">Identificacao de Sprays *</label>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                                        Adicione marcadores no exato frame em que cada burst comeca. A IA analisara todos e fara a media.
                                    </p>
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={addMarker}>
                                    Adicionar inicio de spray
                                </button>
                            </div>

                            <div className={styles.markersList}>
                                {markers.map((marker, index) => (
                                    <div key={marker.id} className={styles.markerRow}>
                                        <div className={styles.markerHeader}>
                                            <span className={styles.markerLabel}>SPRAY #{index + 1}</span>
                                            <div className={styles.markerActions}>
                                                <button
                                                    type="button"
                                                    className={styles.markerActionBtn}
                                                    onClick={() => {
                                                        if (videoRef.current) videoRef.current.currentTime = marker.time;
                                                    }}
                                                    title="Pular para este tempo"
                                                >
                                                    Ir para tempo
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.removeMarker}
                                                    onClick={() => removeMarker(marker.id)}
                                                    disabled={markers.length <= 1}
                                                    title="Remover"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.markerBody}>
                                            <input
                                                type="range"
                                                className="slider"
                                                min={0}
                                                max={video.duration}
                                                step={0.01}
                                                value={marker.time}
                                                onChange={(event) => updateMarker(marker.id, Number(event.target.value))}
                                                style={{ flex: 1 }}
                                            />
                                            <span className={styles.markerTime}>{marker.time.toFixed(2)}s</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.settingsActions}>
                        <button type="button" className="btn btn-ghost" onClick={handleReset}>Escolher outro clip</button>
                        <button type="button" className="btn btn-primary btn-lg" onClick={handleAnalyze}>Analisar meu spray</button>
                    </div>
                </div>
            </div>
        );
    }
    if (step === 'processing') {
        return (
            <div className={`glass-card ${styles.processing}`}>
                <div className={styles.processingSpinner} />
                <h3>{phaseLabels[phase]}</h3>
                <div className="progress-bar" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {Math.round(progress)}%
                </p>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className={`glass-card ${styles.processing}`}>
                <div className={styles.uploadStateBadge} data-tone="error">Erro</div>
                <h3>Erro na Analise</h3>
                <p>{error}</p>
                <button type="button" className="btn btn-primary" onClick={handleReset} style={{ marginTop: 'var(--space-xl)' }}>
                    Escolher outro clip
                </button>
            </div>
        );
    }

    if (step === 'done' && result) {
        return (
            <div className="animate-fade-in">
                <div className={styles.resultHeader}>
                    <h2>Resultado da Analise</h2>
                    <button type="button" className="btn btn-ghost" onClick={handleReset}>Analisar outro spray</button>
                </div>
                <ResultsDashboard result={result} />
            </div>
        );
    }
    return <div />;
}
