import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { ProLockPreview } from './pro-lock-preview';

describe('ProLockPreview contract', () => {
    it('shows current evidence, Pro continuity, blocker reason, and CTA without fake blur', () => {
        const html = renderToStaticMarkup(
            <ProLockPreview
                currentValueLabel="Free mostra confianca 72%, cobertura 81% e bloqueadores visiveis."
                lock={{
                    featureKey: 'coach.full_plan',
                    reason: 'pro_feature',
                    title: 'Plano completo do coach',
                    body: 'O resumo Free continua visivel. Pro adiciona continuidade, resultado do treino e validacao compativel.',
                    ctaHref: '/pricing',
                }}
                proValueLabel="Pro abre protocolo completo, historico profundo e validacao compativel."
            />
        );

        expect(html).toContain('Visivel agora');
        expect(html).toContain('confianca 72%');
        expect(html).toContain('cobertura 81%');
        expect(html).toContain('bloqueadores visiveis');
        expect(html).toContain('Com Pro');
        expect(html).toContain('Pro desbloqueia continuidade');
        expect(html).toContain('Entrar no Pro Founder');
        expect(html).toContain('data-no-fake-blur="true"');
        expect(html).not.toContain('filter:blur');
        expect(html).not.toContain('placeholder oculto');
    });
});
