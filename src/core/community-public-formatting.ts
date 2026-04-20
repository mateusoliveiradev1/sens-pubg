import type { CommunityCreatorProgramStatus } from '@/db/schema';
import { getWeapon } from '@/game/pubg';

export interface CommunityAnalysisTag {
    readonly key: 'weapon' | 'patch' | 'diagnosis';
    readonly value: string;
    readonly label: string;
}

export interface CommunityCreatorStatusBadge {
    readonly label: string;
    readonly status: CommunityCreatorProgramStatus;
}

export function formatCommunityWeaponLabel(weaponId: string): string {
    const normalizedWeaponId = weaponId.trim();

    if (!normalizedWeaponId) {
        return 'Arma publica';
    }

    return getWeapon(normalizedWeaponId)?.name
        ?? normalizedWeaponId
            .split('-')
            .filter(Boolean)
            .map((part) => part.toUpperCase())
            .join(' ');
}

export function formatCommunityPatchLabel(patchVersion: string): string {
    const normalizedPatchVersion = patchVersion.trim();
    return normalizedPatchVersion ? `Patch ${normalizedPatchVersion}` : 'Patch publico';
}

export function formatCommunityDiagnosisLabel(diagnosisKey: string): string {
    const normalizedDiagnosisKey = diagnosisKey.trim();

    if (!normalizedDiagnosisKey) {
        return 'Diagnostico publico';
    }

    return normalizedDiagnosisKey
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function buildCommunityAnalysisTags(input: {
    readonly weaponId: string | null;
    readonly patchVersion: string | null;
    readonly diagnosisKey: string | null;
}): readonly CommunityAnalysisTag[] {
    const tags: CommunityAnalysisTag[] = [];

    if (input.weaponId) {
        tags.push({
            key: 'weapon',
            value: input.weaponId,
            label: formatCommunityWeaponLabel(input.weaponId),
        });
    }

    if (input.patchVersion) {
        tags.push({
            key: 'patch',
            value: input.patchVersion,
            label: formatCommunityPatchLabel(input.patchVersion),
        });
    }

    if (input.diagnosisKey) {
        tags.push({
            key: 'diagnosis',
            value: input.diagnosisKey,
            label: formatCommunityDiagnosisLabel(input.diagnosisKey),
        });
    }

    return tags;
}

export function buildCommunityFallbackInitials(
    displayName: string | null | undefined,
    fallback = 'OP',
): string {
    const normalizedDisplayName = displayName?.trim();

    if (!normalizedDisplayName) {
        return fallback;
    }

    const initials = normalizedDisplayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || fallback;
}

export function formatCommunityCreatorStatusBadge(
    status: CommunityCreatorProgramStatus,
): CommunityCreatorStatusBadge | null {
    switch (status) {
        case 'approved':
            return {
                label: 'Creator aprovado',
                status,
            };
        case 'waitlist':
            return {
                label: 'Creator em avaliacao',
                status,
            };
        case 'suspended':
            return {
                label: 'Creator suspenso',
                status,
            };
        case 'none':
            return null;
    }
}

export function formatCommunityCount(
    count: number,
    singular: string,
    plural: string,
): string {
    const safeCount = Math.max(0, Math.trunc(count));
    return `${safeCount} ${safeCount === 1 ? singular : plural}`;
}

export function toSafeCommunityCount(value: number | string | null | undefined): number {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? Math.max(0, Math.trunc(numericValue)) : 0;
}

export function normalizeCommunityExternalLinks(
    links: readonly {
        readonly label: string;
        readonly url: string;
    }[],
): readonly {
    readonly label: string;
    readonly url: string;
    readonly target: '_blank';
    readonly rel: 'noreferrer';
}[] {
    return links.flatMap((link) => {
        const label = link.label.trim();
        const url = link.url.trim();

        if (!label || !url) {
            return [];
        }

        try {
            const parsedUrl = new URL(url);

            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return [];
            }

            return [{
                label,
                url: parsedUrl.toString(),
                target: '_blank' as const,
                rel: 'noreferrer' as const,
            }];
        } catch {
            return [];
        }
    });
}
