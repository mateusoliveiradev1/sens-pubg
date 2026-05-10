import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
    evaluateReleaseReadiness,
    formatReleaseReadinessReport,
} from '../src/core/release-readiness';

type ReadinessMode = 'local' | 'deploy' | 'backend' | 'paid-launch';

function resolveMode(argv: readonly string[]): ReadinessMode {
    if (argv.includes('--paid-launch')) {
        return 'paid-launch';
    }

    if (argv.includes('--backend')) {
        return 'backend';
    }

    if (argv.includes('--deploy')) {
        return 'deploy';
    }

    return 'local';
}

function loadWorkspaceEnv(cwd: string): void {
    const envPaths = ['.env.local', '.env'];

    for (const relativePath of envPaths) {
        const filePath = path.join(cwd, relativePath);
        if (existsSync(filePath)) {
            loadEnv({ path: filePath, override: false, quiet: true });
        }
    }
}

function isBinaryAvailable(command: string, args: readonly string[]): boolean {
    const result = spawnSync(command, args, {
        stdio: 'ignore',
        shell: process.platform === 'win32',
    });

    return result.status === 0;
}

function shouldExitWithFailure(mode: ReadinessMode, report: ReturnType<typeof evaluateReleaseReadiness>): boolean {
    switch (mode) {
        case 'local':
            return !report.gates.localBrowserReady;
        case 'deploy':
            return !report.gates.deploymentReady;
        case 'backend':
            return !report.gates.backendPipelineReady;
        case 'paid-launch':
            return report.gates.paidLaunchReady !== true;
    }
}

const cwd = process.cwd();
loadWorkspaceEnv(cwd);
const mode = resolveMode(process.argv.slice(2));

const report = evaluateReleaseReadiness({
    env: process.env,
    vercelProjectLinked: existsSync(path.join(cwd, '.vercel', 'project.json')),
    ffmpegInstalled: isBinaryAvailable('ffmpeg', ['-version']),
    ...(mode === 'paid-launch'
        ? {
            paidLaunch: {
                publicPaidReady: false,
                detail: [
                    'Paid launch is controlled by the Revenue Ops evidence matrix.',
                    'Run npm run verify:phase12:revenue-ops and record Stripe production/deploy evidence before real charging.',
                ].join(' '),
            },
        }
        : {}),
});

console.log(formatReleaseReadinessReport(report));

process.exit(shouldExitWithFailure(mode, report) ? 1 : 0);
