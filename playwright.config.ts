import { defineConfig } from '@playwright/test';
import { getPlaywrightRuntimeConfig } from './src/ci/playwright-runtime';

const runtime = getPlaywrightRuntimeConfig();

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 4,
    reporter: 'html',
    use: {
        baseURL: runtime.baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    ...(runtime.shouldStartWebServer ? {
        webServer: {
            command: 'npm run dev',
            url: runtime.baseURL,
            reuseExistingServer: true,
            timeout: 30000,
        },
    } : {}),
});
