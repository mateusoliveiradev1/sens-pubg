export type ReleaseReadinessStatus = 'pass' | 'warn' | 'fail';

export interface ReleaseReadinessCheck {
    readonly key: string;
    readonly label: string;
    readonly status: ReleaseReadinessStatus;
    readonly detail: string;
}

export interface ReleaseReadinessGates {
    readonly localBrowserReady: boolean;
    readonly deploymentReady: boolean;
    readonly backendPipelineReady: boolean;
}

export interface ReleaseReadinessReport {
    readonly gates: ReleaseReadinessGates;
    readonly checks: readonly ReleaseReadinessCheck[];
}

export interface EvaluateReleaseReadinessInput {
    readonly env: Partial<Record<string, string | undefined>>;
    readonly vercelProjectLinked: boolean;
    readonly ffmpegInstalled: boolean;
}

const REQUIRED_RUNTIME_ENV_KEYS = [
    'DATABASE_URL',
    'AUTH_SECRET',
    'AUTH_GOOGLE_ID',
    'AUTH_GOOGLE_SECRET',
    'AUTH_DISCORD_ID',
    'AUTH_DISCORD_SECRET',
    'NEXT_PUBLIC_APP_URL',
] as const;

const PLACEHOLDER_PATTERNS = [
    /replace-with/i,
    /placeholder/i,
    /changeme/i,
    /your-/i,
    /^example$/i,
    /^dummy$/i,
];

function hasConcreteValue(value: string | undefined): value is string {
    if (value === undefined) {
        return false;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 && PLACEHOLDER_PATTERNS.every((pattern) => !pattern.test(trimmed));
}

function parseUrl(value: string | undefined): URL | null {
    if (!hasConcreteValue(value)) {
        return null;
    }

    try {
        return new URL(value);
    } catch {
        return null;
    }
}

function isLocalHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

function renderCheck(status: ReleaseReadinessStatus, key: string, label: string, detail: string): ReleaseReadinessCheck {
    return {
        key,
        label,
        status,
        detail,
    };
}

export function evaluateReleaseReadiness({
    env,
    vercelProjectLinked,
    ffmpegInstalled,
}: EvaluateReleaseReadinessInput): ReleaseReadinessReport {
    const missingRuntimeEnv = REQUIRED_RUNTIME_ENV_KEYS.filter((key) => !hasConcreteValue(env[key]));

    const runtimeEnvCheck = missingRuntimeEnv.length === 0
        ? renderCheck(
            'pass',
            'runtime-env',
            'Runtime env obrigatoria',
            `Todas as ${REQUIRED_RUNTIME_ENV_KEYS.length} variaveis obrigatorias parecem preenchidas.`,
        )
        : renderCheck(
            'fail',
            'runtime-env',
            'Runtime env obrigatoria',
            `Faltando ou placeholder: ${missingRuntimeEnv.join(', ')}.`,
        );

    const publicAppUrl = parseUrl(env.NEXT_PUBLIC_APP_URL);
    const publicAppUrlCheck = (() => {
        if (publicAppUrl === null) {
            return renderCheck(
                'fail',
                'public-app-url',
                'NEXT_PUBLIC_APP_URL',
                'Ausente ou invalida. Defina a URL publica usada por metadata, sitemap e smoke.',
            );
        }

        if (isLocalHost(publicAppUrl.hostname)) {
            return renderCheck(
                'warn',
                'public-app-url',
                'NEXT_PUBLIC_APP_URL',
                'Aponta para localhost. Isso serve para release local, mas ainda nao para deploy final.',
            );
        }

        if (publicAppUrl.protocol !== 'https:') {
            return renderCheck(
                'warn',
                'public-app-url',
                'NEXT_PUBLIC_APP_URL',
                'Existe, mas nao usa HTTPS. Ajuste para o dominio final antes de publicar.',
            );
        }

        return renderCheck(
            'pass',
            'public-app-url',
            'NEXT_PUBLIC_APP_URL',
            `Configurada para ${publicAppUrl.origin}.`,
        );
    })();

    const authUrl = parseUrl(env.AUTH_URL);
    const authUrlCheck = (() => {
        if (env.AUTH_URL === undefined || env.AUTH_URL.trim() === '') {
            return renderCheck(
                'warn',
                'auth-url',
                'AUTH_URL',
                'Nao definida. O app pode funcionar localmente com trustHost, mas deploy final fica sem URL explicita de auth.',
            );
        }

        if (authUrl === null) {
            return renderCheck(
                'fail',
                'auth-url',
                'AUTH_URL',
                'Valor presente, mas invalido.',
            );
        }

        if (isLocalHost(authUrl.hostname)) {
            return renderCheck(
                'warn',
                'auth-url',
                'AUTH_URL',
                'Aponta para localhost. Troque pela URL final antes do deploy.',
            );
        }

        if (authUrl.protocol !== 'https:') {
            return renderCheck(
                'warn',
                'auth-url',
                'AUTH_URL',
                'Existe, mas nao usa HTTPS. Ajuste para producao.',
            );
        }

        return renderCheck(
            'pass',
            'auth-url',
            'AUTH_URL',
            `Configurada para ${authUrl.origin}.`,
        );
    })();

    const vercelCheck = vercelProjectLinked
        ? renderCheck(
            'pass',
            'vercel-link',
            'Link de deploy',
            'Projeto Vercel vinculado neste workspace.',
        )
        : renderCheck(
            'warn',
            'vercel-link',
            'Link de deploy',
            'Nenhum projeto Vercel vinculado. Deploy final ainda depende de link/configuracao do host.',
        );

    const ffmpegCheck = ffmpegInstalled
        ? renderCheck(
            'pass',
            'ffmpeg',
            'ffmpeg runtime',
            'ffmpeg disponivel para pipeline server-side.',
        )
        : renderCheck(
            'warn',
            'ffmpeg',
            'ffmpeg runtime',
            'ffmpeg ausente. O caminho browser-first segue pronto, mas o backend real de extracao ainda fica bloqueado.',
        );

    const checks = [
        runtimeEnvCheck,
        publicAppUrlCheck,
        authUrlCheck,
        vercelCheck,
        ffmpegCheck,
    ] as const;

    const localBrowserReady = runtimeEnvCheck.status !== 'fail';
    const deploymentReady = runtimeEnvCheck.status !== 'fail'
        && publicAppUrlCheck.status === 'pass'
        && authUrlCheck.status === 'pass'
        && vercelCheck.status === 'pass';
    const backendPipelineReady = deploymentReady && ffmpegCheck.status === 'pass';

    return {
        gates: {
            localBrowserReady,
            deploymentReady,
            backendPipelineReady,
        },
        checks,
    };
}

function formatGateStatus(ready: boolean): string {
    return ready ? 'PASS' : 'NO-GO';
}

function formatCheckStatus(status: ReleaseReadinessStatus): string {
    switch (status) {
        case 'pass':
            return 'PASS';
        case 'warn':
            return 'WARN';
        case 'fail':
            return 'FAIL';
    }
}

export function formatReleaseReadinessReport(report: ReleaseReadinessReport): string {
    const lines = [
        'Release Readiness',
        `- Local browser release: ${formatGateStatus(report.gates.localBrowserReady)}`,
        `- Deploy final: ${formatGateStatus(report.gates.deploymentReady)}`,
        `- Backend ffmpeg pipeline: ${formatGateStatus(report.gates.backendPipelineReady)}`,
        '',
        'Checks:',
        ...report.checks.map((check) => `- [${formatCheckStatus(check.status)}] ${check.label}: ${check.detail}`),
    ];

    return lines.join('\n');
}
