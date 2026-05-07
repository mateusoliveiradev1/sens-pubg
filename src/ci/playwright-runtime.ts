const DEFAULT_PLAYWRIGHT_BASE_URL = 'http://localhost:3000';
const DEFAULT_PLAYWRIGHT_WEB_SERVER_COMMAND = 'node scripts/clean-next-dev-cache.mjs && npm run dev';

export interface PlaywrightRuntimeConfig {
    readonly baseURL: string;
    readonly shouldStartWebServer: boolean;
    readonly webServerCommand: string;
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
        webServerCommand: DEFAULT_PLAYWRIGHT_WEB_SERVER_COMMAND,
    };
};
