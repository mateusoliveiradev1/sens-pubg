import { CURRENT_PUBG_PATCH_VERSION, normalizePatchVersion, UNKNOWN_PUBG_PATCH_VERSION } from './patch';

export interface OpticStateDefinition {
    readonly id: string;
    readonly name: string;
    readonly magnification: number;
    readonly sensitivityMultiplier: number;
    readonly fovReduction: number;
    readonly sliderKey: string;
}

export interface OpticDefinition {
    readonly id: string;
    readonly name: string;
    readonly category: 'system' | 'reflex' | 'scope' | 'alternate';
    readonly defaultStateId: string;
    readonly states: readonly OpticStateDefinition[];
    readonly legacyScopeId?: string;
    readonly legacyListed?: boolean;
}

export interface OpticCatalogSnapshot {
    readonly patchVersion: string;
    readonly optics: readonly OpticDefinition[];
}

export interface LegacyScopeData {
    readonly id: string;
    readonly name: string;
    readonly magnification: number;
    readonly sensitivityMultiplier: number;
    readonly fovReduction: number;
    readonly opticId: string;
    readonly stateId: string;
    readonly availableStateIds: readonly string[];
}

const state = (
    id: string,
    name: string,
    magnification: number,
    sensitivityMultiplier: number,
    fovReduction: number,
    sliderKey = id
): OpticStateDefinition => ({
    id,
    name,
    magnification,
    sensitivityMultiplier,
    fovReduction,
    sliderKey,
});

const hipFire: OpticDefinition = {
    id: 'hip-fire',
    name: 'Sem Mira (Hip Fire)',
    category: 'system',
    defaultStateId: 'hip',
    legacyScopeId: 'hip',
    legacyListed: true,
    states: [
        state('hip', 'Hip Fire', 1, 1.0, 1.0, 'hip'),
    ],
};

const redDotSight: OpticDefinition = {
    id: 'red-dot-sight',
    name: 'Red Dot Sight',
    category: 'reflex',
    defaultStateId: '1x',
    legacyScopeId: 'red-dot',
    legacyListed: true,
    states: [
        state('1x', '1x', 1, 0.777, 0.85, '1x'),
    ],
};

const holographicSight: OpticDefinition = {
    id: 'holographic-sight',
    name: 'Holographic Sight',
    category: 'reflex',
    defaultStateId: '1x',
    states: [
        state('1x', '1x', 1, 0.777, 0.85, '1x'),
    ],
};

const cantedSight: OpticDefinition = {
    id: 'canted-sight',
    name: 'Canted Sight',
    category: 'alternate',
    defaultStateId: '1x',
    states: [
        state('1x', '1x', 1, 0.777, 0.85, '1x'),
    ],
};

const scope2x: OpticDefinition = {
    id: '2x',
    name: '2x Scope',
    category: 'scope',
    defaultStateId: '2x',
    legacyScopeId: '2x',
    legacyListed: true,
    states: [
        state('2x', '2x', 2, 0.444, 0.5, '2x'),
    ],
};

const scope3x: OpticDefinition = {
    id: '3x',
    name: '3x Scope',
    category: 'scope',
    defaultStateId: '3x',
    legacyScopeId: '3x',
    legacyListed: true,
    states: [
        state('3x', '3x', 3, 0.367, 0.33, '3x'),
    ],
};

const scope4x: OpticDefinition = {
    id: '4x',
    name: '4x ACOG',
    category: 'scope',
    defaultStateId: '4x',
    legacyScopeId: '4x',
    legacyListed: true,
    states: [
        state('4x', '4x', 4, 0.211, 0.25, '4x'),
    ],
};

const scope6x: OpticDefinition = {
    id: '6x',
    name: '6x Scope',
    category: 'scope',
    defaultStateId: '6x',
    legacyScopeId: '6x',
    legacyListed: true,
    states: [
        state('6x', '6x', 6, 0.183, 0.167, '6x'),
    ],
};

const scope8x: OpticDefinition = {
    id: '8x',
    name: '8x CQBSS',
    category: 'scope',
    defaultStateId: '8x',
    legacyScopeId: '8x',
    legacyListed: true,
    states: [
        state('8x', '8x', 8, 0.137, 0.125, '8x'),
    ],
};

const scope15x: OpticDefinition = {
    id: '15x',
    name: '15x PM II',
    category: 'scope',
    defaultStateId: '15x',
    legacyScopeId: '15x',
    legacyListed: true,
    states: [
        state('15x', '15x', 15, 0.073, 0.067, '15x'),
    ],
};

const hybridScope: OpticDefinition = {
    id: 'hybrid-scope',
    name: 'Hybrid Scope',
    category: 'alternate',
    defaultStateId: '1x',
    states: [
        state('1x', '1x', 1, 0.777, 0.85, '1x'),
        state('4x', '4x', 4, 0.211, 0.25, '4x'),
    ],
};

const baseModernOptics = [
    hipFire,
    redDotSight,
    holographicSight,
    scope2x,
    scope3x,
    scope4x,
    scope6x,
    scope8x,
    scope15x,
] as const;

const OPTIC_CATALOG_SNAPSHOTS: readonly OpticCatalogSnapshot[] = [
    {
        patchVersion: '36.1',
        optics: [
            ...baseModernOptics,
            cantedSight,
        ],
    },
    {
        patchVersion: '37.1',
        optics: [
            ...baseModernOptics,
        ],
    },
    {
        patchVersion: '41.1',
        optics: [
            ...baseModernOptics,
            hybridScope,
        ],
    },
] as const;

export const SUPPORTED_OPTIC_PATCHES = OPTIC_CATALOG_SNAPSHOTS.map((snapshot) => snapshot.patchVersion);

function parsePatchVersion(version: string): [number, number] | null {
    const match = /^(\d+)\.(\d+)$/.exec(version.trim());
    if (!match) {
        return null;
    }

    return [Number(match[1]), Number(match[2])];
}

function comparePatchVersions(left: string, right: string): number {
    const parsedLeft = parsePatchVersion(left);
    const parsedRight = parsePatchVersion(right);

    if (!parsedLeft || !parsedRight) {
        return left.localeCompare(right, undefined, { numeric: true });
    }

    if (parsedLeft[0] !== parsedRight[0]) {
        return parsedLeft[0] - parsedRight[0];
    }

    return parsedLeft[1] - parsedRight[1];
}

export function resolveOpticCatalogVersion(patchVersion: string): string {
    const normalized = normalizePatchVersion(patchVersion);
    if (normalized === UNKNOWN_PUBG_PATCH_VERSION) {
        return CURRENT_PUBG_PATCH_VERSION;
    }

    const exact = OPTIC_CATALOG_SNAPSHOTS.find((snapshot) => snapshot.patchVersion === normalized);
    if (exact) {
        return exact.patchVersion;
    }

    const sorted = [...OPTIC_CATALOG_SNAPSHOTS].sort((left, right) =>
        comparePatchVersions(left.patchVersion, right.patchVersion)
    );

    let resolved = sorted[0]?.patchVersion ?? CURRENT_PUBG_PATCH_VERSION;
    for (const snapshot of sorted) {
        if (comparePatchVersions(snapshot.patchVersion, normalized) <= 0) {
            resolved = snapshot.patchVersion;
        }
    }

    return resolved;
}

export function getOpticCatalog(patchVersion: string): OpticCatalogSnapshot {
    const resolvedVersion = resolveOpticCatalogVersion(patchVersion);
    return OPTIC_CATALOG_SNAPSHOTS.find((snapshot) => snapshot.patchVersion === resolvedVersion) ?? OPTIC_CATALOG_SNAPSHOTS[OPTIC_CATALOG_SNAPSHOTS.length - 1]!;
}

export function getOptic(patchVersion: string, opticId: string): OpticDefinition | undefined {
    return getOpticCatalog(patchVersion).optics.find((optic) => optic.id === opticId);
}

export function getOpticState(
    patchVersion: string,
    opticId: string,
    stateId?: string
): OpticStateDefinition | undefined {
    const optic = getOptic(patchVersion, opticId);
    if (!optic) {
        return undefined;
    }

    const resolvedStateId = stateId ?? optic.defaultStateId;
    return optic.states.find((opticState) => opticState.id === resolvedStateId);
}

export function listLegacyScopes(patchVersion: string): readonly LegacyScopeData[] {
    return getOpticCatalog(patchVersion).optics
        .filter((optic) => optic.legacyListed && optic.legacyScopeId)
        .map((optic) => {
            const defaultState = optic.states.find((opticState) => opticState.id === optic.defaultStateId) ?? optic.states[0]!;

            return {
                id: optic.legacyScopeId!,
                name: optic.name,
                magnification: defaultState.magnification,
                sensitivityMultiplier: defaultState.sensitivityMultiplier,
                fovReduction: defaultState.fovReduction,
                opticId: optic.id,
                stateId: defaultState.id,
                availableStateIds: optic.states.map((opticState) => opticState.id),
            };
        });
}
