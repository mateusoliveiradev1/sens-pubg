import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagePath = join(process.cwd(), 'src/app/admin/revenue-ops/page.tsx');
const cockpitPath = join(process.cwd(), 'src/app/admin/revenue-ops/revenue-ops-cockpit.tsx');

function source() {
    expect(
        existsSync(pagePath),
        'Phase 12 expects a staff-only Revenue Ops launch-control cockpit page at src/app/admin/revenue-ops/page.tsx.',
    ).toBe(true);
    expect(
        existsSync(cockpitPath),
        'Phase 12 expects a dedicated Revenue Ops cockpit component.',
    ).toBe(true);

    return [
        readFileSync(pagePath, 'utf8'),
        readFileSync(cockpitPath, 'utf8'),
    ].join('\n');
}

describe('Revenue Ops cockpit page contract', () => {
    it('is a staff/admin-only launch-control cockpit backed by server Revenue Ops actions', () => {
        const code = source();

        expect(code).toMatch(/getRevenueOpsCockpitSnapshot/);
        expect(code).toMatch(/getRevenueOpsSupportSnapshot|copyRevenueOpsSafeSupportSummary/);
        expect(code).toMatch(/Revenue Ops|Operacoes de Receita|controle de lancamento/i);
        expect(code).toMatch(/Founder|Beta|Public paid|lancamento publico/i);
        expect(code).toMatch(/NO-GO|BLOCKED|bloque/i);
        expect(code).toMatch(/staff|admin|support|suporte/i);
    });

    it('shows actionable no-go copy instead of vanity dashboard language', () => {
        const normalized = source()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        for (const requiredCopy of [
            'blocker',
            'impact',
            'owner',
            'runbook',
            'missing evidence',
            'next step',
        ]) {
            expect(normalized).toContain(requiredCopy);
        }

        expect(normalized).not.toMatch(/\bmrr\b|\barr\b|receita total|vanity dashboard|leaderboard de receita/);
    });

    it('reinforces server-owned Pro truth and avoids raw private/payment rendering', () => {
        const normalized = source()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(normalized).toMatch(/stripe|webhook|resolver|server/);
        expect(normalized).not.toMatch(/localstorage.*pro|success url.*pro|client state.*grant/);
        expect(normalized).not.toMatch(/rawvideo|frametrajectory|private link token|payment card|bank account|cpf/);
    });

    it('keeps the first fold centered on launch gates, blockers, and essential funnel signals', () => {
        const code = source();

        expect(code).toMatch(/overallStatus/);
        expect(code).toMatch(/founderBetaLaunch/);
        expect(code).toMatch(/publicPaidLaunch/);
        expect(code).toMatch(/highestBlockers/);
        expect(code).toMatch(/smallestNextStep/);
        expect(code).toMatch(/missingEvidence/);
        expect(code).toMatch(/metricRail/);
        expect(code).not.toMatch(/Chart|canvas|revenue leaderboard/i);
    });
});
