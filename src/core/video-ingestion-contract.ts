export const MIN_SPRAY_CLIP_DURATION_SECONDS = 5;
export const MAX_SPRAY_CLIP_DURATION_SECONDS = 15;
const SPRAY_CLIP_DURATION_MIN_METADATA_TOLERANCE_SECONDS = 0.1;
const SPRAY_CLIP_DURATION_MAX_METADATA_TOLERANCE_SECONDS = 0.35;

export type SprayClipDurationLocale = 'pt-BR' | 'en' | 'es';
export type SprayClipDurationFormat = 'compact' | 'natural';

export function isSupportedSprayClipDuration(durationSeconds: number): boolean {
    return durationSeconds >= (MIN_SPRAY_CLIP_DURATION_SECONDS - SPRAY_CLIP_DURATION_MIN_METADATA_TOLERANCE_SECONDS)
        && durationSeconds <= (MAX_SPRAY_CLIP_DURATION_SECONDS + SPRAY_CLIP_DURATION_MAX_METADATA_TOLERANCE_SECONDS);
}

export function formatSprayClipDurationRange(
    locale: SprayClipDurationLocale = 'pt-BR',
    format: SprayClipDurationFormat = 'compact'
): string {
    const minimum = MIN_SPRAY_CLIP_DURATION_SECONDS;
    const maximum = MAX_SPRAY_CLIP_DURATION_SECONDS;

    if (format === 'compact') {
        return `${minimum}-${maximum}`;
    }

    if (locale === 'en') {
        return `${minimum} to ${maximum}`;
    }

    return `${minimum} a ${maximum}`;
}

export function formatSprayClipDurationLabel(
    locale: SprayClipDurationLocale = 'pt-BR',
    format: SprayClipDurationFormat = 'compact'
): string {
    const range = formatSprayClipDurationRange(locale, format);

    if (locale === 'en') {
        return `${range} seconds`;
    }

    return `${range} segundos`;
}
