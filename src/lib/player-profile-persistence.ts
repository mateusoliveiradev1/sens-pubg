import { normalizeScopeSensitivityMap } from '@/game/pubg';
import type { NewPlayerProfile, NewUser } from '@/db/schema';
import type { PlayerProfileInput } from '@/types/schemas';

export type PlayerProfilePersistenceData = Omit<NewPlayerProfile, 'id' | 'createdAt'>;

export type UserSetupPersistenceData = Pick<
    NewUser,
    'fov' | 'resolution' | 'mouseDpi' | 'sensGeneral' | 'sens1x' | 'sens3x' | 'sens4x' | 'updatedAt'
>;

function normalizeOptionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

export function buildPlayerProfilePersistenceData(
    userId: string,
    data: PlayerProfileInput,
): PlayerProfilePersistenceData {
    return {
        userId,
        mouseModel: data.mouse.model,
        mouseSensor: data.mouse.sensor,
        mouseDpi: data.mouse.dpi,
        mousePollingRate: data.mouse.pollingRate,
        mouseWeight: data.mouse.weightGrams,
        mouseLod: data.mouse.liftOffDistance,
        mousepadModel: data.mousepad.model,
        mousepadWidth: data.mousepad.widthCm,
        mousepadHeight: data.mousepad.heightCm,
        mousepadType: data.mousepad.type,
        mousepadMaterial: data.mousepad.material,
        gripStyle: data.gripStyle,
        playStyle: data.playStyle,
        monitorResolution: data.monitor.resolution,
        monitorRefreshRate: data.monitor.refreshRate,
        monitorPanel: data.monitor.panelType,
        generalSens: data.pubgSettings.generalSens,
        adsSens: data.pubgSettings.adsSens,
        scopeSens: normalizeScopeSensitivityMap(data.pubgSettings.scopeSens),
        fov: data.pubgSettings.fov,
        verticalMultiplier: data.pubgSettings.verticalMultiplier,
        mouseAcceleration: data.pubgSettings.mouseAcceleration,
        armLength: data.physical.armLength,
        deskSpace: data.physical.deskSpaceCm,
        bio: normalizeOptionalText(data.identity?.bio),
        twitter: normalizeOptionalText(data.identity?.twitter),
        twitch: normalizeOptionalText(data.identity?.twitch),
        updatedAt: new Date(),
    };
}

export function buildUserSetupPersistenceData(data: PlayerProfileInput): UserSetupPersistenceData {
    const scopeSens = normalizeScopeSensitivityMap(data.pubgSettings.scopeSens);

    return {
        fov: data.pubgSettings.fov,
        resolution: data.monitor.resolution,
        mouseDpi: data.mouse.dpi,
        sensGeneral: data.pubgSettings.generalSens,
        sens1x: scopeSens['red-dot'] ?? data.pubgSettings.adsSens,
        sens3x: scopeSens['3x'] ?? data.pubgSettings.adsSens,
        sens4x: scopeSens['4x'] ?? data.pubgSettings.adsSens,
        updatedAt: new Date(),
    };
}
