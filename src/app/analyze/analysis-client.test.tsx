import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('analysis client Spray Lab validation mode contract', () => {
    it('preloads validation context and asks the user to confirm variables', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/validationTarget/);
        expect(source).toMatch(/resolveValidationWeaponId/);
        expect(source).toMatch(/setScopeId\(validationScopeId\)/);
        expect(source).toMatch(/setDistanceMode\(validationTarget\.preload\.distanceMode\)/);
        expect(source).toMatch(/setValidationVariablesChanged/);
        expect(source).toContain('Confirmo que as variaveis do clip continuam iguais ao alvo do Lab.');
    });

    it('persists validation metadata without treating variable changes as confirmed validation', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');
        const historySource = readFileSync(new URL('../../actions/history.ts', import.meta.url), 'utf8');

        expect(source).toMatch(/sprayLabValidation/);
        expect(source).toMatch(/confirmedVariables:\s*!validationVariablesChanged/);
        expect(historySource).toMatch(/createSprayLabValidationLinkAction/);
        expect(historySource).toMatch(/validationAnalysisSessionId:\s*sessionId/);
    });

    it('uses a validation repair state for blocked compatible clips instead of a generic analysis error', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildSprayLabValidationRepairState/);
        expect(source).toContain('Validacao bloqueada');
        expect(source).toContain('Voltar ao Spray Lab');
        expect(source).toContain('Gravar outro clip');
    });
});
