import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { UploadDropzone, type UploadDropzoneState } from './upload-dropzone';

const baseProps = {
    clipRequirementLabel: 'MP4/WebM, 5 a 15 segundos, ate 50MB',
    guidance: 'Grave 5 a 15 segundos, reticulo visivel, uma arma, um spray continuo.',
    onFileSelected: () => undefined,
};

describe('UploadDropzone contract', () => {
    it('renders the Phase 7 assisted upload copy and browser-first reassurance', () => {
        const html = renderToStaticMarkup(
            <UploadDropzone
                {...baseProps}
                onOpenGuide={() => undefined}
                state="empty"
            />
        );

        expect(html).toContain('Escolher clip de spray');
        expect(html).toContain('Grave 5 a 15 segundos, reticulo visivel, uma arma, um spray continuo.');
        expect(html).toContain('Lendo frames no navegador');
        expect(html).toContain('Seu video nao precisa ir para o servidor para ser analisado.');
        expect(html).toContain('Ver guia de captura utilizavel');
        expect(html).not.toMatch(/Submit|OK|Next|Escolher Arquivo|clipe perfeito/i);
    });

    it('keeps the file action stable across invalid, warning, processing, quota, and ready states', () => {
        const states: readonly UploadDropzoneState[] = [
            'empty',
            'drag_hover',
            'file_selected',
            'validating',
            'invalid_file',
            'quality_warning',
            'processing_frames',
            'quota_warning',
            'quota_exhausted',
            'analysis_ready',
            'error',
        ];

        for (const state of states) {
            const html = renderToStaticMarkup(
                <UploadDropzone
                    {...baseProps}
                    errorMessage={state === 'invalid_file' ? 'Formato invalido.' : null}
                    qualityMessage={state === 'quality_warning' ? 'A leitura vai seguir mais conservadora.' : null}
                    quotaNotice={state === 'quota_exhausted'
                        ? {
                            label: 'Limite Free do mes atingido',
                            body: 'Voce ainda pode analisar no navegador; salvar exige resolver o limite.',
                            usageLabel: '3/3 saves',
                            tone: 'error',
                            ctaLabel: 'Ver Pro',
                            href: '/pricing',
                        }
                        : state === 'quota_warning'
                            ? {
                                label: 'Poucas analises uteis restantes',
                                body: 'Use este save nos clips com melhor evidencia.',
                                usageLabel: '2/3 saves',
                                tone: 'warning',
                                ctaLabel: 'Ver Pro',
                                href: '/pricing',
                            }
                            : null}
                    state={state}
                />
            );

            expect(html).toContain(`data-state="${state}"`);
            expect(html).toContain('Escolher clip de spray');
        }
    });

    it('surfaces weapon visual support without implying full technical calibration', () => {
        const html = renderToStaticMarkup(
            <UploadDropzone
                {...baseProps}
                selectedWeapon={{
                    id: 'k2',
                    name: 'K2',
                    category: 'ar',
                    supportStatus: {
                        kind: 'visual',
                        label: 'suporte visual',
                        description: 'Icone visual autoral disponivel; analise tecnica completa ainda nao esta habilitada para esta arma.',
                    },
                }}
                state="file_selected"
            />
        );

        expect(html).toContain('K2');
        expect(html).toContain('suporte visual');
        expect(html).toContain('analise tecnica completa ainda nao esta habilitada');
        expect(html).toContain('premium-weapon-visual');
    });
});
