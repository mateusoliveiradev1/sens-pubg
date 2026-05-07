import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (filePath: string): string => readFileSync(join(process.cwd(), filePath), 'utf8');

describe('header monetization CTA contract', () => {
    it('exposes paid and professional-reference routes without local entitlement state', () => {
        const source = readSource('src/ui/components/header.tsx');

        expect(source).toContain('BrandLockup');
        expect(source).toContain('href="/pricing"');
        expect(source).toContain('Planos');
        expect(source).toContain('href="/billing"');
        expect(source).toContain('Assinatura');
        expect(source).toContain('href="/pros"');
        expect(source).toContain('Sens dos Pros');
        expect(source).toContain('Sens PUBG');
        expect(source).not.toMatch(/AIMANALYZER|Billing/);
        expect(source).not.toMatch(/localStorage|isPro|pro_active/);
    });

    it('keeps desktop navigation in the Phase 7 order', () => {
        const source = readSource('src/ui/components/header.tsx');
        const labels = ['Analisar', 'Dashboard', 'Historico', 'Sens dos Pros', 'Comunidade', 'Planos'];
        const positions = labels.map((label) => source.indexOf(label));

        expect(positions.every((position) => position >= 0)).toBe(true);
        expect([...positions].sort((left, right) => left - right)).toEqual(positions);
    });
});
