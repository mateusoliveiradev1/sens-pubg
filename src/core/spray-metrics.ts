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
} from '../types/engine';
import type { Milliseconds, Score } from '../types/branded';
import { asMilliseconds, asScore, asPixels } from '../types/branded';
import type { TrackingResult } from './crosshair-tracking';
import type { WeaponData, RecoilVector } from '../game/pubg/weapon-data';

// ═══════════════════════════════════════════
// FPS-to-RPM Resampling Engine
// ═══════════════════════════════════════════

/**
 * Realinha matematicamente os frames de vídeo (30fps/60fps) com o Fire Rate (RPM) da arma.
 * Isso garante que o cálculo de recoil bata perfeitamente com a compensação esperada.
 */
function resampleToFireRate(points: readonly TrackingPoint[], msPerShot: number): TrackingPoint[] {
    if (points.length < 2) return [...points];

    const resampled: TrackingPoint[] = [];
    const firstTime = Number(points[0]!.timestamp);
    const lastTime = Number(points[points.length - 1]!.timestamp);

    let targetTime = firstTime;

    // Interpola a mira (X,Y) exatamente no milissegundo em que cada tiro acontece
    while (targetTime <= lastTime) {
        let leftIdx = 0;
        let rightIdx = points.length - 1;

        for (let i = 0; i < points.length - 1; i++) {
            if (Number(points[i]!.timestamp) <= targetTime && Number(points[i + 1]!.timestamp) >= targetTime) {
                leftIdx = i;
                rightIdx = i + 1;
                break;
            }
        }

        const left = points[leftIdx]!;
        const right = points[rightIdx]!;

        const t0 = Number(left.timestamp);
        const t1 = Number(right.timestamp);

        let ratio = 0;
        if (t1 > t0) {
            ratio = (targetTime - t0) / (t1 - t0);
        }

        const x = Number(left.x) + (Number(right.x) - Number(left.x)) * ratio;
        const y = Number(left.y) + (Number(right.y) - Number(left.y)) * ratio;

        resampled.push({
            frame: resampled.length, // Linear index representing the exact bullet number
            x: asPixels(x),
            y: asPixels(y),
            timestamp: asMilliseconds(targetTime),
            confidence: left.confidence,
        });

        targetTime += msPerShot;
    }

    return resampled;
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

    // 1. Resample dos frames crus do Canvas para Tiros da Arma (interpolação P(t))
    const resampledPoints = resampleToFireRate(smoothedRawPoints, weapon.msPerShot);

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
        weaponId: weapon.id,
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
function calculateVerticalControl(
    displacements: readonly DisplacementVector[],
    weaponRecoil: readonly RecoilVector[],
    pixelToDegree: number
): number {
    if (displacements.length === 0 || weaponRecoil.length === 0) return 1.0;

    // Soma total do recoil esperado (vertical) em Graus
    const expectedVertical = weaponRecoil.reduce((sum, r) => sum + r.pitch, 0);
    if (expectedVertical === 0) return 1.0;

    // Soma total do deslocamento vertical observado convertido para Graus
    const observedVertical = displacements.reduce((sum, d) => sum + (d.dy * pixelToDegree), 0);

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
    pixelToDegree: number
): number {
    if (displacements.length === 0) return 0;

    // Converte os pixels registrados no video em in-game degrees (Yaw)
    const yawValues = displacements.map(d => d.dx * pixelToDegree);
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
    pixelToDegree: number = 0.046875 // Default 1080p 90 FOV
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

    // Apply multiplier to weapon's base pattern
    const modifiedRecoilPattern = weapon.recoilPattern.map(r => ({
        yaw: r.yaw * horizontalMult,
        pitch: r.pitch * verticalMult
    }));

    // Phases definition
    const burstDisplacements = displacements.slice(0, 10);
    const sustainedDisplacements = displacements.slice(10, 20);
    const fatigueDisplacements = displacements.slice(20);

    const burstRecoil = modifiedRecoilPattern.slice(0, 10);
    const sustainedRecoil = modifiedRecoilPattern.slice(10, 20);
    const fatigueRecoil = modifiedRecoilPattern.slice(20, displacements.length);

    const metrics: Omit<SprayMetrics, 'sprayScore'> = {
        stabilityScore: calculateStability(displacements),
        verticalControlIndex: calculateVerticalControl(displacements, modifiedRecoilPattern, pixelToDegree),
        horizontalNoiseIndex: calculateHorizontalNoise(displacements, pixelToDegree),
        initialRecoilResponseMs: calculateRecoilResponseTime(displacements, firstTimestamp),
        driftDirectionBias: calculateDriftBias(displacements),
        consistencyScore: calculateConsistency(displacements),
        // Phase-based metrics evaluated against modified expected recoil!
        burstVCI: calculateVerticalControl(burstDisplacements, burstRecoil, pixelToDegree),
        sustainedVCI: calculateVerticalControl(sustainedDisplacements, sustainedRecoil, pixelToDegree),
        fatigueVCI: calculateVerticalControl(fatigueDisplacements, fatigueRecoil, pixelToDegree),
        burstHNI: calculateHorizontalNoise(burstDisplacements, pixelToDegree),
        sustainedHNI: calculateHorizontalNoise(sustainedDisplacements, pixelToDegree),
        fatigueHNI: calculateHorizontalNoise(fatigueDisplacements, pixelToDegree),
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
