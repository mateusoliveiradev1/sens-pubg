import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    MuzzleAttachment,
    PrecisionCompatibilityBlocker,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    ProfileType,
    SprayLabRepairState,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
    SprayLabValidationStatus,
} from '@/types/engine';

export interface SprayLabValidationTargetSnapshot {
    readonly version: 'spray-lab-v1';
    readonly labSessionId: string;
    readonly validationLinkId: string | null;
    readonly baseAnalysisSessionId: string;
    readonly validationAnalysisSessionId: string | null;
    readonly protocolId: string;
    readonly laneId: string;
    readonly laneLabel: string;
    readonly contextKey: string;
    readonly targetCopy: string;
    readonly context: {
        readonly weaponId: string | null;
        readonly weaponName: string | null;
        readonly opticId: string | null;
        readonly opticName: string | null;
        readonly distanceMeters: number | null;
        readonly distanceMode: CompleteTrainingProtocol['context']['distanceMode'] | null;
        readonly stance: CompleteTrainingProtocol['context']['stance'] | null;
        readonly muzzle: MuzzleAttachment | null;
        readonly grip: CompleteTrainingProtocol['context']['attachments']['grip'] | null;
        readonly stock: CompleteTrainingProtocol['context']['attachments']['stock'] | null;
        readonly sensitivityProfile: ProfileType | null;
        readonly patchVersion: string | null;
    };
    readonly checklist: readonly string[];
    readonly validationStatus: SprayLabValidationStatus;
}

export interface CompareSprayLabValidationContextInput {
    readonly target: SprayLabValidationTargetSnapshot;
    readonly result: AnalysisResult;
    readonly confirmedVariables: boolean;
    readonly distanceToleranceMeters?: number;
}

export interface SprayLabValidationContextComparison {
    readonly compatible: boolean;
    readonly blockers: readonly PrecisionCompatibilityBlocker[];
}

export interface ResolveSprayLabValidationStatusInput {
    readonly confirmedVariables: boolean;
    readonly compatibility?: SprayLabValidationContextComparison;
    readonly trend?: PrecisionTrendSummary;
    readonly result?: AnalysisResult;
}

function blocker(
    code: PrecisionCompatibilityBlocker['code'],
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

function normalizeString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : undefined;
}

function compareString(
    blockers: PrecisionCompatibilityBlocker[],
    code: PrecisionCompatibilityBlocker['code'],
    field: string,
    target: string | null,
    current: string | undefined,
    message: string,
): void {
    if (!target) {
        blockers.push(blocker('missing_metadata', field, `${message} ausente no alvo de validacao.`));
        return;
    }

    if (!current) {
        blockers.push(blocker('missing_metadata', field, `${message} ausente no novo clip.`));
        return;
    }

    if (target !== current) {
        blockers.push(blocker(code, field, `${message} diferente bloqueia validacao tecnica.`, {
            currentValue: current,
            candidateValue: target,
        }));
    }
}

function readResultScopeId(result: AnalysisResult): string | undefined {
    return normalizeString(result.analysisContext?.optic.scopeId)
        ?? normalizeString(result.analysisContext?.optic.opticId);
}

function readDistance(result: AnalysisResult): number | undefined {
    const value = result.analysisContext?.targetDistanceMeters;
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function trendLabelToValidationStatus(label: PrecisionTrendLabel | undefined): SprayLabValidationStatus {
    switch (label) {
        case 'validated_progress':
        case 'consolidated':
            return 'validacao_confirmada';
        case 'validated_regression':
            return 'regressao_validada';
        case 'initial_signal':
        case 'in_validation':
            return 'sinal_promissor';
        case 'oscillation':
        case 'baseline':
            return 'sem_mudanca_clara';
        case 'not_comparable':
            return 'nao_compativel';
        case undefined:
            return 'pending';
    }
}

export function buildSprayLabValidationTarget(input: {
    readonly session: SprayLabSessionSnapshot;
    readonly baseAnalysisSessionId: string;
    readonly validationAnalysisSessionId?: string | null;
    readonly validationLink?: SprayLabValidationLink | null;
}): SprayLabValidationTargetSnapshot {
    const context = input.session.protocol.context;
    const validationLink = input.validationLink ?? input.session.validationLink ?? null;
    const targetCopy = validationLink?.targetCopy ?? [
        'Validando',
        context.weaponName ?? context.weaponId ?? 'arma',
        context.opticName ?? context.opticId ?? 'mira',
        typeof context.distanceMeters === 'number' ? `${Math.round(context.distanceMeters)}m` : 'distancia do protocolo',
        input.session.lane.shortLabel,
    ].join(' - ');

    return {
        version: 'spray-lab-v1',
        labSessionId: input.session.id,
        validationLinkId: validationLink?.id ?? null,
        baseAnalysisSessionId: input.baseAnalysisSessionId,
        validationAnalysisSessionId: input.validationAnalysisSessionId ?? validationLink?.validationAnalysisId ?? null,
        protocolId: input.session.protocolId,
        laneId: input.session.lane.id,
        laneLabel: input.session.lane.label,
        contextKey: input.session.contextKey,
        targetCopy,
        context: {
            weaponId: context.weaponId ?? null,
            weaponName: context.weaponName ?? null,
            opticId: context.opticId ?? null,
            opticName: context.opticName ?? null,
            distanceMeters: context.distanceMeters ?? null,
            distanceMode: context.distanceMode ?? null,
            stance: context.stance ?? null,
            muzzle: context.attachments.muzzle ?? null,
            grip: context.attachments.grip ?? null,
            stock: context.attachments.stock ?? null,
            sensitivityProfile: context.sensitivityProfile ?? null,
            patchVersion: context.patchVersion ?? null,
        },
        checklist: input.session.protocol.validation.compatibleClipChecklist,
        validationStatus: validationLink?.status ?? input.session.validationStatus,
    };
}

export function compareSprayLabValidationContext(
    input: CompareSprayLabValidationContextInput,
): SprayLabValidationContextComparison {
    const blockers: PrecisionCompatibilityBlocker[] = [];

    if (!input.confirmedVariables) {
        blockers.push(blocker(
            'evidence_mismatch',
            'variables',
            'Variaveis alteradas rebaixam a tentativa para pratica ou evidencia fraca.',
            { currentValue: false, candidateValue: true },
        ));
        return { compatible: false, blockers };
    }

    const target = input.target.context;
    const result = input.result;

    compareString(
        blockers,
        'patch_mismatch',
        'patchVersion',
        target.patchVersion,
        normalizeString(result.patchVersion),
        'Patch',
    );
    compareString(
        blockers,
        'weapon_mismatch',
        'weaponId',
        target.weaponId,
        normalizeString(result.trajectory.weaponId),
        'Arma',
    );
    compareString(
        blockers,
        'scope_mismatch',
        'scopeId',
        target.opticId,
        readResultScopeId(result),
        'Mira',
    );
    compareString(
        blockers,
        'stance_mismatch',
        'stance',
        target.stance ?? null,
        normalizeString(result.loadout.stance),
        'Postura',
    );
    compareString(
        blockers,
        'muzzle_mismatch',
        'muzzle',
        target.muzzle ?? null,
        normalizeString(result.loadout.muzzle),
        'Muzzle',
    );
    compareString(
        blockers,
        'grip_mismatch',
        'grip',
        target.grip ?? null,
        normalizeString(result.loadout.grip),
        'Grip',
    );
    compareString(
        blockers,
        'stock_mismatch',
        'stock',
        target.stock ?? null,
        normalizeString(result.loadout.stock),
        'Stock',
    );

    const targetDistance = target.distanceMeters;
    const currentDistance = readDistance(result);
    const tolerance = input.distanceToleranceMeters ?? 2;

    if (typeof targetDistance !== 'number') {
        blockers.push(blocker('distance_missing', 'distanceMeters', 'Distancia ausente no alvo bloqueia validacao tecnica.'));
    } else if (typeof currentDistance !== 'number') {
        blockers.push(blocker('distance_missing', 'distanceMeters', 'Distancia ausente no novo clip bloqueia validacao tecnica.'));
    } else if (Math.abs(targetDistance - currentDistance) > tolerance) {
        blockers.push(blocker('distance_out_of_tolerance', 'distanceMeters', `Distancia precisa exige diferenca maxima de ${tolerance}m.`, {
            currentValue: currentDistance,
            candidateValue: targetDistance,
        }));
    }

    if (target.distanceMode !== 'exact' || result.analysisContext?.distanceMode !== 'exact') {
        blockers.push(blocker('distance_ambiguous', 'distanceMode', 'Validacao tecnica precisa de distancia confirmada, nao estimada.', {
            currentValue: result.analysisContext?.distanceMode ?? null,
            candidateValue: target.distanceMode ?? null,
        }));
    }

    if (
        target.sensitivityProfile
        && result.sensitivity.recommended
        && target.sensitivityProfile !== result.sensitivity.recommended
    ) {
        blockers.push(blocker('sensitivity_change', 'sensitivity', 'Perfil de sensibilidade diferente reinicia a linha tecnica.', {
            currentValue: result.sensitivity.recommended,
            candidateValue: target.sensitivityProfile,
        }));
    }

    if (result.analysisDecision && !result.analysisDecision.permissionMatrix.canEnterPrecisionTrend) {
        blockers.push(blocker('decision_level_insufficient', 'analysisDecision.level', 'Decision ladder abaixo de usable_analysis bloqueia validacao tecnica.', {
            currentValue: result.analysisDecision.level,
        }));
    }

    return {
        compatible: blockers.length === 0,
        blockers,
    };
}

export function resolveSprayLabValidationStatus(
    input: ResolveSprayLabValidationStatusInput,
): SprayLabValidationStatus {
    if (!input.confirmedVariables) {
        return 'nao_compativel';
    }

    if (input.compatibility && !input.compatibility.compatible) {
        return 'nao_compativel';
    }

    const decisionLevel = input.result?.analysisDecision?.level;
    if (decisionLevel === 'blocked_invalid_clip' || decisionLevel === 'inconclusive_recapture') {
        return 'inconclusivo';
    }

    return trendLabelToValidationStatus(input.trend?.label);
}

export function buildSprayLabValidationRepairState(input: {
    readonly status: SprayLabValidationStatus;
    readonly blockers?: readonly PrecisionCompatibilityBlocker[];
}): SprayLabRepairState | null {
    if (
        input.status === 'validacao_confirmada'
        || input.status === 'sinal_promissor'
        || input.status === 'sem_mudanca_clara'
        || input.status === 'pending'
    ) {
        return null;
    }

    const hasContextBlocker = (input.blockers ?? []).some((current) => (
        current.code === 'weapon_mismatch'
        || current.code === 'scope_mismatch'
        || current.code === 'distance_out_of_tolerance'
        || current.code === 'distance_ambiguous'
        || current.code === 'sensitivity_change'
        || current.code === 'evidence_mismatch'
    ));
    const type = hasContextBlocker ? 'contexto_incompativel' : 'clip_inconclusivo';

    return {
        type,
        title: type === 'contexto_incompativel' ? 'Contexto incompativel' : 'Clip inconclusivo',
        whatHappened: type === 'contexto_incompativel'
            ? 'Alguma variavel central mudou ou nao foi confirmada.'
            : 'A tentativa nao sustentou comparacao tecnica forte.',
        whyItMatters: type === 'contexto_incompativel'
            ? 'Contextos diferentes nao podem virar uma unica linha de validacao.'
            : 'Validacao tecnica depende de leitura clara e repetivel.',
        stillUsefulAs: 'practice',
        ctas: type === 'contexto_incompativel'
            ? ['Repita mantendo arma, mira, distancia, postura, attachments e sensibilidade iguais.']
            : ['Regrave um spray continuo com reticulo visivel e alvo unico.'],
        reasonCodes: type === 'contexto_incompativel' ? ['variable_changed'] : ['user_confused'],
    };
}
