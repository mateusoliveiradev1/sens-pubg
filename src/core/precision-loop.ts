import type {
    AnalysisResult,
    PrecisionBlockerSummary,
    PrecisionBlockedClipSummary,
    PrecisionCompatibilityBlocker,
    PrecisionCompatibilityBlockerCode,
    PrecisionCompatibilityKey,
    PrecisionCompatibilityResult,
    PrecisionEvidenceLevel,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
} from '@/types/engine';

export const STRICT_DISTANCE_TOLERANCE_METERS = 2;
export const PRECISION_ACTIONABLE_DEAD_ZONE_POINTS = 4;
export const PRECISION_VALIDATION_MIN_TOTAL_CLIPS = 3;
export const PRECISION_STRONG_COVERAGE = 0.78;
export const PRECISION_STRONG_CONFIDENCE = 0.78;
export const PRECISION_STRONG_QUALITY_SCORE = 70;
export const PRECISION_MIN_SAMPLE_SIZE = 20;
export const PRECISION_CAPTURE_QUALITY_MISMATCH_POINTS = 20;
export const PRECISION_EVIDENCE_MISMATCH_RATIO = 0.2;
export const PRECISION_DURATION_TOLERANCE_MS = 300;
export const PRECISION_SPRAY_WINDOW_TOLERANCE_MS = 300;
export const PRECISION_CADENCE_TOLERANCE_EVENTS = 2;

export interface PrecisionCompatibilityOptions {
    readonly distanceToleranceMeters?: number;
}

export interface ResolvePrecisionTrendInput {
    readonly current: AnalysisResult;
    readonly history: readonly AnalysisResult[];
    readonly options?: PrecisionCompatibilityOptions;
}

function blocker(
    code: PrecisionCompatibilityBlockerCode,
    field: string,
    message: string,
    values: {
        readonly currentValue?: string | number | boolean | null;
        readonly candidateValue?: string | number | boolean | null;
    } = {},
): PrecisionCompatibilityBlocker {
    return {
        code,
        field,
        message,
        ...(values.currentValue !== undefined ? { currentValue: values.currentValue } : {}),
        ...(values.candidateValue !== undefined ? { candidateValue: values.candidateValue } : {}),
    };
}

interface PrecisionEvidenceSnapshot {
    readonly coverage: number;
    readonly confidence: number;
    readonly qualityScore: number;
    readonly sampleSize: number;
    readonly usableForAnalysis: boolean;
}

export function buildPrecisionCompatibilityKey(result: AnalysisResult): PrecisionCompatibilityResult {
    const blockers: PrecisionCompatibilityBlocker[] = [];
    const context = result.analysisContext;
    const optic = context?.optic;
    const patchVersion = normalizeString(result.patchVersion);
    const weaponId = normalizeString(result.trajectory?.weaponId);
    const scopeId = normalizeString(optic?.scopeId ?? optic?.opticId);
    const distanceMeters = context?.targetDistanceMeters;
    const durationMs = finiteNumber(result.trajectory?.durationMs);
    const sprayWindow = result.videoQualityReport?.diagnostic?.preprocessing.sprayWindow;
    const loadout = result.loadout as Partial<AnalysisResult['loadout']> | undefined;
    const stance = normalizeString(loadout?.stance);
    const muzzle = normalizeString(loadout?.muzzle);
    const grip = normalizeString(loadout?.grip);
    const stock = normalizeString(loadout?.stock);
    const evidence = readEvidenceSnapshot(result);

    if (!patchVersion) {
        blockers.push(blocker('missing_metadata', 'patchVersion', 'Patch ausente bloqueia trend preciso.'));
    }

    if (!weaponId) {
        blockers.push(blocker('missing_metadata', 'weaponId', 'Arma ausente bloqueia trend preciso.'));
    }

    if (!scopeId) {
        blockers.push(blocker('missing_metadata', 'scopeId', 'Scope/optic ausente bloqueia trend preciso.'));
    }

    if (!stance) {
        blockers.push(blocker('missing_metadata', 'stance', 'Stance ausente bloqueia trend preciso.'));
    }

    if (!muzzle) {
        blockers.push(blocker('missing_metadata', 'muzzle', 'Muzzle ausente bloqueia trend preciso.'));
    }

    if (!grip) {
        blockers.push(blocker('missing_metadata', 'grip', 'Grip ausente bloqueia trend preciso.'));
    }

    if (!stock) {
        blockers.push(blocker('missing_metadata', 'stock', 'Stock ausente bloqueia trend preciso.'));
    }

    if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
        blockers.push(blocker('distance_missing', 'distanceMeters', 'Distancia ausente bloqueia comparacao precisa.'));
    } else if (context?.distanceMode !== 'exact') {
        blockers.push(blocker('distance_ambiguous', 'distanceMode', 'Distancia estimada ou desconhecida bloqueia trend preciso.', {
            currentValue: context?.distanceMode ?? null,
        }));
    }

    if (!optic?.opticStateId || optic.opticStateId === 'unknown') {
        blockers.push(blocker('optic_state_missing', 'opticStateId', 'Estado do optic ausente bloqueia comparacao precisa.'));
    }

    if (!durationMs || durationMs <= 0) {
        blockers.push(blocker('spray_type_missing', 'durationMs', 'Duracao do spray ausente bloqueia protocolo de comparacao.'));
    }

    if (!evidence.usableForAnalysis) {
        blockers.push(blocker('capture_quality_unusable', 'usableForAnalysis', 'Qualidade de captura inutilizavel bloqueia trend preciso.', {
            currentValue: false,
        }));
    }

    if (
        evidence.coverage < PRECISION_STRONG_COVERAGE
        || evidence.confidence < PRECISION_STRONG_CONFIDENCE
        || evidence.qualityScore < PRECISION_STRONG_QUALITY_SCORE
        || evidence.sampleSize < PRECISION_MIN_SAMPLE_SIZE
    ) {
        blockers.push(blocker('capture_quality_weak', 'mastery.evidence', 'Cobertura, confianca, qualidade ou amostra fraca bloqueia comparacao precisa.'));
    }

    if (
        blockers.length > 0
        || !patchVersion
        || !weaponId
        || !scopeId
        || !stance
        || !muzzle
        || !grip
        || !stock
        || typeof distanceMeters !== 'number'
        || !durationMs
    ) {
        return {
            compatible: false,
            blockers,
        };
    }

    const sprayProtocolKey = sprayWindow
        ? `window:${Math.round((sprayWindow.endMs - sprayWindow.startMs) / 100) * 100}:${sprayWindow.shotLikeEvents}`
        : `duration:${Math.round(durationMs / 250) * 250}`;
    const sensitivitySignature = buildSensitivitySignature(result);
    const key: PrecisionCompatibilityKey = {
        patchVersion,
        weaponId,
        scopeId,
        ...(optic?.opticStateId ? { opticStateId: optic.opticStateId } : {}),
        stance: stance as AnalysisResult['loadout']['stance'],
        muzzle: muzzle as AnalysisResult['loadout']['muzzle'],
        grip: grip as AnalysisResult['loadout']['grip'],
        stock: stock as AnalysisResult['loadout']['stock'],
        distanceMeters,
        sprayProtocolKey,
        durationMs,
        ...(sprayWindow ? {
            sprayWindowStartMs: sprayWindow.startMs,
            sprayWindowEndMs: sprayWindow.endMs,
            shotLikeEvents: sprayWindow.shotLikeEvents,
        } : {}),
        sensitivityProfile: result.sensitivity.recommended,
        ...(sensitivitySignature ? { sensitivitySignature } : {}),
    };

    return {
        compatible: true,
        key,
        blockers: [],
    };
}

export function comparePrecisionCompatibility(
    current: AnalysisResult,
    candidate: AnalysisResult,
    options: PrecisionCompatibilityOptions = {},
): PrecisionCompatibilityResult {
    const currentKeyResult = buildPrecisionCompatibilityKey(current);
    const candidateKeyResult = buildPrecisionCompatibilityKey(candidate);
    const blockers: PrecisionCompatibilityBlocker[] = [
        ...currentKeyResult.blockers,
        ...candidateKeyResult.blockers,
    ];
    const currentKey = currentKeyResult.key;
    const candidateKey = candidateKeyResult.key;

    if (currentKey && candidateKey) {
        compareStringField(blockers, 'patch_mismatch', 'patchVersion', currentKey.patchVersion, candidateKey.patchVersion);
        compareStringField(blockers, 'weapon_mismatch', 'weaponId', currentKey.weaponId, candidateKey.weaponId);
        compareStringField(blockers, 'scope_mismatch', 'scopeId', currentKey.scopeId, candidateKey.scopeId);
        compareStringField(blockers, 'optic_state_mismatch', 'opticStateId', currentKey.opticStateId, candidateKey.opticStateId);
        compareStringField(blockers, 'stance_mismatch', 'stance', currentKey.stance, candidateKey.stance);
        compareStringField(blockers, 'muzzle_mismatch', 'muzzle', currentKey.muzzle, candidateKey.muzzle);
        compareStringField(blockers, 'grip_mismatch', 'grip', currentKey.grip, candidateKey.grip);
        compareStringField(blockers, 'stock_mismatch', 'stock', currentKey.stock, candidateKey.stock);
        compareSprayProtocol(blockers, currentKey, candidateKey);
        compareCaptureEvidence(blockers, current, candidate);
        compareSensitivity(blockers, currentKey, candidateKey);

        const distanceTolerance = options.distanceToleranceMeters ?? STRICT_DISTANCE_TOLERANCE_METERS;
        if (Math.abs(currentKey.distanceMeters - candidateKey.distanceMeters) > distanceTolerance) {
            blockers.push(blocker('distance_out_of_tolerance', 'distanceMeters', `Distancia precisa exige diferenca maxima de ${distanceTolerance}m.`, {
                currentValue: currentKey.distanceMeters,
                candidateValue: candidateKey.distanceMeters,
            }));
        }
    }

    return {
        compatible: blockers.length === 0,
        ...(currentKey ? { key: currentKey } : {}),
        ...(candidateKey ? { candidateKey } : {}),
        blockers,
    };
}

export function resolvePrecisionTrend(input: ResolvePrecisionTrendInput): PrecisionTrendSummary {
    const compatibility = buildPrecisionCompatibilityKey(input.current);

    if (!compatibility.compatible) {
        return emptyTrendSummary({
            label: 'not_comparable',
            evidenceLevel: 'blocked',
            blockerSummaries: summarizePrecisionBlockers(compatibility.blockers),
            blockedClips: [{
                resultId: input.current.id,
                blockers: compatibility.blockers,
            }],
            nextValidationHint: 'Grave um clip com metadados completos antes de comparar tendencia.',
        });
    }

    const blockedClips: PrecisionBlockedClipSummary[] = [];

    for (const candidate of input.history) {
        const candidateCompatibility = comparePrecisionCompatibility(input.current, candidate, input.options);

        if (!candidateCompatibility.compatible) {
            blockedClips.push({
                resultId: candidate.id,
                blockers: candidateCompatibility.blockers,
            });
        }
    }

    return emptyTrendSummary({
        label: 'baseline',
        evidenceLevel: 'baseline',
        blockerSummaries: buildBlockerSummariesFromBlockedClips(blockedClips),
        blockedClips,
        nextValidationHint: 'Baseline precisa criada. Grave outra validacao com o mesmo contexto.',
    });
}

export function formatPrecisionTrendLabel(label: PrecisionTrendLabel): string {
    switch (label) {
        case 'baseline':
            return 'Baseline';
        case 'initial_signal':
            return 'Sinal inicial';
        case 'in_validation':
            return 'Em validacao';
        case 'validated_progress':
            return 'Progresso validado';
        case 'validated_regression':
            return 'Regressao validada';
        case 'oscillation':
            return 'Oscilacao';
        case 'not_comparable':
            return 'Nao comparavel';
        case 'consolidated':
            return 'Consolidado';
    }
}

export function summarizePrecisionBlockers(
    blockers: readonly PrecisionCompatibilityBlocker[],
    resultIds: readonly string[] = [],
): readonly PrecisionBlockerSummary[] {
    const grouped = new Map<PrecisionCompatibilityBlockerCode, PrecisionBlockerSummary>();

    for (const current of blockers) {
        const existing = grouped.get(current.code);
        grouped.set(current.code, {
            code: current.code,
            count: (existing?.count ?? 0) + 1,
            message: existing?.message ?? current.message,
            resultIds: existing
                ? Array.from(new Set([...existing.resultIds, ...resultIds]))
                : resultIds,
        });
    }

    return Array.from(grouped.values());
}

function compareStringField(
    blockers: PrecisionCompatibilityBlocker[],
    code: PrecisionCompatibilityBlockerCode,
    field: string,
    currentValue: string | undefined,
    candidateValue: string | undefined,
): void {
    if (currentValue !== candidateValue) {
        blockers.push(blocker(code, field, `${field} diferente bloqueia trend preciso.`, {
            currentValue: currentValue ?? null,
            candidateValue: candidateValue ?? null,
        }));
    }
}

function compareSprayProtocol(
    blockers: PrecisionCompatibilityBlocker[],
    currentKey: PrecisionCompatibilityKey,
    candidateKey: PrecisionCompatibilityKey,
): void {
    const currentHasWindow = typeof currentKey.sprayWindowStartMs === 'number' && typeof currentKey.sprayWindowEndMs === 'number';
    const candidateHasWindow = typeof candidateKey.sprayWindowStartMs === 'number' && typeof candidateKey.sprayWindowEndMs === 'number';

    if (currentHasWindow !== candidateHasWindow) {
        blockers.push(blocker('spray_type_missing', 'sprayWindow', 'Janela de spray ausente em um clip bloqueia comparacao precisa.', {
            currentValue: currentHasWindow,
            candidateValue: candidateHasWindow,
        }));
        return;
    }

    if (currentHasWindow && candidateHasWindow) {
        const startDelta = Math.abs(currentKey.sprayWindowStartMs! - candidateKey.sprayWindowStartMs!);
        const endDelta = Math.abs(currentKey.sprayWindowEndMs! - candidateKey.sprayWindowEndMs!);

        if (startDelta > PRECISION_SPRAY_WINDOW_TOLERANCE_MS || endDelta > PRECISION_SPRAY_WINDOW_TOLERANCE_MS) {
            blockers.push(blocker('spray_window_mismatch', 'sprayWindow', 'Janelas de spray diferentes bloqueiam trend preciso.', {
                currentValue: currentKey.sprayProtocolKey,
                candidateValue: candidateKey.sprayProtocolKey,
            }));
        }
    }

    if (Math.abs((currentKey.durationMs ?? 0) - (candidateKey.durationMs ?? 0)) > PRECISION_DURATION_TOLERANCE_MS) {
        blockers.push(blocker('duration_mismatch', 'durationMs', 'Duracao do spray diferente bloqueia trend preciso.', {
            currentValue: currentKey.durationMs ?? null,
            candidateValue: candidateKey.durationMs ?? null,
        }));
    }

    if (
        typeof currentKey.shotLikeEvents === 'number'
        && typeof candidateKey.shotLikeEvents === 'number'
        && Math.abs(currentKey.shotLikeEvents - candidateKey.shotLikeEvents) > PRECISION_CADENCE_TOLERANCE_EVENTS
    ) {
        blockers.push(blocker('cadence_mismatch', 'shotLikeEvents', 'Cadencia/quantidade de eventos do spray diferente bloqueia trend preciso.', {
            currentValue: currentKey.shotLikeEvents,
            candidateValue: candidateKey.shotLikeEvents,
        }));
    }
}

function compareCaptureEvidence(
    blockers: PrecisionCompatibilityBlocker[],
    current: AnalysisResult,
    candidate: AnalysisResult,
): void {
    const currentEvidence = readEvidenceSnapshot(current);
    const candidateEvidence = readEvidenceSnapshot(candidate);

    if (Math.abs(currentEvidence.qualityScore - candidateEvidence.qualityScore) > PRECISION_CAPTURE_QUALITY_MISMATCH_POINTS) {
        blockers.push(blocker('capture_quality_mismatch', 'qualityScore', 'Qualidade de captura muito diferente bloqueia trend preciso.', {
            currentValue: currentEvidence.qualityScore,
            candidateValue: candidateEvidence.qualityScore,
        }));
    }

    if (
        Math.abs(currentEvidence.coverage - candidateEvidence.coverage) > PRECISION_EVIDENCE_MISMATCH_RATIO
        || Math.abs(currentEvidence.confidence - candidateEvidence.confidence) > PRECISION_EVIDENCE_MISMATCH_RATIO
        || Math.min(currentEvidence.sampleSize, candidateEvidence.sampleSize) / Math.max(currentEvidence.sampleSize, candidateEvidence.sampleSize, 1) < 0.6
    ) {
        blockers.push(blocker('evidence_mismatch', 'mastery.evidence', 'Evidencia de cobertura, confianca ou amostra nao e comparavel.'));
    }
}

function compareSensitivity(
    blockers: PrecisionCompatibilityBlocker[],
    currentKey: PrecisionCompatibilityKey,
    candidateKey: PrecisionCompatibilityKey,
): void {
    if (
        currentKey.sensitivityProfile !== candidateKey.sensitivityProfile
        || currentKey.sensitivitySignature !== candidateKey.sensitivitySignature
    ) {
        blockers.push(blocker('sensitivity_change', 'sensitivity', 'Mudanca forte de sensibilidade reinicia a linha precisa.', {
            currentValue: currentKey.sensitivitySignature ?? currentKey.sensitivityProfile ?? null,
            candidateValue: candidateKey.sensitivitySignature ?? candidateKey.sensitivityProfile ?? null,
        }));
    }
}

function readEvidenceSnapshot(result: AnalysisResult): PrecisionEvidenceSnapshot {
    const metricQuality = result.metrics.metricQuality?.sprayScore
        ?? result.metrics.metricQuality?.shotResiduals
        ?? result.metrics.metricQuality?.verticalControlIndex;
    const framesProcessed = finiteNumber(metricQuality?.framesProcessed)
        ?? finiteNumber(result.trajectory.framesProcessed)
        ?? finiteNumber(result.trajectory.totalFrames)
        ?? 0;
    const visibleFrames = finiteNumber(metricQuality?.framesTracked)
        ?? finiteNumber(result.trajectory.visibleFrames)
        ?? finiteNumber(result.trajectory.framesTracked)
        ?? 0;
    const fallbackCoverage = framesProcessed > 0
        ? visibleFrames / framesProcessed
        : 0;

    return {
        coverage: clamp01(result.mastery?.evidence.coverage ?? metricQuality?.coverage ?? fallbackCoverage),
        confidence: clamp01(result.mastery?.evidence.confidence ?? metricQuality?.confidence ?? result.trajectory.trackingQuality ?? 0),
        qualityScore: clampScore(result.mastery?.evidence.qualityScore ?? result.videoQualityReport?.overallScore ?? 65),
        sampleSize: Math.max(0, finiteNumber(result.mastery?.evidence.sampleSize ?? metricQuality?.sampleSize ?? result.trajectory.displacements.length) ?? 0),
        usableForAnalysis: result.mastery?.evidence.usableForAnalysis ?? result.videoQualityReport?.usableForAnalysis ?? true,
    };
}

function buildSensitivitySignature(result: AnalysisResult): string | undefined {
    const appliedProfile = result.sensitivity.profiles.find((profile) => profile.type === result.sensitivity.recommended);

    if (!appliedProfile) {
        return undefined;
    }

    return [
        result.sensitivity.recommended,
        Math.round(appliedProfile.general),
        Math.round(appliedProfile.ads),
        Math.round(appliedProfile.cmPer360),
    ].join(':');
}

function buildBlockerSummariesFromBlockedClips(
    blockedClips: readonly PrecisionBlockedClipSummary[],
): readonly PrecisionBlockerSummary[] {
    const summaries = new Map<PrecisionCompatibilityBlockerCode, PrecisionBlockerSummary>();

    for (const clip of blockedClips) {
        for (const currentBlocker of clip.blockers) {
            const existing = summaries.get(currentBlocker.code);
            summaries.set(currentBlocker.code, {
                code: currentBlocker.code,
                count: (existing?.count ?? 0) + 1,
                message: existing?.message ?? currentBlocker.message,
                resultIds: Array.from(new Set([...(existing?.resultIds ?? []), clip.resultId])),
            });
        }
    }

    return Array.from(summaries.values());
}

function emptyTrendSummary(input: {
    readonly label: PrecisionTrendLabel;
    readonly evidenceLevel: PrecisionEvidenceLevel;
    readonly blockerSummaries: readonly PrecisionBlockerSummary[];
    readonly blockedClips: readonly PrecisionBlockedClipSummary[];
    readonly nextValidationHint: string;
}): PrecisionTrendSummary {
    return {
        label: input.label,
        evidenceLevel: input.evidenceLevel,
        compatibleCount: 0,
        baseline: null,
        current: null,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: input.blockerSummaries,
        blockedClips: input.blockedClips,
        confidence: 0,
        coverage: 0,
        nextValidationHint: input.nextValidationHint,
    };
}

function normalizeString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : undefined;
}

function finiteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

function clampScore(value: unknown): number {
    return clamp(finiteNumber(value) ?? 0, 0, 100);
}

function clamp01(value: unknown): number {
    return clamp(finiteNumber(value) ?? 0, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
