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
        expect(source).toContain('buildCicloProViewModel');
        expect(source).toContain('CicloProProgramMap');
        expect(source).toContain('LoopRail');
        expect(source).toContain("readSearchParam(input.params, 'cycleId')");
        expect(source).toContain("readSearchParam(input.params, 'baseSessionId')");
        expect(source).not.toMatch(/localStorage|isPro|pro_active/);
    });

    it('keeps empty and metadata copy honest', () => {
        const source = readRoute();
        const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        expect(source).toContain('Mapa independente do Ciclo Pro de 30 dias');
        expect(normalized).not.toMatch(/sensibilidade perfeita|melhora garantida|rank garantido|oficial pubg|afiliado|endossado/);
    });

    it('renders the full route through map UI without duplicating Analyze or Spray Lab runners', () => {
        const pageSource = readRoute();
        const componentSource = readFileSync(join(process.cwd(), 'src/app/ciclo-pro/ciclo-pro-program-map.tsx'), 'utf8');
        const viewModelSource = readFileSync(join(process.cwd(), 'src/app/ciclo-pro/ciclo-pro-view-model.ts'), 'utf8');
        const stylesSource = readFileSync(join(process.cwd(), 'src/app/ciclo-pro/ciclo-pro.module.css'), 'utf8');

        expect(componentSource).toContain('Agora');
        expect(componentSource).toContain('Por que importa');
        expect(componentSource).toContain('O que invalida');
        expect(componentSource).toContain('Evidencia gerada');
        expect(componentSource).toContain('/spray-lab');
        expect(componentSource).toContain('/analyze?mode=validation');
        expect(componentSource).toContain('/dashboard');
        expect(componentSource).toContain('/history');
        expect(componentSource).toContain('Sem nota global');
        expect(viewModelSource).toContain('Desbloqueie o Ciclo Pro de 30 dias');
        expect(viewModelSource).toContain('O Free te mostra o proximo passo');
        expect(componentSource).not.toMatch(/createSprayLabSessionAction|AnalysisClient|video|canvas/);
        expect(pageSource).not.toMatch(/createSprayLabSessionAction|AnalysisClient/);
        expect(stylesSource).toContain('.missionCard');
        expect(stylesSource).toContain('.checkpointCard');
        expect(stylesSource).toContain('.weekBlock');
        expect(stylesSource).not.toMatch(/cardInside|nestedCard|card\s+\.card/);
    });
});
