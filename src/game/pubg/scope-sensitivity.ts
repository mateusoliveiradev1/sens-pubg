import { CURRENT_PUBG_PATCH_VERSION } from './patch';
import { listLegacyScopes } from './optic-catalog';

export const DEFAULT_SCOPE_SENS_VALUE = 50;

function normalizeScopeValue(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    return fallback;
}

function getEquivalentScopeKeys(scopeId: string, patchVersion: string): string[] {
    const legacyScope = listLegacyScopes(patchVersion).find((scope) => scope.id === scopeId);
    const candidateKeys = [
        scopeId,
        legacyScope?.stateId,
        ...(legacyScope?.availableStateIds ?? []),
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(candidateKeys));
}

export function resolveScopeSensitivityValue(
    scopeSens: Readonly<Record<string, number>> = {},
    scopeId: string,
    patchVersion = CURRENT_PUBG_PATCH_VERSION,
    fallback = DEFAULT_SCOPE_SENS_VALUE
): number {
    for (const candidateKey of getEquivalentScopeKeys(scopeId, patchVersion)) {
        const candidateValue = scopeSens[candidateKey];
        if (typeof candidateValue === 'number' && Number.isFinite(candidateValue)) {
            return candidateValue;
        }
    }

    return fallback;
}

export function normalizeScopeSensitivityMap(
    scopeSens: Readonly<Record<string, number>> = {},
    patchVersion = CURRENT_PUBG_PATCH_VERSION,
    fallback = DEFAULT_SCOPE_SENS_VALUE
): Record<string, number> {
    const legacyScopes = listLegacyScopes(patchVersion);
    const normalized: Record<string, number> = {};
    const equivalentKeys = new Set(
        legacyScopes.flatMap((scope) => [
            scope.id,
            scope.stateId,
            ...scope.availableStateIds,
        ])
    );

    for (const scope of legacyScopes) {
        normalized[scope.id] = resolveScopeSensitivityValue(scopeSens, scope.id, patchVersion, fallback);
    }

    for (const [scopeId, value] of Object.entries(scopeSens)) {
        if (!equivalentKeys.has(scopeId)) {
            normalized[scopeId] = normalizeScopeValue(value, fallback);
        }
    }

    return normalized;
}
