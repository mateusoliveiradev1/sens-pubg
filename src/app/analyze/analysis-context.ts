import { CURRENT_PUBG_PATCH_VERSION, getOptic, getOpticState, getScope, normalizePatchVersion } from '@/game/pubg';
import type { AnalysisContextDetails, AnalysisDistanceMode, AnalysisOpticContext } from '@/types/engine';

export interface CreateAnalysisContextInput {
    readonly patchVersion?: string;
    readonly scopeId: string;
    readonly distanceMeters: number;
    readonly distanceMode?: AnalysisDistanceMode;
    readonly opticStateId?: string;
}

function createDynamicOpticNote(opticName: string, stateName: string, availableStateIds: readonly string[]): string {
    return `${opticName} tem estados dinamicos (${availableStateIds.join(', ')}); esta analise assume o estado padrao ${stateName}.`;
}

function createDistanceNote(distanceMode: AnalysisDistanceMode, distanceMeters: number): string | undefined {
    switch (distanceMode) {
        case 'exact':
            return undefined;
        case 'estimated':
            return `Distancia aproximada informada pelo jogador; erros em cm devem ser lidos como estimativa em torno de ${distanceMeters}m.`;
        case 'unknown':
            return `Distancia nao informada; a analise usa ${distanceMeters}m como referencia neutra para converter erro angular em centimetros.`;
        default:
            return undefined;
    }
}

function createOpticContext(input: CreateAnalysisContextInput): AnalysisOpticContext {
    const patchVersion = normalizePatchVersion(input.patchVersion ?? CURRENT_PUBG_PATCH_VERSION);
    const legacyScope = getScope(input.scopeId, patchVersion);

    const opticId = legacyScope?.opticId ?? input.scopeId;
    const optic = getOptic(patchVersion, opticId);
    if (!optic) {
        return {
            scopeId: input.scopeId,
            opticId,
            opticStateId: input.opticStateId ?? 'unknown',
            opticName: input.scopeId,
            opticStateName: input.opticStateId ?? 'desconhecido',
            availableStateIds: [],
            isDynamicOptic: false,
        };
    }

    const resolvedStateId = input.opticStateId ?? legacyScope?.stateId ?? optic.defaultStateId;
    const opticState = getOpticState(patchVersion, optic.id, resolvedStateId) ?? optic.states[0]!;
    const availableStateIds = optic.states.map((state) => state.id);
    const isDynamicOptic = availableStateIds.length > 1;
    const shouldExplainAssumption = isDynamicOptic && input.opticStateId === undefined;

    const base = {
        scopeId: input.scopeId,
        opticId: optic.id,
        opticStateId: opticState.id,
        opticName: optic.name,
        opticStateName: opticState.name,
        availableStateIds,
        isDynamicOptic,
    };

    if (!shouldExplainAssumption) {
        return base;
    }

    return {
        ...base,
        ambiguityNote: createDynamicOpticNote(optic.name, opticState.name, availableStateIds),
    };
}

export function createAnalysisContext(input: CreateAnalysisContextInput): AnalysisContextDetails {
    const distanceMode = input.distanceMode ?? 'estimated';
    const distanceNote = createDistanceNote(distanceMode, input.distanceMeters);

    return {
        targetDistanceMeters: input.distanceMeters,
        distanceMode,
        ...(distanceNote ? { distanceNote } : {}),
        optic: createOpticContext(input),
    };
}
