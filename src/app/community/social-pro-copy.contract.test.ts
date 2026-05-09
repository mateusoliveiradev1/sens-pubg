import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOCIAL_PRO_COPY_FILES = [
    'src/app/community/page.tsx',
    'src/app/community/[slug]/page.tsx',
    'src/app/community/[slug]/post-detail.tsx',
    'src/app/community/users/[slug]/page.tsx',
    'src/app/community/reports/[token]/page.tsx',
    'src/app/community/reports/[token]/pro-report-detail.tsx',
    'src/core/community-discovery-view-model.ts',
    'src/core/community-public-profile-view-model.ts',
    'src/core/social-pro-report-view-model.ts',
    'src/core/social-pro-creator-analytics.ts',
    'src/actions/social-pro-library.ts',
    'src/actions/community-reports.ts',
    'src/actions/community-admin.ts',
    'src/app/analyze/results-dashboard.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/ciclo-pro/page.tsx',
    'src/app/spray-lab/page.tsx',
    'src/app/history/page.tsx',
    'src/lib/premium-projection.ts',
] as const;

const REQUIRED_ORIGINAL_VALUE_TERMS = [
    /analise/,
    /coach/,
    /historico/,
    /protocolo[s]? completo[s]?/,
    /spray lab/,
    /ciclo pro/,
    /validacao compativel/,
    /auditoria/,
    /continuidade/,
    /organizacao/,
] as const;

const DISALLOWED_SOCIAL_PRO_CLAIMS = [
    /sensibilidade perfeita/,
    /perfect sensitivity/,
    /melhora garantida/,
    /resultado garantido/,
    /rank garantido/,
    /nota global/,
    /global player grade/,
    /pubg oficial/,
    /official pubg/,
    /krafton oficial/,
    /official krafton/,
    /parceiro krafton/,
    /krafton partner/,
    /api pubg exclusiva/,
    /acesso exclusivo a api pubg/,
    /pagante com autoridade/,
    /paid-user authority/,
    /creator certificado por pagamento/,
] as const;

function readSource(path: string): string {
    return readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
}

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

describe('Social Pro community copy contract', () => {
    it('scans report, badge, hub, lock, analytics, library, moderation, profile, post, and handoff surfaces', () => {
        expect(SOCIAL_PRO_COPY_FILES).toEqual(expect.arrayContaining([
            'src/app/community/page.tsx',
            'src/app/community/[slug]/post-detail.tsx',
            'src/app/community/users/[slug]/page.tsx',
            'src/app/community/reports/[token]/pro-report-detail.tsx',
            'src/core/community-public-profile-view-model.ts',
            'src/core/social-pro-report-view-model.ts',
            'src/core/social-pro-creator-analytics.ts',
            'src/actions/social-pro-library.ts',
            'src/actions/community-reports.ts',
            'src/actions/community-admin.ts',
            'src/app/analyze/results-dashboard.tsx',
            'src/app/ciclo-pro/page.tsx',
            'src/app/spray-lab/page.tsx',
            'src/app/history/page.tsx',
        ]));
    });

    it('sells original Sens PUBG value instead of gated PUBG API data', () => {
        const copy = normalize(SOCIAL_PRO_COPY_FILES.map(readSource).join('\n'));

        for (const term of REQUIRED_ORIGINAL_VALUE_TERMS) {
            expect(copy, `Social Pro copy should mention ${term}`).toMatch(term);
        }

        expect(copy).not.toMatch(/pubg api.*exclusiv|api pubg.*exclusiv/);
    });

    it('blocks guarantees, global grades, affiliation claims, and paid authority copy', () => {
        const copy = normalize(SOCIAL_PRO_COPY_FILES.map(readSource).join('\n'));

        for (const claim of DISALLOWED_SOCIAL_PRO_CLAIMS) {
            expect(copy, `Social Pro copy should not match ${claim}`).not.toMatch(claim);
        }
    });

    it('locks badge meaning to active Pro access without skill or certification authority', () => {
        const copy = normalize(SOCIAL_PRO_COPY_FILES.map(readSource).join('\n'));

        expect(copy).toContain('pro: acesso aos recursos premium do sens pubg');
        expect(copy).toContain('nao indica autoridade tecnica');
        expect(copy).not.toMatch(/pro player|habilidade superior|coach verificado|autoridade comprovada/);
    });

    it('keeps upgrade cues tied to real Social Pro actions rather than passive feed impressions', () => {
        const copy = normalize(readSource('src/app/community/page.tsx'));

        expect(copy).toContain('generate_report');
        expect(copy).toContain('pro_library_save');
        expect(copy).toContain('creator_analytics_open');
        expect(copy).not.toMatch(/feed.*upgrade|banner.*pro|impressao passiva|passive.*impression/);
    });

    it('keeps public profile report listings and badge surfaces explicit in user-facing routes', () => {
        const copy = normalize([
            readSource('src/app/community/users/[slug]/page.tsx'),
            readSource('src/app/community/[slug]/post-detail.tsx'),
            readSource('src/app/community/page.tsx'),
            readSource('src/app/community/reports/[token]/pro-report-detail.tsx'),
        ].join('\n'));

        expect(copy).toContain('profile-social-pro-reports');
        expect(copy).toContain('social-pro-report-card');
        expect(copy).toContain('data-social-pro-badge="profile"');
        expect(copy).toContain('data-social-pro-badge="post-author"');
        expect(copy).toContain('data-social-pro-badge={badge.meaning}');
        expect(copy).toContain('data-badge-copy="pro: acesso aos recursos premium do sens pubg"');
        expect(copy).toContain('nao indica autoridade tecnica');
    });
});
