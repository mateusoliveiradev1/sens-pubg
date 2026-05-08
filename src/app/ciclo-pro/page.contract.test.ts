import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRoute = () => readFileSync(join(process.cwd(), 'src/app/ciclo-pro/page.tsx'), 'utf8');

describe('ciclo pro route contract', () => {
    it('loads training program truth server-side through existing actions and projection', () => {
        const source = readRoute();

        expect(source).toContain('auth()');
        expect(source).toContain('resolveServerProductAccess');
        expect(source).toContain('getActiveTrainingProgramCycleAction');
        expect(source).toContain('getTrainingProgramCycleAction');
        expect(source).toContain('projectTrainingProgramForAccess');
        expect(source).toContain("readSearchParam(input.params, 'cycleId')");
        expect(source).toContain("readSearchParam(input.params, 'baseSessionId')");
        expect(source).not.toMatch(/localStorage|isPro|pro_active/);
    });

    it('keeps empty and metadata copy honest', () => {
        const source = readRoute();
        const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        expect(source).toContain('Nenhum Ciclo Pro ativo');
        expect(source).toContain('sem programa inventado');
        expect(source).toContain('analise salva');
        expect(source).toContain('protocolo');
        expect(source).toContain('Mapa independente do Ciclo Pro de 30 dias');
        expect(normalized).not.toMatch(/sensibilidade perfeita|melhora garantida|rank garantido|oficial pubg|afiliado|endossado/);
    });
});
