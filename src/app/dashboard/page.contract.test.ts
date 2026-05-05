import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dashboard arsenal icon contract', () => {
    it('uses the reusable weapon icon component instead of emoji placeholders for weapons', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/WeaponIcon/);
        expect(source).toMatch(/weaponId=\{weapon\.weaponId\}/);
        expect(source).not.toMatch(/🔫/);
    });

    it('renders an executive dashboard with next-step actions instead of only raw metric cards', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildDashboardTruthViewModel/);
        expect(source).toMatch(/const truthView = buildDashboardTruthViewModel\(stats\)/);
        expect(source).toMatch(/Dashboard de performance/);
        expect(source).toMatch(/Leitura de agora/);
        expect(source).toMatch(/Proximo passo/);
        expect(source).toMatch(/Tendencia operacional/);
        expect(source).toMatch(/Arsenal prioritario/);
        expect(source).toMatch(/Analisar novo clip/);
        expect(source).toMatch(/pts/);
        expect(source).not.toMatch(/const nextActionTitle = weakestWeapon/);
    });

    it('renders evidence-aware truth language for confidence, coverage, and trends', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/latestMastery/);
        expect(source).toMatch(/truthView\.truthBadgeLabel/);
        expect(source).toMatch(/truthView\.scoreLabel/);
        expect(source).toMatch(/Confianca/);
        expect(source).toMatch(/Cobertura/);
        expect(source).toMatch(/truthView\.evidenceLabel/);
        expect(source).toMatch(/truthView\.evidenceSummary/);
        expect(source).toMatch(/truthView\.trendBody/);
        expect(source).toMatch(/truthView\.precisionTrendLabel/);
        expect(source).toMatch(/truthView\.precisionTrendSummary/);
        expect(source).toMatch(/Trend principal/);
    });

    it('avoids perfect, guaranteed, or final improvement claims in dashboard copy', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(source).not.toMatch(/perfeito|garantid|definitiv|verdade final|veredito final|melhora garantida/);
    });
});
