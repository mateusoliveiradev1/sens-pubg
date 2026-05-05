import type {
    AnalysisResult,
    PrecisionBlockerSummary,
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

    if (!patchVersion) {
        blockers.push(blocker('missing_metadata', 'patchVersion', 'Patch ausente bloqueia trend preciso.'));
    }

    if (!weaponId) {
        blockers.push(blocker('missing_metadata', 'weaponId', 'Arma ausente bloqueia trend preciso.'));
    }

    if (!scopeId) {
        blockers.push(blocker('missing_metadata', 'scopeId', 'Scope/optic ausente bloqueia trend preciso.'));
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

    if (blockers.length > 0 || !patchVersion || !weaponId || !scopeId || typeof distanceMeters !== 'number' || !durationMs) {
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
        stance: result.loadout.stance,
        muzzle: result.loadout.muzzle,
        grip: result.loadout.grip,
        stock: result.loadout.stock,
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
        return emptyTrendSummary('not_comparable', 'blocked', summarizePrecisionBlockers(compatibility.blockers), 'Grave um clip com metadados completos antes de comparar tendencia.');
    }

    return emptyTrendSummary('baseline', 'baseline', [], 'Baseline precisa criada. Grave outra validacao com o mesmo contexto.');
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

function emptyTrendSummary(
    label: PrecisionTrendLabel,
    evidenceLevel: PrecisionEvidenceLevel,
    blockerSummaries: readonly PrecisionBlockerSummary[],
    nextValidationHint: string,
): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel,
        compatibleCount: 0,
        baseline: null,
        current: null,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries,
        blockedClips: [],
        confidence: 0,
        coverage: 0,
        nextValidationHint,
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
