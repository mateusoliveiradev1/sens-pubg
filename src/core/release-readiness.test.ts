import { describe, expect, it } from 'vitest';
import { evaluateReleaseReadiness, formatReleaseReadinessReport } from './release-readiness';

const requiredEnv = {
    DATABASE_URL: 'postgresql://user:pass@example.com:5432/sens_pubg',
    AUTH_SECRET: 'super-secret',
    AUTH_GOOGLE_ID: 'google-id',
    AUTH_GOOGLE_SECRET: 'google-secret',
    AUTH_DISCORD_ID: 'discord-id',
    AUTH_DISCORD_SECRET: 'discord-secret',
    NEXT_PUBLIC_APP_URL: 'https://sens.example.com',
} as const;

describe('evaluateReleaseReadiness', () => {
    it('marks local, deploy, and backend as ready when runtime, URLs, host link, and ffmpeg are all available', () => {
        const report = evaluateReleaseReadiness({
            env: {
                ...requiredEnv,
                AUTH_URL: 'https://sens.example.com',
            },
            vercelProjectLinked: true,
            ffmpegInstalled: true,
        });

        expect(report.gates).toEqual({
            localBrowserReady: true,
            deploymentReady: true,
            backendPipelineReady: true,
            paidLaunchReady: null,
        });
        expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
    });

    it('treats localhost URLs and missing ffmpeg as pre-deploy warnings, not a local browser blocker', () => {
        const report = evaluateReleaseReadiness({
            env: {
                ...requiredEnv,
                NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
                AUTH_URL: 'http://localhost:3000',
            },
            vercelProjectLinked: true,
            ffmpegInstalled: false,
        });

        expect(report.gates).toEqual({
            localBrowserReady: true,
            deploymentReady: false,
            backendPipelineReady: false,
            paidLaunchReady: null,
        });
        expect(report.checks.find((check) => check.key === 'public-app-url')?.status).toBe('warn');
        expect(report.checks.find((check) => check.key === 'auth-url')?.status).toBe('warn');
        expect(report.checks.find((check) => check.key === 'ffmpeg')?.status).toBe('warn');
    });

    it('fails local readiness when required runtime env is missing or still placeholder', () => {
        const report = evaluateReleaseReadiness({
            env: {
                ...requiredEnv,
                AUTH_SECRET: 'replace-with-a-long-random-secret',
            },
            vercelProjectLinked: false,
            ffmpegInstalled: false,
        });

        expect(report.gates.localBrowserReady).toBe(false);
        expect(report.checks.find((check) => check.key === 'runtime-env')).toMatchObject({
            status: 'fail',
        });
    });

    it('exposes paid-launch blockers without making backend ffmpeg a browser-first blocker', () => {
        const report = evaluateReleaseReadiness({
            env: {
                ...requiredEnv,
                AUTH_URL: 'https://sens.example.com',
            },
            vercelProjectLinked: true,
            ffmpegInstalled: false,
            paidLaunch: {
                publicPaidReady: false,
                detail: 'Production Stripe webhook evidence and deployed paid smoke are still missing.',
            },
        });

        expect(report.gates).toMatchObject({
            localBrowserReady: true,
            deploymentReady: true,
            backendPipelineReady: false,
            paidLaunchReady: false,
        });
        expect(report.checks.find((check) => check.key === 'paid-launch')?.status).toBe('fail');
    });
});

describe('formatReleaseReadinessReport', () => {
    it('renders the gate summary and all check statuses in text form', () => {
        const report = evaluateReleaseReadiness({
            env: {
                ...requiredEnv,
                AUTH_URL: 'https://sens.example.com',
            },
            vercelProjectLinked: true,
            ffmpegInstalled: false,
        });

        const formatted = formatReleaseReadinessReport(report);

        expect(formatted).toContain('Local browser release: PASS');
        expect(formatted).toContain('Deploy final: PASS');
        expect(formatted).toContain('Backend ffmpeg pipeline: NO-GO');
        expect(formatted).toContain('[WARN] ffmpeg runtime');
    });

    it('renders paid-launch status when the caller provides it', () => {
        const report = evaluateReleaseReadiness({
            env: {
                ...requiredEnv,
                AUTH_URL: 'https://sens.example.com',
            },
            vercelProjectLinked: true,
            ffmpegInstalled: true,
            paidLaunch: {
                publicPaidReady: false,
                detail: 'Revenue Ops evidence matrix is blocked.',
            },
        });

        const formatted = formatReleaseReadinessReport(report);

        expect(formatted).toContain('Paid public launch: NO-GO');
        expect(formatted).toContain('[FAIL] Paid public launch');
        expect(formatted).toContain('Revenue Ops evidence matrix is blocked.');
    });
});
