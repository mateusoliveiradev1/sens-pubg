/**
 * Spray Metrics Calculator — Calcula as 6 métricas obrigatórias do spray.
 *
 * 1. Spray Stability Score (0-100)
 * 2. Vertical Control Index (0-1, ideal = 1.0)
 * 3. Horizontal Noise Index (0+)
 * 4. Initial Recoil Response Time (ms)
 * 5. Drift Direction Bias
 * 6. Consistency Score (0-100)
 */

import type {
    TrackingPoint,
    DisplacementVector,
    SprayTrajectory,
    SprayMetrics,
    DriftBias,
    WeaponLoadout,
    ShotRecoilResidual,
    MetricEvidenceQuality,
    SprayPhaseQuality,
    SprayMetricQuality,
    SprayMetricQualityKey,
    TrackingFrameObservation,
} from '../types/engine';
import type { Milliseconds, Score } from '../types/branded';
import { asMilliseconds, asScore, asPixels } from '../types/branded';
import type { TrackingResult } from './crosshair-tracking';
import type { WeaponData, RecoilVector } from '../game/pubg/weapon-data';
import { delta_theta, type ProjectionConfig } from '../game/pubg/projection-math';
import { angularErrorToLinearCentimeters, linearErrorSeverity } from '../game/pubg/error-math';
import { getExpectedRecoilSequence, type ExpectedRecoilSequence } from '../game/pubg/recoil-sequences';
import { alignTrackingPointsToShots } from './shot-alignment';

export type SprayAngleConversion = number | ProjectionConfig;

const DEFAULT_SPRAY_PROJECTION: ProjectionConfig = {
    widthPx: 1920,
    heightPx: 1080,
    horizontalFovDegrees: 90,
};

const METRIC_QUALITY_KEYS: readonly SprayMetricQualityKey[] = [
    'stabilityScore',
    'verticalControlIndex',
    'horizontalNoiseIndex',
    'shotAlignmentErrorMs',
    'angularErrorDegrees',
    'linearErrorCm',
    'linearErrorSeverity',
    'initialRecoilResponseMs',
    'driftDirectionBias',
    'consistencyScore',
    'burstVCI',
    'sustainedVCI',
    'fatigueVCI',
    'burstHNI',
    'sustainedHNI',
    'fatigueHNI',
    'shotResiduals',
    'sprayScore',
] as const;

export type SprayPhaseName = 'burst' | 'sustained' | 'fatigue';

export interface SprayPhaseDefinition {
    readonly name: SprayPhaseName;
    readonly startShotIndex: number;
    readonly endShotIndexExclusive?: number;
}

export interface SprayPhaseSegment {
    readonly name: SprayPhaseName;
    readonly startShotIndex: number;
    readonly endShotIndexExclusive: number;
    readonly displacements: readonly DisplacementVector[];
    readonly recoilPattern: readonly RecoilVector[];
}

export const SPRAY_PHASE_DEFINITIONS: readonly SprayPhaseDefinition[] = [
    { name: 'burst', startShotIndex: 0, endShotIndexExclusive: 10 },
    { name: 'sustained', startShotIndex: 10, endShotIndexExclusive: 20 },
    { name: 'fatigue', startShotIndex: 20 },
] as const;

export function segmentSprayPhases(
    displacements: readonly DisplacementVector[],
    recoilPattern: readonly RecoilVector[] = [],
    definitions: readonly SprayPhaseDefinition[] = SPRAY_PHASE_DEFINITIONS
): readonly SprayPhaseSegment[] {
    return definitions.map((definition) => {
        const start = definition.startShotIndex;
        const rawEnd = definition.endShotIndexExclusive ?? displacements.length;
        const end = Math.max(start, Math.min(rawEnd, displacements.length));

        return {
            name: definition.name,
            startShotIndex: start,
            endShotIndexExclusive: end,
            displacements: displacements.slice(start, end),
            recoilPattern: recoilPattern.slice(start, end),
        };
    });
}

function getSprayPhase(
    phases: readonly SprayPhaseSegment[],
    name: SprayPhaseName
): SprayPhaseSegment {
    const phase = phases.find(candidate => candidate.name === name);
    if (!phase) throw new Error(`Spray phase not found: ${name}`);
    return phase;
}

// ═══════════════════════════════════════════
// Trajectory Builder
// ═══════════════════════════════════════════

/**
 * Converte TrackingPoints em displacements (variação entre frames consecutivos).
 */
export function buildDisplacements(
    points: readonly TrackingPoint[]
): DisplacementVector[] {
    const displacements: DisplacementVector[] = [];

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        if (!prev || !curr) continue;

        displacements.push({
            dx: Number(curr.x) - Number(prev.x),
            dy: Number(curr.y) - Number(prev.y),
            timestamp: curr.timestamp,
            shotIndex: i - 1,
        });
    }

    return displacements;
}

/**
 * Removes 1-frame jitter/spikes caused by video compression and muzzle flash.
 * Applies a Simple Moving Average (SMA) but rejects low-confidence outlier frames.
 */
function smoothTrackingSignal(points: readonly TrackingPoint[], windowSize: number = 3): TrackingPoint[] {
    if (points.length < windowSize) return [...points];

    const smoothed: TrackingPoint[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < points.length; i++) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;

        for (let j = -halfWindow; j <= halfWindow; j++) {
            const idx = i + j;
            if (idx >= 0 && idx < points.length) {
                const pt = points[idx];
                // Reject low confidence frames (e.g. muzzle flash occlusion)
                if (pt && pt.confidence >= 0.7) {
                    sumX += Number(pt.x);
                    sumY += Number(pt.y);
                    count++;
                }
            }
        }

        const orig = points[i]!;
        if (count > 0) {
            smoothed.push({
                ...orig,
                x: asPixels(sumX / count),
                y: asPixels(sumY / count),
            });
        } else {
            smoothed.push({ ...orig });
        }
    }
    return smoothed;
}

/**
 * Constrói a trajetória completa do spray após resample para o BPM (RPM) da arma.
 */
export function buildTrajectory(
    tracking: TrackingResult,
    weapon: WeaponData
): SprayTrajectory {
    // 0. Smooth tracking signal -> Reject low confidence + moving average
    const smoothedRawPoints = smoothTrackingSignal(tracking.points);

    // 1. Realinha o começo da cadência dos tiros ao primeiro movimento útil
    // quando existe lead-in morto antes do spray.
    const alignedShots = alignTrackingPointsToShots(smoothedRawPoints, weapon.msPerShot, {
        referencePoints: tracking.points,
    });
    const resampledPoints = alignedShots.alignedPoints;

    // 2. Transforma as posições em deltas entre tiros
    const displacements = buildDisplacements(resampledPoints);

    const firstPoint = resampledPoints[0];
    const lastPoint = resampledPoints[resampledPoints.length - 1];

    return {
        points: resampledPoints, // save the resampled points
        displacements,
        totalFrames: resampledPoints.length,
        durationMs: asMilliseconds(
            (lastPoint && firstPoint)
                ? Number(lastPoint.timestamp) - Number(firstPoint.timestamp)
                : 0
        ),
        shotAlignmentErrorMs: alignedShots.errorSummary.meanErrorMs,
        weaponId: weapon.id,
        trackingFrames: tracking.trackingFrames,
        trackingQuality: tracking.trackingQuality,
        framesTracked: tracking.framesTracked,
        framesLost: tracking.framesLost,
        visibleFrames: tracking.visibleFrames,
        framesProcessed: tracking.framesProcessed,
        statusCounts: tracking.statusCounts,
    };
}

// ═══════════════════════════════════════════
// Metric 1: Spray Stability Score (0-100)
// ═══════════════════════════════════════════

/**
 * Estabilidade geral com base no desvio padrão do spray.
 * Score alto = spray concentrado em uma área pequena.
 */
function calculateStability(displacements: readonly DisplacementVector[]): Score {
    if (displacements.length === 0) return asScore(0);

    // Calcular desvio padrão das distâncias do centróide
    const meanDx = displacements.reduce((a, d) => a + d.dx, 0) / displacements.length;
    const meanDy = displacements.reduce((a, d) => a + d.dy, 0) / displacements.length;

    const variance = displacements.reduce((sum, d) => {
        return sum + (d.dx - meanDx) ** 2 + (d.dy - meanDy) ** 2;
    }, 0) / displacements.length;

    const stdDev = Math.sqrt(variance);

    // Normalizar: stdDev ~0 = 100, stdDev ~30 = 0
    const normalized = Math.max(0, 100 - (stdDev / 30) * 100);
    return asScore(normalized);
}

// ═══════════════════════════════════════════
// Metric 2: Vertical Control Index (0-1)
// ═══════════════════════════════════════════

/**
 * Mede quão bem o jogador compensa o recoil vertical.
 * Compara o deslocamento vertical observado com o esperado.
 * 
 * 1.0 = compensação perfeita
 * <1.0 = underpull (não puxa o suficiente)
 * >1.0 = overpull (puxa demais)
 */
function pixelDisplacementToAngles(
    displacement: DisplacementVector,
    angleConversion: SprayAngleConversion
): { yawDegrees: number; screenDownPitchDegrees: number } {
    if (typeof angleConversion === 'number') {
        // Legacy scalar fallback: kept only for callers that explicitly pass deg/px.
        return {
            yawDegrees: displacement.dx * angleConversion,
            screenDownPitchDegrees: displacement.dy * angleConversion,
        };
    }

    const center = {
        x: angleConversion.centerXPx ?? angleConversion.widthPx / 2,
        y: angleConversion.centerYPx ?? angleConversion.heightPx / 2,
    };
    const target = {
        x: center.x + displacement.dx,
        y: center.y + displacement.dy,
    };
    const angularDelta = delta_theta(center, target, angleConversion);

    return {
        yawDegrees: angularDelta.yawDegrees,
        screenDownPitchDegrees: -angularDelta.pitchDegrees,
    };
}

function roundMetricDegrees(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
}

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
}

function buildMetricQuality(
    trajectory: SprayTrajectory,
    sampleSize: number,
    phaseQuality?: SprayPhaseQuality
): SprayMetricQuality {
    const framesProcessed = Math.max(0, trajectory.framesProcessed || trajectory.totalFrames);
    const coverage = framesProcessed > 0
        ? clampUnit(trajectory.visibleFrames / framesProcessed)
        : 0;
    const frameEvidence = buildEvidenceQualityFromFrames(
        trajectory.trackingFrames ?? [],
        sampleSize,
        {
            fallbackCoverage: coverage,
            fallbackConfidence: clampUnit(trajectory.trackingQuality),
            fallbackFramesProcessed: framesProcessed,
            fallbackFramesTracked: Math.max(0, trajectory.framesTracked),
            fallbackFramesLost: Math.max(0, trajectory.framesLost),
        }
    );
    const evidence: MetricEvidenceQuality = {
        coverage,
        confidence: clampUnit(trajectory.trackingQuality),
        sampleSize,
        framesTracked: Math.max(0, trajectory.framesTracked),
        framesLost: Math.max(0, trajectory.framesLost),
        framesProcessed,
        confidenceSource: 'summary',
    };
    const globalEvidence = (trajectory.trackingFrames ?? []).length > 0 ? frameEvidence : evidence;

    const quality = Object.fromEntries(
        METRIC_QUALITY_KEYS.map((key) => [key, globalEvidence])
    ) as SprayMetricQuality;

    if (phaseQuality) {
        quality.burstVCI = phaseQuality.burst;
        quality.burstHNI = phaseQuality.burst;
        quality.sustainedVCI = phaseQuality.sustained;
        quality.sustainedHNI = phaseQuality.sustained;
        quality.fatigueVCI = phaseQuality.fatigue;
        quality.fatigueHNI = phaseQuality.fatigue;
    }

    return quality;
}

function buildEvidenceQualityFromFrames(
    frames: readonly TrackingFrameObservation[],
    sampleSize: number,
    fallback?: {
        readonly fallbackCoverage: number;
        readonly fallbackConfidence: number;
        readonly fallbackFramesProcessed: number;
        readonly fallbackFramesTracked: number;
        readonly fallbackFramesLost: number;
    }
): MetricEvidenceQuality {
    const framesProcessed = frames.length;
    if (framesProcessed === 0) {
        return {
            coverage: fallback?.fallbackCoverage ?? 0,
            confidence: fallback?.fallbackConfidence ?? 0,
            sampleSize,
            framesTracked: fallback?.fallbackFramesTracked ?? 0,
            framesLost: fallback?.fallbackFramesLost ?? 0,
            framesProcessed: fallback?.fallbackFramesProcessed ?? 0,
            confidenceSource: 'summary',
        };
    }

    const trackedFrames = frames.filter((frame) => frame.status === 'tracked').length;
    const uncertainFrames = frames.filter((frame) => frame.status === 'uncertain').length;
    const visibleFrames = trackedFrames + uncertainFrames;
    const visibilityCoverage = framesProcessed > 0 ? clampUnit(visibleFrames / framesProcessed) : 0;
    const disturbancePenalty = frames.reduce((sum, frame) => {
        const disturbance = frame.exogenousDisturbance ?? {
            muzzleFlash: 0,
            blur: 0,
            shake: 0,
            occlusion: frame.status === 'tracked' || frame.status === 'uncertain' ? 0 : 1,
        };
        const framePenalty = (
            (disturbance.muzzleFlash * 0.35) +
            (disturbance.blur * 0.25) +
            (disturbance.shake * 0.25) +
            (disturbance.occlusion * 0.5)
        );

        return sum + clampUnit(framePenalty);
    }, 0) / framesProcessed;
    const reacquisitionPenalty = frames.reduce((sum, frame) => (
        sum + (frame.reacquisitionFrames !== undefined
            ? clampUnit(frame.reacquisitionFrames / 5)
            : 0)
    ), 0) / framesProcessed;
    const meanFrameConfidence = frames.reduce((sum, frame) => sum + clampUnit(frame.confidence), 0) / framesProcessed;
    const evidenceConfidence = clampUnit(
        meanFrameConfidence *
        visibilityCoverage *
        (1 - disturbancePenalty) *
        (1 - reacquisitionPenalty)
    );

    return {
        coverage: clampUnit(visibilityCoverage * (1 - disturbancePenalty) * (1 - reacquisitionPenalty)),
        confidence: evidenceConfidence,
        sampleSize,
        framesTracked: visibleFrames,
        framesLost: Math.max(0, framesProcessed - visibleFrames),
        framesProcessed,
        visibilityCoverage,
        disturbancePenalty,
        reacquisitionPenalty,
        confidenceSource: 'tracking_frames',
    };
}

function getPhaseTrackingFrames(
    trajectory: SprayTrajectory,
    phase: SprayPhaseSegment
): readonly TrackingFrameObservation[] {
    const trackingFrames = trajectory.trackingFrames ?? [];

    if (trackingFrames.length === 0) {
        return [];
    }

    const firstPoint = trajectory.points[phase.startShotIndex];
    const lastPointIndex = Math.min(
        Math.max(phase.startShotIndex, phase.endShotIndexExclusive),
        Math.max(0, trajectory.points.length - 1)
    );
    const lastPoint = trajectory.points[lastPointIndex];

    if (!firstPoint || !lastPoint) {
        return trackingFrames.filter((frame) => (
            frame.frame >= phase.startShotIndex && frame.frame <= phase.endShotIndexExclusive
        ));
    }

    const startFrame = Math.min(firstPoint.frame, lastPoint.frame);
    const endFrame = Math.max(firstPoint.frame, lastPoint.frame);

    return trackingFrames.filter((frame) => (
        frame.frame >= startFrame && frame.frame <= endFrame
    ));
}

function buildPhaseQuality(
    trajectory: SprayTrajectory,
    phases: readonly SprayPhaseSegment[]
): SprayPhaseQuality {
    const getPhaseQuality = (name: SprayPhaseName): MetricEvidenceQuality => {
        const phase = getSprayPhase(phases, name);
        return buildEvidenceQualityFromFrames(
            getPhaseTrackingFrames(trajectory, phase),
            phase.displacements.length
        );
    };

    return {
        burst: getPhaseQuality('burst'),
        sustained: getPhaseQuality('sustained'),
        fatigue: getPhaseQuality('fatigue'),
    };
}

export function calculateShotRecoilResiduals(
    displacements: readonly DisplacementVector[],
    expectedRecoil: ExpectedRecoilSequence,
    angleConversion: SprayAngleConversion
): readonly ShotRecoilResidual[] {
    const expectedByShotIndex = new Map(
        expectedRecoil.shots.map((shot) => [shot.shotIndex, shot] as const)
    );

    return displacements.flatMap((displacement) => {
        const expectedShot = expectedByShotIndex.get(displacement.shotIndex);
        if (!expectedShot) {
            return [];
        }

        const observedAngles = pixelDisplacementToAngles(displacement, angleConversion);
        const observed = {
            yaw: roundMetricDegrees(observedAngles.yawDegrees),
            pitch: roundMetricDegrees(observedAngles.screenDownPitchDegrees),
        };
        const expected = {
            yaw: roundMetricDegrees(expectedShot.recoil.yaw),
            pitch: roundMetricDegrees(expectedShot.recoil.pitch),
        };
        const residual = {
            yaw: roundMetricDegrees(observed.yaw - expected.yaw),
            pitch: roundMetricDegrees(observed.pitch - expected.pitch),
        };

        return [{
            shotIndex: displacement.shotIndex,
            timestamp: displacement.timestamp,
            observed,
            expected,
            residual,
            residualMagnitudeDegrees: roundMetricDegrees(Math.hypot(residual.yaw, residual.pitch)),
        }];
    });
}

function calculateVerticalControl(
    displacements: readonly DisplacementVector[],
    weaponRecoil: readonly RecoilVector[],
    angleConversion: SprayAngleConversion
): number {
    if (displacements.length === 0 || weaponRecoil.length === 0) return 1.0;

    // Soma total do recoil esperado (vertical) em Graus
    const expectedVertical = weaponRecoil.reduce((sum, r) => sum + r.pitch, 0);
    if (expectedVertical === 0) return 1.0;

    // Soma total do deslocamento vertical observado convertido para Graus
    const observedVertical = displacements.reduce(
        (sum, displacement) => sum + pixelDisplacementToAngles(displacement, angleConversion).screenDownPitchDegrees,
        0
    );

    // Se observado é próximo de 0, jogador compensou perfeitamente.
    // Ratio: (expectedVertical - observedVertical) / expectedVertical
    const compensated = expectedVertical - observedVertical;
    const ratio = compensated / expectedVertical;

    // Clamp entre 0 e 2 (0 = nenhuma comp., 1 = perfeita, 2 = overpull)
    return Math.max(0, Math.min(2, ratio));
}

// ═══════════════════════════════════════════
// Metric 3: Horizontal Noise Index
// ═══════════════════════════════════════════

/**
 * Desvio padrão do movimento horizontal.
 * Valor baixo = spray horizontal limpo.
 */
function calculateHorizontalNoise(
    displacements: readonly DisplacementVector[],
    angleConversion: SprayAngleConversion
): number {
    if (displacements.length === 0) return 0;

    // Converte os pixels registrados no video em in-game degrees (Yaw)
    const yawValues = displacements.map(d => pixelDisplacementToAngles(d, angleConversion).yawDegrees);
    const mean = yawValues.reduce((a, b) => a + b, 0) / yawValues.length;
    const variance = yawValues.reduce((sum, yaw) => sum + (yaw - mean) ** 2, 0) / yawValues.length;

    return Math.round(Math.sqrt(variance) * 1000) / 1000;
}

// ═══════════════════════════════════════════
// Metric 4: Initial Recoil Response Time (ms)
// ═══════════════════════════════════════════

/**
 * Tempo até o jogador começar a compensar o recoil.
 * Medido como o tempo até o primeiro movimento oposto ao recoil.
 */
function calculateAngularError(
    displacements: readonly DisplacementVector[],
    angleConversion: SprayAngleConversion
): number {
    if (displacements.length === 0) return 0;

    const squaredMagnitudes = displacements.map((displacement) => {
        const angles = pixelDisplacementToAngles(displacement, angleConversion);
        return (angles.yawDegrees ** 2) + (angles.screenDownPitchDegrees ** 2);
    });
    const meanSquaredMagnitude = squaredMagnitudes.reduce((sum, value) => sum + value, 0) / squaredMagnitudes.length;

    return Math.round(Math.sqrt(meanSquaredMagnitude) * 1000) / 1000;
}

function calculateRecoilResponseTime(
    displacements: readonly DisplacementVector[],
    firstTimestamp: number
): Milliseconds {
    if (displacements.length === 0) return asMilliseconds(0);

    // Procurar o primeiro frame onde dy é negativo (jogador puxou pra baixo)
    for (let i = 0; i < displacements.length; i++) {
        const d = displacements[i];
        if (d && d.dy < -1) { // threshold: pelo menos -1px
            return asMilliseconds(Number(d.timestamp) - firstTimestamp);
        }
    }

    // Nunca compensou — retorna duração total
    const lastD = displacements[displacements.length - 1];
    return asMilliseconds(lastD ? Number(lastD.timestamp) - firstTimestamp : 0);
}

// ═══════════════════════════════════════════
// Metric 5: Drift Direction Bias
// ═══════════════════════════════════════════

/**
 * Detecta tendência de desvio horizontal.
 * Se o acumulado horizontal pende para um lado, há drift bias.
 */
function calculateDriftBias(
    displacements: readonly DisplacementVector[]
): DriftBias {
    if (displacements.length === 0) {
        return { direction: 'neutral', magnitude: 0 };
    }

    const totalDx = displacements.reduce((sum, d) => sum + d.dx, 0);
    const avgDx = totalDx / displacements.length;

    const THRESHOLD = 0.5; // pixels por frame

    let direction: 'left' | 'right' | 'neutral';
    if (avgDx < -THRESHOLD) {
        direction = 'left';
    } else if (avgDx > THRESHOLD) {
        direction = 'right';
    } else {
        direction = 'neutral';
    }

    return {
        direction,
        magnitude: Math.round(Math.abs(avgDx) * 100) / 100,
    };
}

// ═══════════════════════════════════════════
// Metric 6: Consistency Score (0-100)
// ═══════════════════════════════════════════

/**
 * Mede a consistência do spray comparando janelas de frames.
 * Score alto = cada segmento do spray é similar aos outros.
 */
function calculateConsistency(
    displacements: readonly DisplacementVector[]
): Score {
    if (displacements.length < 6) return asScore(50);

    // Dividir em 3 segmentos (Burst, Sustained, Fatigue) para checar a variação
    const segmentSize = Math.floor(displacements.length / 3);
    const segments = [
        displacements.slice(0, segmentSize),
        displacements.slice(segmentSize, segmentSize * 2),
        displacements.slice(segmentSize * 2, segmentSize * 3),
    ];

    // Calcular variância de cada segmento baseada no DY (controle vertical)
    const segmentVariances = segments.map(seg => {
        if (seg.length === 0) return 0;
        const dys = seg.map(d => d.dy);
        const mean = dys.reduce((a, b) => a + b, 0) / dys.length;
        return dys.reduce((sum, dy) => sum + (dy - mean) ** 2, 0) / dys.length;
    });

    // Consistência = baixa variação entre as variâncias dos segmentos
    const meanVar = segmentVariances.reduce((a, b) => a + b, 0) / segmentVariances.length;
    const varOfVar = segmentVariances.reduce((sum, v) => sum + (v - meanVar) ** 2, 0) / segmentVariances.length;

    // Normalização Sigmóide para evitar que caia pra 0 com facilidade
    // Se a variação da variância for alta, o score cai, mas de forma mais suave
    const sensitivity = 0.5; // Ajuste para calibração
    const normalized = 100 / (1 + Math.exp(Math.sqrt(varOfVar) * sensitivity - 5));

    // Math floor to prevent absolute 0 scores
    return asScore(Math.max(15, Math.round(normalized)));
}

// ═══════════════════════════════════════════
// Main: Calculate All Metrics
// ═══════════════════════════════════════════

export function calculateSprayMetrics(
    trajectory: SprayTrajectory,
    weapon: WeaponData,
    loadout: WeaponLoadout,
    angleConversion: SprayAngleConversion = DEFAULT_SPRAY_PROJECTION,
    targetDistanceMeters: number = 30
): SprayMetrics {
    const { displacements, points } = trajectory;
    const firstTimestamp = points.length > 0 ? Number(points[0]!.timestamp) : 0;

    // Calculate Multipliers based on Stance and Attachments
    let verticalMult = 1.0;
    let horizontalMult = 1.0;

    // Stance multipliers
    if (loadout.stance === 'crouching') {
        verticalMult *= 0.8;
        horizontalMult *= 0.8;
    } else if (loadout.stance === 'prone') {
        verticalMult *= 0.6; // Prone is massive recoil redc.
        horizontalMult *= 0.6;
    }

    // Muzzle multipliers
    if (loadout.muzzle === 'compensator') {
        verticalMult *= 0.90;   // -10% vertical
        horizontalMult *= 0.85; // -15% horizontal
    } else if (loadout.muzzle === 'flash_hider') {
        verticalMult *= 0.95;   // -5%
        horizontalMult *= 0.90; // -10%
    }

    // Grip multipliers
    if (loadout.grip === 'vertical') {
        verticalMult *= 0.85; // -15% vertical
    } else if (loadout.grip === 'angled') {
        horizontalMult *= 0.80; // -20% horiz
        verticalMult *= 0.95;
    } else if (loadout.grip === 'half') {
        verticalMult *= 0.92;
        horizontalMult *= 0.92;
    } else if (loadout.grip === 'tilted') {
        verticalMult *= 0.88;
        horizontalMult *= 0.94;
    } else if (loadout.grip === 'thumb') {
        verticalMult *= 0.95;
    } else if (loadout.grip === 'lightweight') {
        verticalMult *= 0.80;
    }

    // Stock multipliers
    if (loadout.stock === 'tactical') {
        verticalMult *= 0.90;
        horizontalMult *= 0.90;
    } else if (loadout.stock === 'heavy') {
        verticalMult *= 0.95;
        horizontalMult *= 0.95;
    }

    const expectedRecoilSequence = getExpectedRecoilSequence({
        weaponId: weapon.id,
        weapon,
        shotCount: displacements.length,
    });

    let cumulativeYaw = 0;
    let cumulativePitch = 0;
    const modifiedExpectedRecoilSequence: ExpectedRecoilSequence = {
        ...expectedRecoilSequence,
        shots: expectedRecoilSequence.shots.map((shot) => {
            const recoil = {
                yaw: shot.recoil.yaw * horizontalMult,
                pitch: shot.recoil.pitch * verticalMult,
            };
            cumulativeYaw = roundMetricDegrees(cumulativeYaw + recoil.yaw);
            cumulativePitch = roundMetricDegrees(cumulativePitch + recoil.pitch);

            return {
                ...shot,
                recoil,
                cumulative: {
                    yaw: cumulativeYaw,
                    pitch: cumulativePitch,
                },
            };
        }),
    };

    const modifiedRecoilPattern = modifiedExpectedRecoilSequence.shots.map((shot) => shot.recoil);

    const phaseSegments = segmentSprayPhases(displacements, modifiedRecoilPattern);
    const burst = getSprayPhase(phaseSegments, 'burst');
    const sustained = getSprayPhase(phaseSegments, 'sustained');
    const fatigue = getSprayPhase(phaseSegments, 'fatigue');
    const phaseQuality = buildPhaseQuality(trajectory, phaseSegments);
    const metricQuality = buildMetricQuality(trajectory, displacements.length, phaseQuality);
    const angularErrorDegrees = calculateAngularError(displacements, angleConversion);
    const linearErrorCm = angularErrorToLinearCentimeters(angularErrorDegrees, targetDistanceMeters);

    const metrics: Omit<SprayMetrics, 'sprayScore'> = {
        stabilityScore: calculateStability(displacements),
        verticalControlIndex: calculateVerticalControl(displacements, modifiedRecoilPattern, angleConversion),
        horizontalNoiseIndex: calculateHorizontalNoise(displacements, angleConversion),
        shotAlignmentErrorMs: trajectory.shotAlignmentErrorMs,
        initialRecoilResponseMs: calculateRecoilResponseTime(displacements, firstTimestamp),
        driftDirectionBias: calculateDriftBias(displacements),
        consistencyScore: calculateConsistency(displacements),
        // Phase-based metrics evaluated against modified expected recoil!
        burstVCI: calculateVerticalControl(burst.displacements, burst.recoilPattern, angleConversion),
        sustainedVCI: calculateVerticalControl(sustained.displacements, sustained.recoilPattern, angleConversion),
        fatigueVCI: calculateVerticalControl(fatigue.displacements, fatigue.recoilPattern, angleConversion),
        burstHNI: calculateHorizontalNoise(burst.displacements, angleConversion),
        sustainedHNI: calculateHorizontalNoise(sustained.displacements, angleConversion),
        fatigueHNI: calculateHorizontalNoise(fatigue.displacements, angleConversion),
        angularErrorDegrees,
        linearErrorCm,
        linearErrorSeverity: linearErrorSeverity(linearErrorCm),
        targetDistanceMeters,
        shotResiduals: calculateShotRecoilResiduals(displacements, modifiedExpectedRecoilSequence, angleConversion),
        metricQuality,
        phaseQuality,
    };

    // Calculate final unified sprayScore (0-100)
    // Formula: 40% Stability + 40% Control + 20% Consistency
    // Control is normalized: 1.0 = 100%, 0.5 or 1.5 = 50%, 0 or 2 = 0%
    const normalizedControl = Math.max(0, 100 - Math.abs(1 - metrics.verticalControlIndex) * 100);
    const sprayScore = Math.round(
        (Number(metrics.stabilityScore) * 0.4) +
        (normalizedControl * 0.4) +
        (Number(metrics.consistencyScore) * 0.2)
    );

    return {
        ...metrics,
        sprayScore,
    };
}
