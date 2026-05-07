import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { PageCommandHeader } from './page-command-header';

describe('PageCommandHeader contract', () => {
    it('renders one dominant action and a compact evidence row', () => {
        const html = renderToStaticMarkup(
            <PageCommandHeader
                body="Leitura no navegador com evidencia visivel antes do proximo bloco."
                evidenceItems={[
                    { label: 'Confianca', value: '78%', tone: 'info' },
                    { label: 'Cobertura', value: '84%', tone: 'success' },
                    { label: 'Bloqueador', value: 'nenhum', tone: 'warning' },
                ]}
                primaryAction={{ label: 'Analisar meu spray', href: '/analyze' }}
                roleLabel="Command center"
                title="Proximo bloco de spray"
            />
        );

        expect(html).toContain('Proximo bloco de spray');
        expect(html).toContain('Analisar meu spray');
        expect(html).toContain('Status e evidencia');
        expect(html).toContain('Confianca');
        expect(html).toContain('Cobertura');
        expect(html).toContain('Bloqueador');
        expect(html).not.toMatch(/Submit|Click here|OK/i);
    });
});
