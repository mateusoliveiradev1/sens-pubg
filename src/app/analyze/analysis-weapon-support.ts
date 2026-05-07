import { getWeapon, type WeaponData } from '@/game/pubg';
import { resolveWeaponSupportStatus, type WeaponSupportStatus } from '@/ui/components/weapon-support-status';

export interface AnalysisWeaponRecord {
    readonly id: string;
    readonly name: string;
    readonly category: string;
}

export interface SupportedAnalysisWeapon<T extends AnalysisWeaponRecord = AnalysisWeaponRecord> {
    readonly dbWeapon: T;
    readonly technicalWeapon: WeaponData;
    readonly supportStatus: WeaponSupportStatus;
}

export interface UnsupportedAnalysisWeapon<T extends AnalysisWeaponRecord = AnalysisWeaponRecord> {
    readonly dbWeapon: T;
    readonly supportStatus: WeaponSupportStatus;
}

export interface AnalysisWeaponSupportSummary<T extends AnalysisWeaponRecord = AnalysisWeaponRecord> {
    readonly supported: readonly SupportedAnalysisWeapon<T>[];
    readonly unsupported: readonly UnsupportedAnalysisWeapon<T>[];
}

export function summarizeAnalysisWeaponSupport<T extends AnalysisWeaponRecord>(
    dbWeapons: readonly T[]
): AnalysisWeaponSupportSummary<T> {
    const supported: SupportedAnalysisWeapon<T>[] = [];
    const unsupported: UnsupportedAnalysisWeapon<T>[] = [];

    for (const dbWeapon of dbWeapons) {
        const technicalWeapon = getWeapon(dbWeapon.name);
        const supportStatus = resolveWeaponSupportStatus({
            weaponId: dbWeapon.id,
            weaponName: dbWeapon.name,
            category: dbWeapon.category,
        });

        if (technicalWeapon) {
            supported.push({
                dbWeapon,
                technicalWeapon,
                supportStatus,
            });
            continue;
        }

        unsupported.push({
            dbWeapon,
            supportStatus,
        });
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

export function resolvePersistedAnalysisWeaponId<T extends AnalysisWeaponRecord>(
    supportedWeapons: readonly SupportedAnalysisWeapon<T>[],
    selectedWeaponId: string,
): string | undefined {
    return resolveSupportedAnalysisWeapon(supportedWeapons, selectedWeaponId)?.technicalWeapon.id;
}

export function resolvePreferredAnalysisWeaponId<T extends AnalysisWeaponRecord>(
    supportedWeapons: readonly SupportedAnalysisWeapon<T>[]
): string {
    return supportedWeapons.find((entry) => entry.dbWeapon.name.toLowerCase().includes('beryl'))?.dbWeapon.id
        ?? supportedWeapons[0]?.dbWeapon.id
        ?? '';
}
