import type { CommunityCreatorProgramStatus } from '@/db/schema';
import type {
    CommunityPostStatus,
    CommunityPostVisibility,
} from '@/types/community';
import {
    formatCommunityCount,
    formatCommunityCreatorStatusBadge,
    formatCommunityPatchLabel,
    toSafeCommunityCount,
} from './community-public-formatting';

export type CommunityTrustSignalKey =
    | 'creator-approved'
    | 'creator-waitlist'
    | 'profile-complete'
    | 'setup-public'
    | 'active-patch'
    | 'copied-preset'
    | 'saved-drill'
    | 'public-activity';

export interface CommunityTrustSignal {
    readonly key: CommunityTrustSignalKey;
    readonly label: string;
    readonly reason: string;
    readonly count: number | null;
}

export interface CommunityTrustSignalPublicSetup {
    readonly aimSetup: Readonly<Record<string, string | number | null | undefined>>;
    readonly surfaceGrip: Readonly<Record<string, string | number | null | undefined>>;
    readonly pubgCore: Readonly<Record<string, string | number | null | undefined>>;
}

export interface BuildProfileTrustSignalsInput {
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
    readonly displayName: string | null;
    readonly avatarUrl: string | null;
    readonly fallbackInitials: string | null;
    readonly bio: string | null;
    readonly linkCount: number;
    readonly publicSetup: CommunityTrustSignalPublicSetup | null;
    readonly publicPostCount: number;
    readonly copyCount: number;
    readonly saveCount: number;
}

export interface BuildPostTrustSignalsInput {
    readonly status: CommunityPostStatus;
    readonly visibility: CommunityPostVisibility;
    readonly publishedAt: Date | null;
    readonly primaryPatchVersion: string | null;
    readonly copyCount: number;
    readonly saveCount: number;
}

export interface BuildCreatorTrustSignalsInput {
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
    readonly publicPostCount: number;
    readonly followerCount: number;
    readonly copyCount: number;
}

export function buildProfileTrustSignals(
    input: BuildProfileTrustSignalsInput,
): readonly CommunityTrustSignal[] {
    const setupFieldCount = countPublicSetupFields(input.publicSetup);
    const safePublicPostCount = toSafeCommunityCount(input.publicPostCount);
    const safeCopyCount = toSafeCommunityCount(input.copyCount);
    const safeSaveCount = toSafeCommunityCount(input.saveCount);
    const signals = [
        createCreatorTrustSignal(input.creatorProgramStatus),
        createProfileCompleteSignal({
            displayName: input.displayName,
            avatarUrl: input.avatarUrl,
            fallbackInitials: input.fallbackInitials,
            bio: input.bio,
            linkCount: input.linkCount,
            setupFieldCount,
            publicPostCount: safePublicPostCount,
        }),
        createSetupPublicSignal(setupFieldCount),
        createCopiedPresetSignal(safeCopyCount),
        createSavedDrillSignal(safeSaveCount),
    ];

    return compactTrustSignals(signals);
}

export function buildPostTrustSignals(
    input: BuildPostTrustSignalsInput,
): readonly CommunityTrustSignal[] {
    if (!isPublicPublishedPost(input)) {
        return [];
    }

    const signals = [
        createActivePatchSignal(input.primaryPatchVersion),
        createCopiedPresetSignal(input.copyCount),
        createSavedDrillSignal(input.saveCount),
    ];

    return compactTrustSignals(signals);
}

export function buildCreatorTrustSignals(
    input: BuildCreatorTrustSignalsInput,
): readonly CommunityTrustSignal[] {
    const safePublicPostCount = toSafeCommunityCount(input.publicPostCount);
    const safeFollowerCount = toSafeCommunityCount(input.followerCount);
    const safeCopyCount = toSafeCommunityCount(input.copyCount);
    const signals = [
        createCreatorTrustSignal(input.creatorProgramStatus),
        createPublicActivitySignal({
            publicPostCount: safePublicPostCount,
            followerCount: safeFollowerCount,
        }),
        createCopiedPresetSignal(safeCopyCount),
    ];

    return compactTrustSignals(signals);
}

export function countPublicSetupFields(
    publicSetup: CommunityTrustSignalPublicSetup | null,
): number {
    if (!publicSetup) {
        return 0;
    }

    return [
        ...Object.values(publicSetup.aimSetup),
        ...Object.values(publicSetup.surfaceGrip),
        ...Object.values(publicSetup.pubgCore),
    ].filter(hasPublicSignalValue).length;
}

function hasPublicSignalValue(value: string | number | null | undefined): boolean {
    return typeof value === 'number' || Boolean(value?.trim());
}

function createCreatorTrustSignal(
    status: CommunityCreatorProgramStatus,
): CommunityTrustSignal | null {
    if (status !== 'approved' && status !== 'waitlist') {
        return null;
    }

    const badge = formatCommunityCreatorStatusBadge(status);

    if (!badge) {
        return null;
    }

    return {
        key: status === 'approved' ? 'creator-approved' : 'creator-waitlist',
        label: badge.label,
        reason: status === 'approved'
            ? 'Status publico aprovado no programa de creators.'
            : 'Status publico em avaliacao no programa de creators.',
        count: null,
    };
}

function createProfileCompleteSignal(input: {
    readonly displayName: string | null;
    readonly avatarUrl: string | null;
    readonly fallbackInitials: string | null;
    readonly bio: string | null;
    readonly linkCount: number;
    readonly setupFieldCount: number;
    readonly publicPostCount: number;
}): CommunityTrustSignal | null {
    const completedFacts = [
        Boolean(input.displayName?.trim()),
        Boolean(input.avatarUrl?.trim() || input.fallbackInitials?.trim()),
        Boolean(input.bio?.trim()),
        input.linkCount > 0,
        input.setupFieldCount > 0,
        input.publicPostCount > 0,
    ].filter(Boolean).length;

    if (completedFacts < 6) {
        return null;
    }

    return {
        key: 'profile-complete',
        label: 'Perfil completo',
        reason: 'Nome, imagem ou monograma, bio, link, setup e post publico estao preenchidos.',
        count: completedFacts,
    };
}

function createSetupPublicSignal(setupFieldCount: number): CommunityTrustSignal | null {
    const safeSetupFieldCount = toSafeCommunityCount(setupFieldCount);

    if (safeSetupFieldCount === 0) {
        return null;
    }

    return {
        key: 'setup-public',
        label: 'Setup publico',
        reason: `${formatCommunityCount(safeSetupFieldCount, 'campo publico de setup', 'campos publicos de setup')} na allowlist.`,
        count: safeSetupFieldCount,
    };
}

function createPublicActivitySignal(input: {
    readonly publicPostCount: number;
    readonly followerCount: number;
}): CommunityTrustSignal | null {
    const activityCount = input.publicPostCount + input.followerCount;

    if (activityCount === 0) {
        return null;
    }

    return {
        key: 'public-activity',
        label: 'Atividade publica',
        reason: [
            input.publicPostCount > 0
                ? formatCommunityCount(input.publicPostCount, 'analise publica', 'analises publicas')
                : null,
            input.followerCount > 0
                ? formatCommunityCount(input.followerCount, 'seguidor', 'seguidores')
                : null,
        ].filter(Boolean).join(' e '),
        count: activityCount,
    };
}

function createActivePatchSignal(patchVersion: string | null): CommunityTrustSignal | null {
    const normalizedPatchVersion = patchVersion?.trim();

    if (!normalizedPatchVersion) {
        return null;
    }

    return {
        key: 'active-patch',
        label: 'Patch ativo',
        reason: `Snapshot publico marcado como ${formatCommunityPatchLabel(normalizedPatchVersion)}.`,
        count: null,
    };
}

function createCopiedPresetSignal(copyCount: number): CommunityTrustSignal | null {
    const safeCopyCount = toSafeCommunityCount(copyCount);

    if (safeCopyCount === 0) {
        return null;
    }

    return {
        key: 'copied-preset',
        label: safeCopyCount === 1 ? 'Preset copiado' : 'Presets copiados',
        reason: `${formatCommunityCount(safeCopyCount, 'preset copiado', 'presets copiados')} por leitores publicos.`,
        count: safeCopyCount,
    };
}

function createSavedDrillSignal(saveCount: number): CommunityTrustSignal | null {
    const safeSaveCount = toSafeCommunityCount(saveCount);

    if (safeSaveCount === 0) {
        return null;
    }

    return {
        key: 'saved-drill',
        label: safeSaveCount === 1 ? 'Drill salvo' : 'Drills salvos',
        reason: `${formatCommunityCount(safeSaveCount, 'drill salvo', 'drills salvos')} por leitores publicos.`,
        count: safeSaveCount,
    };
}

function isPublicPublishedPost(input: BuildPostTrustSignalsInput): boolean {
    return input.status === 'published'
        && input.visibility === 'public'
        && input.publishedAt instanceof Date;
}

function compactTrustSignals(
    signals: readonly (CommunityTrustSignal | null)[],
): readonly CommunityTrustSignal[] {
    return signals.filter((signal): signal is CommunityTrustSignal => Boolean(signal));
}
