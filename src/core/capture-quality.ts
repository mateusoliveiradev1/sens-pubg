import { asMilliseconds, asScore } from '../types/branded';
import type {
    AnalysisBlockerReasonCode,
    SprayValidityReport,
    SprayWindowDetection,
    VideoQualityBlockingReason,
    VideoQualityDiagnosticReport,
    VideoQualityFrameDiagnostic,
    VideoQualityFrameIssue,
    VideoQualityFrameStatus,
    VideoQualityFrameTimeline,
    VideoQualityReport,
    VideoQualitySegmentSeverity,
    VideoQualityTier,
} from '../types/engine';
import type { CrosshairColor } from './crosshair-tracking';
import { normalizeTrackingFrame } from './video-normalization';

export interface CreateVideoQualityReportInput {
    readonly sharpness: number;
    readonly compressionBurden: number;
    readonly reticleContrast: number;
    readonly roiStability: number;
    readonly fpsStability: number;
    readonly blockingReasons?: readonly VideoQualityBlockingReason[];
    readonly diagnostic?: VideoQualityDiagnosticReport;
}

export interface AnalyzeCaptureQualityFramesOptions {
    readonly targetColor?: CrosshairColor;
    readonly roiStability?: number;
    readonly fpsStability?: number;
    readonly normalizeBeforeScoring?: boolean;
}

export interface CaptureQualityMetrics {
    readonly sharpness: number;
    readonly compressionBurden: number;
    readonly reticleContrast: number;
}

export interface CreateVideoQualityDiagnosticReportInput {
    readonly report: VideoQualityReport;
    readonly sampledFrames: number;
    readonly selectedFrames: number;
    readonly normalizationApplied: boolean;
    readonly sprayWindow?: SprayWindowDetection | null;
    readonly sprayValidity?: SprayValidityReport | null;
    readonly timeline?: VideoQualityFrameTimeline;
}

export interface VideoQualityDiagnosticFrameInput {
    readonly index: number;
    readonly timestamp: number;
    readonly imageData: ImageData;
}

export interface CreateVideoQualityFrameDiagnosticsOptions {
    readonly targetColor?: CrosshairColor;
    readonly normalizeBeforeScoring?: boolean;
}

interface PixelBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

interface StrongComponent {
    readonly strongPixelCount: number;
    readonly bounds: PixelBounds;
    readonly profile: TargetPixelProfile;
}

interface TargetPixelProfile {
    readonly primaryMin: number;
    readonly secondaryMax: number;
    readonly dominanceMin: number;
    readonly looseMin: number;
    readonly looseRatio: number;
}

const STRICT_TARGET_PIXEL_PROFILE: TargetPixelProfile = {
    primaryMin: 200,
    secondaryMax: 90,
    dominanceMin: 120,
    looseMin: 90,
    looseRatio: 1.25,
};

const RELAXED_TARGET_PIXEL_PROFILE: TargetPixelProfile = {
    primaryMin: 150,
    secondaryMax: 150,
    dominanceMin: 45,
    looseMin: 80,
    looseRatio: 1.08,
};

function normalizeScore(value: number): number {
    return Number(asScore(value));
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function pushReason(
    reasons: VideoQualityBlockingReason[],
    reason: VideoQualityBlockingReason
): void {
    if (!reasons.includes(reason)) {
        reasons.push(reason);
    }
}

function isStrongTargetPixel(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor,
    profile: TargetPixelProfile = STRICT_TARGET_PIXEL_PROFILE,
): boolean {
    if (targetColor === 'GREEN') {
        return g >= profile.primaryMin
            && r <= profile.secondaryMax
            && b <= profile.secondaryMax
            && (g - Math.max(r, b)) >= profile.dominanceMin;
    }

    return r >= profile.primaryMin
        && g <= profile.secondaryMax
        && b <= profile.secondaryMax
        && (r - Math.max(g, b)) >= profile.dominanceMin;
}

function isLooseTargetPixel(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor,
    profile: TargetPixelProfile = STRICT_TARGET_PIXEL_PROFILE,
): boolean {
    if (targetColor === 'GREEN') {
        return g >= profile.looseMin
            && g > (r * profile.looseRatio)
            && g > (b * profile.looseRatio);
    }

    return r >= profile.looseMin
        && r > (g * profile.looseRatio)
        && r > (b * profile.looseRatio);
}

function getTargetDominance(
    r: number,
    g: number,
    b: number,
    targetColor: CrosshairColor
): number {
    const rawDominance = targetColor === 'GREEN'
        ? (g - Math.max(r, b)) / 255
        : (r - Math.max(g, b)) / 255;

    return clampUnit(rawDominance);
}

function createBounds(x: number, y: number): PixelBounds {
    return { minX: x, maxX: x, minY: y, maxY: y };
}

function extendBounds(bounds: PixelBounds, x: number, y: number): void {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
}

function expandBounds(
    bounds: PixelBounds,
    width: number,
    height: number,
    margin: number
): PixelBounds {
    return {
        minX: Math.max(0, bounds.minX - margin),
        maxX: Math.min(width - 1, bounds.maxX + margin),
        minY: Math.max(0, bounds.minY - margin),
        maxY: Math.min(height - 1, bounds.maxY + margin),
    };
}

function getCenterFocusBounds(width: number, height: number): PixelBounds {
    const halfSize = Math.max(48, Math.round(Math.min(width, height) * 0.18));
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    return {
        minX: Math.max(0, centerX - halfSize),
        maxX: Math.min(width - 1, centerX + halfSize),
        minY: Math.max(0, centerY - halfSize),
        maxY: Math.min(height - 1, centerY + halfSize),
    };
}

function findFocusedStrongComponent(
    frame: ImageData,
    targetColor: CrosshairColor,
): StrongComponent | null {
    const focusBounds = getCenterFocusBounds(frame.width, frame.height);
    const focusWidth = focusBounds.maxX - focusBounds.minX + 1;
    const focusHeight = focusBounds.maxY - focusBounds.minY + 1;
    const centerX = Math.floor(frame.width / 2);
    const centerY = Math.floor(frame.height / 2);

    const detectWithProfile = (profile: TargetPixelProfile): StrongComponent | null => {
        const strongMask = new Uint8Array(focusWidth * focusHeight);

        for (let y = focusBounds.minY; y <= focusBounds.maxY; y++) {
            for (let x = focusBounds.minX; x <= focusBounds.maxX; x++) {
                const index = ((y * frame.width) + x) * 4;
                const r = frame.data[index] ?? 0;
                const g = frame.data[index + 1] ?? 0;
                const b = frame.data[index + 2] ?? 0;

                if (!isStrongTargetPixel(r, g, b, targetColor, profile)) {
                    continue;
                }

                const focusIndex = ((y - focusBounds.minY) * focusWidth) + (x - focusBounds.minX);
                strongMask[focusIndex] = 1;
            }
        }

        const visited = new Uint8Array(strongMask.length);
        const queueX = new Int32Array(strongMask.length);
        const queueY = new Int32Array(strongMask.length);

        let bestComponent: StrongComponent | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        for (let localY = 0; localY < focusHeight; localY++) {
            for (let localX = 0; localX < focusWidth; localX++) {
                const startIndex = (localY * focusWidth) + localX;
                if (strongMask[startIndex] === 0 || visited[startIndex] === 1) {
                    continue;
                }

                visited[startIndex] = 1;
                queueX[0] = localX;
                queueY[0] = localY;

                let head = 0;
                let tail = 1;
                let strongPixelCount = 0;
                let sumX = 0;
                let sumY = 0;
                const bounds = createBounds(localX + focusBounds.minX, localY + focusBounds.minY);

                while (head < tail) {
                    const currentLocalX = queueX[head]!;
                    const currentLocalY = queueY[head]!;
                    head++;

                    const globalX = currentLocalX + focusBounds.minX;
                    const globalY = currentLocalY + focusBounds.minY;
                    strongPixelCount++;
                    sumX += globalX;
                    sumY += globalY;
                    extendBounds(bounds, globalX, globalY);

                    for (let offsetY = -1; offsetY <= 1; offsetY++) {
                        for (let offsetX = -1; offsetX <= 1; offsetX++) {
                            if (offsetX === 0 && offsetY === 0) {
                                continue;
                            }

                            const nextLocalX = currentLocalX + offsetX;
                            const nextLocalY = currentLocalY + offsetY;
                            if (
                                nextLocalX < 0
                                || nextLocalY < 0
                                || nextLocalX >= focusWidth
                                || nextLocalY >= focusHeight
                            ) {
                                continue;
                            }

                            const nextIndex = (nextLocalY * focusWidth) + nextLocalX;
                            if (strongMask[nextIndex] === 0 || visited[nextIndex] === 1) {
                                continue;
                            }

                            visited[nextIndex] = 1;
                            queueX[tail] = nextLocalX;
                            queueY[tail] = nextLocalY;
                            tail++;
                        }
                    }
                }

                const centroidX = sumX / strongPixelCount;
                const centroidY = sumY / strongPixelCount;
                const distanceToCenter = Math.hypot(centroidX - centerX, centroidY - centerY);
                const score = strongPixelCount - (distanceToCenter * 0.35);

                if (score > bestScore) {
                    bestScore = score;
                    bestComponent = {
                        strongPixelCount,
                        bounds,
                        profile,
                    };
                }
            }
        }

        return bestComponent;
    };

    const strictComponent = detectWithProfile(STRICT_TARGET_PIXEL_PROFILE);
    if (strictComponent && strictComponent.strongPixelCount >= 5) {
        return strictComponent;
    }

    return detectWithProfile(RELAXED_TARGET_PIXEL_PROFILE) ?? strictComponent;
}

export function deriveVideoQualityBlockingReasons(
    input: CreateVideoQualityReportInput
): readonly VideoQualityBlockingReason[] {
    const sharpness = normalizeScore(input.sharpness);
    const compressionBurden = normalizeScore(input.compressionBurden);
    const reticleContrast = normalizeScore(input.reticleContrast);
    const roiStability = normalizeScore(input.roiStability);
    const fpsStability = normalizeScore(input.fpsStability);
    const reasons: VideoQualityBlockingReason[] = [];

    if (sharpness < 25) {
        pushReason(reasons, 'low_sharpness');
    }

    if (compressionBurden > 90) {
        pushReason(reasons, 'high_compression_burden');
    }

    const severeReticleContrast = reticleContrast < 15;
    const lowContrastWithNoisySignal = reticleContrast < 20
        && (sharpness < 50 || compressionBurden > 80);

    if (severeReticleContrast || lowContrastWithNoisySignal) {
        pushReason(reasons, 'low_reticle_contrast');
    }

    if (roiStability < 50) {
        pushReason(reasons, 'unstable_roi');
    }

    if (fpsStability < 50) {
        pushReason(reasons, 'unstable_fps');
    }

    return reasons;
}

export function measureCaptureQualityFrame(
    frame: ImageData,
    targetColor: CrosshairColor = 'RED'
): CaptureQualityMetrics {
    const focusedComponent = findFocusedStrongComponent(frame, targetColor);
    if (!focusedComponent) {
        return {
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 0,
        };
    }

    const measurementBounds = expandBounds(focusedComponent.bounds, frame.width, frame.height, 4);
    let strongPixelCount = 0;
    let loosePixelCount = 0;
    let strongDominanceSum = 0;
    let strongBounds: PixelBounds | null = null;
    let looseBounds: PixelBounds | null = null;

    for (let y = measurementBounds.minY; y <= measurementBounds.maxY; y++) {
        for (let x = measurementBounds.minX; x <= measurementBounds.maxX; x++) {
            const index = ((y * frame.width) + x) * 4;
            const r = frame.data[index] ?? 0;
            const g = frame.data[index + 1] ?? 0;
            const b = frame.data[index + 2] ?? 0;
            const isStrong = isStrongTargetPixel(r, g, b, targetColor, focusedComponent.profile);
            const isLoose = isStrong || isLooseTargetPixel(r, g, b, targetColor, focusedComponent.profile);

            if (!isLoose) {
                continue;
            }

            loosePixelCount++;

            if (!looseBounds) {
                looseBounds = createBounds(x, y);
            } else {
                extendBounds(looseBounds, x, y);
            }

            if (!isStrong) {
                continue;
            }

            if (!strongBounds) {
                strongBounds = createBounds(x, y);
            } else {
                extendBounds(strongBounds, x, y);
            }

            strongPixelCount++;
            strongDominanceSum += getTargetDominance(r, g, b, targetColor);
        }
    }

    if (!looseBounds || !strongBounds || strongPixelCount === 0) {
        return {
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 0,
        };
    }

    const looseSignalCount = Math.max(loosePixelCount, 1);
    const strongAverageDominance = strongDominanceSum / strongPixelCount;
    const contrastBounds = expandBounds(strongBounds, frame.width, frame.height, 3);
    let surroundingDominanceSum = 0;
    let surroundingPixelCount = 0;

    for (let y = contrastBounds.minY; y <= contrastBounds.maxY; y++) {
        for (let x = contrastBounds.minX; x <= contrastBounds.maxX; x++) {
            if (
                x >= strongBounds.minX &&
                x <= strongBounds.maxX &&
                y >= strongBounds.minY &&
                y <= strongBounds.maxY
            ) {
                continue;
            }

            const index = ((y * frame.width) + x) * 4;
            const r = frame.data[index] ?? 0;
            const g = frame.data[index + 1] ?? 0;
            const b = frame.data[index + 2] ?? 0;
            surroundingDominanceSum += getTargetDominance(r, g, b, targetColor);
            surroundingPixelCount++;
        }
    }

    const surroundingAverageDominance = surroundingPixelCount > 0
        ? surroundingDominanceSum / surroundingPixelCount
        : 0;
    const sharpness = Math.sqrt(strongPixelCount / looseSignalCount) * 100;
    const compressionBurden = (1 - (strongPixelCount / looseSignalCount)) * 100;
    const reticleContrast = (strongAverageDominance - surroundingAverageDominance) * 100;

    return {
        sharpness: normalizeScore(sharpness),
        compressionBurden: normalizeScore(compressionBurden),
        reticleContrast: normalizeScore(reticleContrast),
    };
}

export function analyzeCaptureQualityFrames(
    frames: readonly ImageData[],
    options: AnalyzeCaptureQualityFramesOptions = {}
): VideoQualityReport {
    if (frames.length === 0) {
        return createVideoQualityReport({
            sharpness: 0,
            compressionBurden: 100,
            reticleContrast: 0,
            roiStability: options.roiStability ?? 0,
            fpsStability: options.fpsStability ?? 0,
        });
    }

    const metrics = frames.map((frame) => measureCaptureQualityFrame(
        options.normalizeBeforeScoring ? normalizeTrackingFrame(frame) : frame,
        options.targetColor ?? 'RED'
    ));
    const summarizeMetric = (selector: (metric: CaptureQualityMetrics) => number): number => (
        metrics.reduce((sum, metric) => sum + selector(metric), 0) / metrics.length
    );

    return createVideoQualityReport({
        sharpness: summarizeMetric((metric) => metric.sharpness),
        compressionBurden: summarizeMetric((metric) => metric.compressionBurden),
        reticleContrast: summarizeMetric((metric) => metric.reticleContrast),
        roiStability: options.roiStability ?? 100,
        fpsStability: options.fpsStability ?? 100,
    });
}

function classifyFrameIssues(metrics: CaptureQualityMetrics): readonly VideoQualityFrameIssue[] {
    const issues: VideoQualityFrameIssue[] = [];

    if (metrics.sharpness <= 0 || metrics.reticleContrast <= 0) {
        issues.push('reticle_lost');
        return issues;
    }

    if (metrics.sharpness < 45) {
        issues.push('low_sharpness');
    }

    if (metrics.compressionBurden >= 60) {
        issues.push('compression');
    }

    if (metrics.reticleContrast < 35) {
        issues.push('low_reticle_contrast');
    }

    return issues;
}

function classifyFrameStatus(issues: readonly VideoQualityFrameIssue[]): VideoQualityFrameStatus {
    if (issues.includes('reticle_lost')) {
        return 'lost';
    }

    return issues.length > 0 ? 'degraded' : 'good';
}

function rankFrameIssue(issue: VideoQualityFrameIssue): number {
    switch (issue) {
        case 'reticle_lost':
            return 4;
        case 'compression':
            return 3;
        case 'low_sharpness':
            return 2;
        case 'low_reticle_contrast':
            return 1;
        default:
            return 0;
    }
}

function selectSegmentPrimaryIssue(frames: readonly VideoQualityFrameDiagnostic[]): VideoQualityFrameIssue {
    let primaryIssue: VideoQualityFrameIssue = 'low_reticle_contrast';
    let primaryRank = 0;

    for (const frame of frames) {
        for (const issue of frame.issues) {
            const rank = rankFrameIssue(issue);
            if (rank > primaryRank) {
                primaryIssue = issue;
                primaryRank = rank;
            }
        }
    }

    return primaryIssue;
}

function createDegradedSegments(
    frames: readonly VideoQualityFrameDiagnostic[]
): VideoQualityFrameTimeline['degradedSegments'] {
    const segments: VideoQualityFrameTimeline['degradedSegments'][number][] = [];
    let current: VideoQualityFrameDiagnostic[] = [];

    const flush = (): void => {
        if (current.length === 0) {
            return;
        }

        const first = current[0]!;
        const last = current[current.length - 1]!;
        const severity: VideoQualitySegmentSeverity = current.some((frame) => frame.status === 'lost')
            ? 'critical'
            : 'warning';
        const primaryIssue = selectSegmentPrimaryIssue(current);

        segments.push({
            startMs: first.timestampMs,
            endMs: last.timestampMs,
            severity,
            primaryIssue,
            frameCount: current.length,
        });
        current = [];
    };

    for (const frame of frames) {
        if (frame.status === 'good') {
            flush();
            continue;
        }

        current.push(frame);
    }

    flush();
    return segments;
}

export function createVideoQualityFrameDiagnostics(
    frames: readonly VideoQualityDiagnosticFrameInput[],
    options: CreateVideoQualityFrameDiagnosticsOptions = {}
): VideoQualityFrameTimeline {
    const diagnostics = frames.map((frame): VideoQualityFrameDiagnostic => {
        const metrics = measureCaptureQualityFrame(
            options.normalizeBeforeScoring ? normalizeTrackingFrame(frame.imageData) : frame.imageData,
            options.targetColor ?? 'RED'
        );
        const issues = classifyFrameIssues(metrics);
        const status = classifyFrameStatus(issues);

        return {
            frameIndex: frame.index,
            timestampMs: asMilliseconds(frame.timestamp),
            sharpness: asScore(metrics.sharpness),
            compressionBurden: asScore(metrics.compressionBurden),
            reticleContrast: asScore(metrics.reticleContrast),
            status,
            issues,
        };
    });

    const summary = diagnostics.reduce(
        (current, frame) => ({
            totalFrames: current.totalFrames + 1,
            goodFrames: current.goodFrames + (frame.status === 'good' ? 1 : 0),
            degradedFrames: current.degradedFrames + (frame.status === 'degraded' ? 1 : 0),
            lostFrames: current.lostFrames + (frame.status === 'lost' ? 1 : 0),
        }),
        {
            totalFrames: 0,
            goodFrames: 0,
            degradedFrames: 0,
            lostFrames: 0,
        }
    );

    return {
        frames: diagnostics,
        degradedSegments: createDegradedSegments(diagnostics),
        summary,
    };
}

function classifyVideoQualityTier(report: VideoQualityReport): VideoQualityTier {
    const score = Number(report.overallScore);

    if (score >= 80 && report.usableForAnalysis && report.blockingReasons.length === 0) {
        return 'cinematic';
    }

    if (score >= 70 && report.usableForAnalysis) {
        return 'production_ready';
    }

    if (score >= 55 && report.usableForAnalysis) {
        return 'analysis_ready';
    }

    if (score >= 40) {
        return 'limited';
    }

    return 'poor';
}

function createVideoQualitySummary(
    tier: VideoQualityTier,
    input: CreateVideoQualityDiagnosticReportInput
): string {
    const score = Math.round(Number(input.report.overallScore));
    const sprayWindowText = input.sprayValidity
        ? (input.sprayValidity.valid ? 'spray valido detectado' : 'spray bloqueado por validade')
        : input.sprayWindow
        ? 'janela util do spray detectada'
        : 'janela util do spray nao detectada';

    switch (tier) {
        case 'cinematic':
            return `Clip em nivel cinematico para analise: ${score}/100, ${sprayWindowText}.`;
        case 'production_ready':
            return `Clip pronto para producao: ${score}/100, ${sprayWindowText}.`;
        case 'analysis_ready':
            return `Clip analisavel: ${score}/100, ${sprayWindowText}.`;
        case 'limited':
            return `Leitura limitada: ${score}/100, ${sprayWindowText}.`;
        case 'poor':
            return `Clip fraco para diagnostico: ${score}/100, ${sprayWindowText}.`;
        default:
            return `Qualidade estimada: ${score}/100, ${sprayWindowText}.`;
    }
}

function createVideoQualityRecommendations(
    tier: VideoQualityTier,
    input: CreateVideoQualityDiagnosticReportInput
): readonly string[] {
    const recommendations: string[] = [];
    const reasons = input.report.blockingReasons;
    const validityBlockers = input.sprayValidity?.blockerReasons ?? [];

    if (input.normalizationApplied) {
        recommendations.push('O pipeline aplicou normalizacao de cor/contraste antes da leitura.');
    }

    if (!input.sprayWindow) {
        recommendations.push('Marque o inicio do spray o mais perto possivel do primeiro tiro para reduzir frames mortos.');
    }

    for (const recommendation of createSprayValidityRecommendations(validityBlockers)) {
        recommendations.push(recommendation);
    }

    if (reasons.includes('low_sharpness')) {
        recommendations.push('Aumente nitidez gravando em 1080p/60 FPS ou subindo o bitrate do gravador.');
    }

    if (reasons.includes('high_compression_burden')) {
        recommendations.push('Reduza compressao pesada no Medal/OBS; prefira bitrate alto e evite reexportar o clip.');
    }

    if (reasons.includes('low_reticle_contrast')) {
        recommendations.push('Use reticulo vermelho ou verde bem saturado e evite fundos com cor parecida.');
    }

    if (reasons.includes('unstable_fps')) {
        recommendations.push('Priorize 60 FPS estavel para capturar micro-ajustes entre tiros.');
    }

    if (reasons.includes('unstable_roi')) {
        recommendations.push('Centralize a mira e evite cortes que mudem a area util durante o spray.');
    }

    if (tier !== 'cinematic' && input.report.usableForAnalysis) {
        recommendations.push('Para subir para nivel cinematico, combine 1080p/60 FPS, bitrate alto e reticulo saturado.');
    }

    if (recommendations.length === 0) {
        recommendations.push('Clip excelente; mantenha as mesmas configs de gravacao para os proximos testes.');
    }

    return recommendations;
}

function createSprayValidityRecommendations(
    reasons: readonly AnalysisBlockerReasonCode[]
): readonly string[] {
    const copy: Partial<Record<AnalysisBlockerReasonCode, string>> = {
        too_short: 'Grave pelo menos um spray completo antes de analisar.',
        hard_cut: 'Evite cortes dentro do spray; exporte um trecho continuo.',
        flick: 'Nao misture flick com spray controlado no mesmo clip.',
        target_swap: 'Use um unico alvo durante a janela de spray.',
        camera_motion: 'Evite movimento de camera externo durante a captura.',
        crosshair_not_visible: 'Use reticulo vermelho ou verde visivel no centro.',
        not_spray_protocol: 'Grave um spray sustentado com arma, mira e distancia fixas.',
    };

    return [...new Set(reasons.map((reason) => copy[reason]).filter((message): message is string => Boolean(message)))];
}

export function createVideoQualityDiagnosticReport(
    input: CreateVideoQualityDiagnosticReportInput
): VideoQualityDiagnosticReport {
    const tier = classifyVideoQualityTier(input.report);
    const sprayWindow = input.sprayWindow ?? undefined;
    const sprayValidity = input.sprayValidity ?? undefined;

    return {
        tier,
        summary: createVideoQualitySummary(tier, input),
        recommendations: createVideoQualityRecommendations(tier, input),
        preprocessing: {
            normalizationApplied: input.normalizationApplied,
            sampledFrames: input.sampledFrames,
            selectedFrames: input.selectedFrames,
            ...(sprayWindow ? { sprayWindow } : {}),
            ...(sprayValidity ? {
                sprayValidity,
                validityBlockerReasons: sprayValidity.blockerReasons,
                recaptureGuidance: sprayValidity.recaptureGuidance,
            } : {}),
        },
        ...(input.timeline ? { timeline: input.timeline } : {}),
    };
}

export function createVideoQualityReport(
    input: CreateVideoQualityReportInput
): VideoQualityReport {
    const sharpness = normalizeScore(input.sharpness);
    const compressionBurden = normalizeScore(input.compressionBurden);
    const reticleContrast = normalizeScore(input.reticleContrast);
    const roiStability = normalizeScore(input.roiStability);
    const fpsStability = normalizeScore(input.fpsStability);
    const blockingReasons: VideoQualityBlockingReason[] = [];

    for (const reason of input.blockingReasons ?? []) {
        pushReason(blockingReasons, reason);
    }

    for (const reason of deriveVideoQualityBlockingReasons(input)) {
        pushReason(blockingReasons, reason);
    }

    const overallScore = Math.round(
        (
            sharpness +
            reticleContrast +
            roiStability +
            fpsStability +
            (100 - compressionBurden)
        ) / 5
    );

    return {
        overallScore: asScore(overallScore),
        sharpness: asScore(sharpness),
        compressionBurden: asScore(compressionBurden),
        reticleContrast: asScore(reticleContrast),
        roiStability: asScore(roiStability),
        fpsStability: asScore(fpsStability),
        usableForAnalysis: blockingReasons.length === 0 && overallScore >= 55,
        blockingReasons,
        ...(input.diagnostic ? { diagnostic: input.diagnostic } : {}),
    };
}
