import type { PlayerProfile } from '@/db/schema';

const MONITOR_RESOLUTION_PATTERN = /^(\d{3,5})x(\d{3,5})$/i;
const FALLBACK_RESOLUTION_Y = 1080;

export interface ParsedMonitorResolution {
    readonly width: number;
    readonly height: number;
}

export function parseMonitorResolution(value: string | null | undefined): ParsedMonitorResolution | null {
    if (!value) return null;

    const match = MONITOR_RESOLUTION_PATTERN.exec(value.trim());
    if (!match) return null;

    const [, widthValue, heightValue] = match;
    if (!widthValue || !heightValue) return null;

    const width = Number.parseInt(widthValue, 10);
    const height = Number.parseInt(heightValue, 10);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }

    return { width, height };
}

export function isProfileReadyForAnalysis(profile: PlayerProfile | null | undefined): profile is PlayerProfile {
    return Boolean(
        profile
        && Number.isFinite(profile.fov)
        && profile.fov > 0
        && Number.isFinite(profile.mouseDpi)
        && profile.mouseDpi > 0
        && parseMonitorResolution(profile.monitorResolution)
    );
}

export function resolveAnalysisResolutionY(profile: Pick<PlayerProfile, 'monitorResolution'>): number {
    return parseMonitorResolution(profile.monitorResolution)?.height ?? FALLBACK_RESOLUTION_Y;
}
