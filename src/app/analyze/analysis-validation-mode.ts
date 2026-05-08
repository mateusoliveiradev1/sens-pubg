import type { SprayLabValidationTarget } from '@/actions/spray-lab';
import type { AnalysisDistanceMode } from '@/types/engine';

export interface AnalysisValidationTarget {
    readonly mode: 'spray_lab_validation';
    readonly labSessionId: string;
    readonly validationLinkId: string | null;
    readonly baseAnalysisSessionId: string;
    readonly protocolId: string;
    readonly targetCopy: string;
    readonly laneLabel: string;
    readonly contextKey: string;
    readonly preload: {
        readonly weaponId: string | null;
        readonly weaponName: string | null;
        readonly opticId: string | null;
        readonly opticName: string | null;
        readonly distanceMeters: number | null;
        readonly distanceMode: AnalysisDistanceMode | null;
        readonly stance: string | null;
        readonly muzzle: string | null;
        readonly grip: string | null;
        readonly stock: string | null;
        readonly sensitivityProfile: string | null;
        readonly patchVersion: string | null;
    };
    readonly checklist: readonly string[];
    readonly statusLabel: string;
    readonly warning: string | null;
}

function normalizeValidationDistanceMode(
    mode: SprayLabValidationTarget['distanceMode'],
): AnalysisDistanceMode | null {
    if (mode === 'estimated_range') {
        return 'estimated';
    }

    return mode ?? null;
}

function statusLabel(status: SprayLabValidationTarget['validationStatus']): string {
    switch (status) {
        case 'not_requested':
            return 'Validacao ainda nao aberta';
        case 'pending':
            return 'Validacao compativel aberta';
        case 'validacao_confirmada':
            return 'Validacao confirmada';
        case 'sinal_promissor':
            return 'Sinal promissor';
        case 'sem_mudanca_clara':
            return 'Sem mudanca clara';
        case 'regressao_validada':
            return 'Regressao validada';
        case 'nao_compativel':
            return 'Contexto nao compativel';
        case 'inconclusivo':
            return 'Clip inconclusivo';
    }
}

export function buildAnalysisValidationTarget(
    target: SprayLabValidationTarget | null,
): AnalysisValidationTarget | null {
    if (!target) {
        return null;
    }

    const missingContext = [
        target.weaponId ? null : 'arma',
        target.opticId ? null : 'mira',
        typeof target.distanceMeters === 'number' ? null : 'distancia',
        target.stance ? null : 'postura',
    ].filter((item): item is string => item !== null);

    return {
        mode: 'spray_lab_validation',
        labSessionId: target.labSessionId,
        validationLinkId: target.validationLinkId,
        baseAnalysisSessionId: target.baseAnalysisSessionId,
        protocolId: target.protocolId,
        targetCopy: target.targetCopy,
        laneLabel: target.laneLabel,
        contextKey: target.contextKey,
        preload: {
            weaponId: target.weaponId,
            weaponName: target.weaponName,
            opticId: target.opticId,
            opticName: target.opticName,
            distanceMeters: target.distanceMeters,
            distanceMode: normalizeValidationDistanceMode(target.distanceMode),
            stance: target.stance,
            muzzle: target.muzzle ?? null,
            grip: target.grip ?? null,
            stock: target.stock ?? null,
            sensitivityProfile: target.sensitivityProfile ?? null,
            patchVersion: target.patchVersion ?? null,
        },
        checklist: target.checklist,
        statusLabel: statusLabel(target.validationStatus),
        warning: missingContext.length > 0
            ? `Contexto incompleto no alvo: ${missingContext.join(', ')}. A tentativa pode virar pratica, nao validacao forte.`
            : null,
    };
}
