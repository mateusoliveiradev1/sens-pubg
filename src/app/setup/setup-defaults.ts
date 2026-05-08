import type { PlayerProfile, User } from '@/db/schema';
import type { SetupWizardInput } from '@/types/schemas';
import { buildProfileWizardScopeSens } from '@/app/profile/profile-wizard-scopes';

type InitialProfile = PlayerProfile | null | undefined;

type InitialUser = Pick<
    User,
    'resolution' | 'fov' | 'mouseDpi' | 'sensGeneral' | 'sens1x' | 'sens3x' | 'sens4x'
> | null | undefined;

export interface SetupWizardInitialDataInput {
    readonly profile?: InitialProfile;
    readonly user?: InitialUser;
}

const DEFAULT_ADS_SENS = 50;

function fallbackScopeSens(user?: InitialUser): Record<string, number> {
    return buildProfileWizardScopeSens({
        'red-dot': user?.sens1x ?? DEFAULT_ADS_SENS,
        '2x': user?.sens1x ?? DEFAULT_ADS_SENS,
        '3x': user?.sens3x ?? DEFAULT_ADS_SENS,
        '4x': user?.sens4x ?? DEFAULT_ADS_SENS,
        '6x': user?.sens4x ?? DEFAULT_ADS_SENS,
        '8x': user?.sens4x ?? DEFAULT_ADS_SENS,
        '15x': user?.sens4x ?? DEFAULT_ADS_SENS,
    });
}

export function buildSetupWizardInitialData({
    profile,
    user,
}: SetupWizardInitialDataInput = {}): SetupWizardInput {
    if (profile) {
        return {
            identity: {
                bio: profile.bio ?? '',
                twitter: profile.twitter ?? '',
                twitch: profile.twitch ?? '',
            },
            mouse: {
                model: profile.mouseModel,
                sensor: profile.mouseSensor,
                dpi: profile.mouseDpi,
                pollingRate: profile.mousePollingRate,
                weightGrams: profile.mouseWeight,
                liftOffDistance: profile.mouseLod,
            },
            mousepad: {
                model: profile.mousepadModel,
                widthCm: profile.mousepadWidth,
                heightCm: profile.mousepadHeight,
                type: profile.mousepadType as SetupWizardInput['mousepad']['type'],
                material: profile.mousepadMaterial as SetupWizardInput['mousepad']['material'],
            },
            gripStyle: profile.gripStyle as SetupWizardInput['gripStyle'],
            playStyle: profile.playStyle as SetupWizardInput['playStyle'],
            monitor: {
                resolution: profile.monitorResolution,
                refreshRate: profile.monitorRefreshRate,
                panelType: profile.monitorPanel as SetupWizardInput['monitor']['panelType'],
            },
            pubgSettings: {
                generalSens: profile.generalSens,
                adsSens: profile.adsSens,
                scopeSens: buildProfileWizardScopeSens(profile.scopeSens),
                fov: profile.fov,
                verticalMultiplier: profile.verticalMultiplier,
                mouseAcceleration: profile.mouseAcceleration,
            },
            physical: {
                armLength: profile.armLength as SetupWizardInput['physical']['armLength'],
                deskSpaceCm: profile.deskSpace,
            },
        };
    }

    return {
        identity: {
            bio: '',
            twitter: '',
            twitch: '',
        },
        mouse: {
            model: '',
            sensor: '',
            dpi: user?.mouseDpi ?? 800,
            pollingRate: 1000,
            weightGrams: 65,
            liftOffDistance: 1,
        },
        mousepad: {
            model: '',
            widthCm: 45,
            heightCm: 40,
            type: 'control',
            material: 'cloth',
        },
        gripStyle: 'claw',
        playStyle: 'hybrid',
        monitor: {
            resolution: user?.resolution ?? '1920x1080',
            refreshRate: 144,
            panelType: 'ips',
        },
        pubgSettings: {
            generalSens: user?.sensGeneral ?? 50,
            adsSens: user?.sens1x ?? DEFAULT_ADS_SENS,
            scopeSens: fallbackScopeSens(user),
            fov: user?.fov ?? 90,
            verticalMultiplier: 1,
            mouseAcceleration: false,
        },
        physical: {
            armLength: 'medium',
            deskSpaceCm: 60,
        },
    };
}
