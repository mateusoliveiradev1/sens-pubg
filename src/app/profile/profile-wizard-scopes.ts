import { CURRENT_PUBG_PATCH_VERSION, getOptic, listLegacyScopes, normalizeScopeSensitivityMap } from '@/game/pubg';
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

export function buildProfileWizardScopeSens(
    initialScopeSens: Readonly<Record<string, number>> = {}
): Record<string, number> {
    const normalized = normalizeScopeSensitivityMap(initialScopeSens);
    delete normalized.hip;
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
