/**
 * PUBG patch metadata used to version analysis results and historical records.
 */

export const UNKNOWN_PUBG_PATCH_VERSION = 'legacy-unknown';
export const CURRENT_PUBG_PATCH_VERSION = '41.1';

export interface PubgPatchInfo {
    readonly version: string;
    readonly releaseDate: string;
    readonly sourceUrl: string;
}

export const CURRENT_PUBG_PATCH: PubgPatchInfo = {
    version: CURRENT_PUBG_PATCH_VERSION,
    releaseDate: '2026-04-08',
    sourceUrl: 'https://pubg.com/en/news/9926',
};

export function normalizePatchVersion(patchVersion?: string | null): string {
    if (!patchVersion) {
        return UNKNOWN_PUBG_PATCH_VERSION;
    }

    const normalized = patchVersion.trim();
    return normalized.length > 0 ? normalized : UNKNOWN_PUBG_PATCH_VERSION;
}
