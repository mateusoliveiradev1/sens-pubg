import { getWeapon, type WeaponData } from '@/game/pubg';

export interface AnalysisWeaponRecord {
    readonly id: string;
    readonly name: string;
    readonly category: string;
}

export interface SupportedAnalysisWeapon<T extends AnalysisWeaponRecord = AnalysisWeaponRecord> {
    readonly dbWeapon: T;
    readonly technicalWeapon: WeaponData;
}

export interface AnalysisWeaponSupportSummary<T extends AnalysisWeaponRecord = AnalysisWeaponRecord> {
    readonly supported: readonly SupportedAnalysisWeapon<T>[];
    readonly unsupported: readonly T[];
}

export function summarizeAnalysisWeaponSupport<T extends AnalysisWeaponRecord>(
    dbWeapons: readonly T[]
): AnalysisWeaponSupportSummary<T> {
    const supported: SupportedAnalysisWeapon<T>[] = [];
    const unsupported: T[] = [];

    for (const dbWeapon of dbWeapons) {
        const technicalWeapon = getWeapon(dbWeapon.name);

        if (technicalWeapon) {
            supported.push({
                dbWeapon,
                technicalWeapon,
            });
            continue;
        }

        unsupported.push(dbWeapon);
    }

    return {
        supported,
        unsupported,
    };
}

export function resolveSupportedAnalysisWeapon<T extends AnalysisWeaponRecord>(
    supportedWeapons: readonly SupportedAnalysisWeapon<T>[],
    selectedWeaponId: string
): SupportedAnalysisWeapon<T> | undefined {
    return supportedWeapons.find((entry) => entry.dbWeapon.id === selectedWeaponId);
}

export function resolvePreferredAnalysisWeaponId<T extends AnalysisWeaponRecord>(
    supportedWeapons: readonly SupportedAnalysisWeapon<T>[]
): string {
    return supportedWeapons.find((entry) => entry.dbWeapon.name.toLowerCase().includes('beryl'))?.dbWeapon.id
        ?? supportedWeapons[0]?.dbWeapon.id
        ?? '';
}
