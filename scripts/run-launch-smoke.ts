import { spawnSync } from 'node:child_process';

const [, , baseUrl, ...testArgs] = process.argv;

if (!baseUrl) {
    console.error('Usage: npm run smoke:deployed -- <base-url> [playwright-args...]');
    process.exit(1);
}

const playwrightArgs = testArgs.length > 0
    ? testArgs
    : [
        'e2e/pages.spec.ts',
        'e2e/a11y.spec.ts',
        'e2e/responsive.spec.ts',
    ];

const result = spawnSync(
    process.platform === 'win32' ? 'npx' : 'npx',
    ['playwright', 'test', ...playwrightArgs],
    {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: {
            ...process.env,
            PLAYWRIGHT_BASE_URL: baseUrl,
            PLAYWRIGHT_SKIP_WEBSERVER: '1',
        },
    },
);

process.exit(result.status ?? 1);
