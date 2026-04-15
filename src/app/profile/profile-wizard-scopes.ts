import { CURRENT_PUBG_PATCH_VERSION, getOptic, listLegacyScopes } from '@/game/pubg';

const DEFAULT_SCOPE_SENS_VALUE = 50;
const HYBRID_SCOPE_ID = 'hybrid-scope';

const currentPatchLegacyScopes = listLegacyScopes(CURRENT_PUBG_PATCH_VERSION);

export const PROFILE_WIZARD_SCOPE_ORDER = currentPatchLegacyScopes
    .filter((scope) => scope.id !== 'hip')
    .map((scope) => scope.id);

export interface ProfileWizardHybridScopeEquivalent {
    readonly stateId: string;
    readonly sliderKey: string;
    readonly legacyScopeId: string;
    readonly label: string;
}

function normalizeScopeValue(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    return DEFAULT_SCOPE_SENS_VALUE;
}

function findInitialScopeValue(scopeId: string, initialScopeSens: Readonly<Record<string, number>>): number {
    const legacyScope = currentPatchLegacyScopes.find((scope) => scope.id === scopeId);
    const directValue = initialScopeSens[scopeId];
    if (directValue !== undefined) {
        return normalizeScopeValue(directValue);
    }

    if (legacyScope?.stateId) {
        return normalizeScopeValue(initialScopeSens[legacyScope.stateId]);
    }

    return DEFAULT_SCOPE_SENS_VALUE;
}

function isCanonicalOrEquivalentScope(scopeId: string): boolean {
    if (PROFILE_WIZARD_SCOPE_ORDER.includes(scopeId)) {
        return true;
    }

    return currentPatchLegacyScopes.some((scope) => scope.stateId === scopeId);
}

export function buildProfileWizardScopeSens(
    initialScopeSens: Readonly<Record<string, number>> = {}
): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const scopeId of PROFILE_WIZARD_SCOPE_ORDER) {
        normalized[scopeId] = findInitialScopeValue(scopeId, initialScopeSens);
    }

    for (const [scopeId, value] of Object.entries(initialScopeSens)) {
        if (!isCanonicalOrEquivalentScope(scopeId)) {
            normalized[scopeId] = normalizeScopeValue(value);
        }
    }

    return normalized;
}

export function getHybridScopeEquivalentStates(
    patchVersion = CURRENT_PUBG_PATCH_VERSION
): readonly ProfileWizardHybridScopeEquivalent[] {
    const hybridScope = getOptic(patchVersion, HYBRID_SCOPE_ID);
    if (!hybridScope) {
        return [];
    }

    const legacyScopes = listLegacyScopes(patchVersion);

    return hybridScope.states.map((state) => {
        const legacyScope = legacyScopes.find((scope) => scope.stateId === state.sliderKey)
            ?? legacyScopes.find((scope) => scope.id === state.sliderKey);

        return {
            stateId: state.id,
            sliderKey: state.sliderKey,
            legacyScopeId: legacyScope?.id ?? state.sliderKey,
            label: `${legacyScope?.name ?? state.name} (${state.sliderKey})`,
        };
    });
}

export function buildHybridScopeHintText(
    equivalents: readonly ProfileWizardHybridScopeEquivalent[] = getHybridScopeEquivalentStates()
): string {
    if (equivalents.length === 0) {
        return '';
    }

    const labels = equivalents.map((equivalent) => equivalent.label);
    const lastLabel = labels[labels.length - 1];

    if (!lastLabel) {
        return '';
    }

    const scopeList = labels.length === 1
        ? lastLabel
        : `${labels.slice(0, -1).join(', ')} e ${lastLabel}`;

    return `Hybrid Scope usa os mesmos ajustes de ${scopeList}.`;
}
