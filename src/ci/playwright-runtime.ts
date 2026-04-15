const DEFAULT_PLAYWRIGHT_BASE_URL = 'http://localhost:3000';

export interface PlaywrightRuntimeConfig {
    readonly baseURL: string;
    readonly shouldStartWebServer: boolean;
}

const normalizeBaseUrl = (value: string | undefined): string => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_PLAYWRIGHT_BASE_URL;
};

export const getPlaywrightRuntimeConfig = (
    env: NodeJS.ProcessEnv = process.env,
): PlaywrightRuntimeConfig => {
    const baseURL = normalizeBaseUrl(env.PLAYWRIGHT_BASE_URL);
    const skipWebServer = env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

    return {
        baseURL,
        shouldStartWebServer: !skipWebServer && baseURL === DEFAULT_PLAYWRIGHT_BASE_URL,
    };
};

