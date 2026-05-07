import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { LoopRail } from './loop-rail';

describe('LoopRail contract', () => {
    it('exposes the full solo loop and current step as readable text', () => {
        const html = renderToStaticMarkup(
            <LoopRail
                currentStage="coach"
                evidenceLabel="Confianca 78%, cobertura 84%"
                nextActionLabel="Registrar resultado do bloco"
            />
        );

        for (const label of ['Clip', 'Evidencia', 'Coach', 'Bloco', 'Resultado', 'Validacao', 'Checkpoint']) {
            expect(html).toContain(label);
        }

        expect(html).toContain('aria-current="step"');
        expect(html).toContain('Confianca 78%, cobertura 84%');
        expect(html).toContain('Registrar resultado do bloco');
    });

    it('keeps blocked state visible through text and attributes', () => {
        const html = renderToStaticMarkup(
            <LoopRail
                blocked
                currentStage="validation"
                evidenceLabel="Evidencia fraca"
                nextActionLabel="Capturar de novo"
            />
        );

        expect(html).toContain('data-current-stage="validation"');
        expect(html).toContain('Evidencia fraca');
        expect(html).toContain('Capturar de novo');
    });
});
