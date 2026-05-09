import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
    buildSocialProReportViewModel,
    type SocialProReportViewModel,
} from '@/core/social-pro-report-view-model';

import { ProReportDetail } from './pro-report-detail';

const sourceIds = {
    analysisSessionId: 'analysis-1',
    protocolRevisionId: 'protocol-1',
    sprayLabSessionId: 'lab-1',
    trainingProgramCycleId: 'cycle-1',
    validationLinkId: 'validation-1',
};

const activeProBadge = {
    visible: true,
    label: 'Pro',
    tooltip: 'Pro: acesso aos recursos premium do Sens PUBG',
    meaning: 'active_pro_access',
} as const;

function normalize(copy: string): string {
    return copy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function createModel(): SocialProReportViewModel & {
    readonly proBadge: typeof activeProBadge;
} {
    const model = buildSocialProReportViewModel({
        sourceIds,
        generatedAt: '2026-05-09T12:00:00.000Z',
        report: {
            id: 'report-1',
            visibility: 'public',
            status: 'published',
            publicSummary: {
                title: 'Beryl 3x 50m - caso de evolucao',
                whatChanged: 'Controle vertical ficou mais estavel no mesmo contexto testado.',
                nextAction: 'Continuar Ciclo Pro, abrir Spray Lab e gravar validacao compativel.',
            },
            honesty: {
                confidence: 0.81,
                coverage: 0.77,
                blockers: ['validacao compativel ainda pendente'],
                inconclusiveState: false,
                limitedSupport: ['um contexto de arma, mira e distancia'],
                validationState: 'compatible_validation_pending',
                noOverclaimDisclaimer: 'Evidencia orienta treino, nao promete rank ou sensibilidade perfeita.',
            },
            controls: {
                showConfidence: false,
                showCoverage: false,
                showBlockers: false,
                showInconclusiveState: false,
                showLimitedSupport: false,
                showValidationState: false,
                showDisclaimer: false,
                showTimeline: true,
                visibleOptionalSections: ['setup_summary', 'evidence_timeline', 'validation'],
            },
            sections: {
                setup_summary: {
                    weapon: 'Beryl M762',
                    optic: '3x',
                    distanceMeters: 50,
                },
                evidence_timeline: [
                    {
                        layer: 'technical_evidence',
                        title: 'Analise base',
                        summary: 'Confianca 81%, cobertura 77%.',
                        sourceId: 'analysis-1',
                    },
                    {
                        layer: 'training_execution',
                        title: 'Spray Lab executado',
                        summary: 'Sessao de consistencia concluida.',
                        sourceId: 'lab-1',
                    },
                    {
                        layer: 'practical_transfer',
                        title: 'Transferencia pratica',
                        summary: 'TDM entra como transferencia pratica, nao como prova tecnica.',
                        sourceId: null,
                    },
                    {
                        layer: 'compatible_validation',
                        title: 'Validacao compativel',
                        summary: 'Ainda precisa clip compativel para prova tecnica.',
                        sourceId: 'validation-1',
                    },
                ],
                private_reader: 'reader@example.com',
                payment_state: 'paid',
                raw_private_analysis: 'private raw trajectory',
                internal_notes: 'private coach note',
            },
        },
    });

    return {
        ...model,
        proBadge: activeProBadge,
    };
}

function renderDetail(model = createModel()): string {
    return renderToStaticMarkup(<ProReportDetail model={model} />);
}

describe('ProReportDetail contract', () => {
    it('renders the required public summary, honesty fields, validation state, disclaimer, and next action', () => {
        const markup = renderDetail();

        expect(markup).toContain('Relatorio Pro Compartilhavel');
        expect(markup).toContain('Beryl 3x 50m - caso de evolucao');
        expect(markup).toContain('Controle vertical ficou mais estavel');
        expect(markup).toContain('Continuar Ciclo Pro');

        for (const label of [
            'Confianca',
            'Cobertura',
            'Bloqueios',
            'Estado inconclusivo',
            'Suporte limitado',
            'Validacao',
            'Aviso sem overclaim',
        ]) {
            expect(markup).toContain(label);
        }

        expect(markup).toContain('81%');
        expect(markup).toContain('77%');
        expect(markup).toContain('compatible_validation_pending');
        expect(markup).toContain('Evidencia orienta treino');
    });

    it('separates technical evidence, training execution, practical transfer, compatible validation, blockers, repairs, and current state', () => {
        const markup = renderDetail();

        expect(markup).toContain('Analise base');
        expect(markup).toContain('Spray Lab executado');
        expect(markup).toContain('Transferencia pratica');
        expect(markup).toContain('Validacao compativel');
        expect(markup).toContain('Bloqueios e limites');
        expect(markup).toContain('Reparos');
        expect(markup).toContain('Estado atual');
        expect(normalize(markup)).toContain('tdm entra como transferencia pratica');
        expect(normalize(markup)).not.toContain('tdm prova tecnica');
    });

    it('renders the report-detail Pro badge only from active-Pro truth with anti-authority copy', () => {
        const activeMarkup = renderDetail();
        const inactiveMarkup = renderDetail({
            ...createModel(),
            proBadge: {
                ...activeProBadge,
                visible: false,
            },
        });

        expect(activeMarkup).toContain('Pro: acesso aos recursos premium do Sens PUBG');
        expect(activeMarkup).toContain('data-social-pro-badge="active_pro_access"');
        expect(inactiveMarkup).not.toContain('data-social-pro-badge="active_pro_access"');
        expect(inactiveMarkup).not.toContain('Pro: acesso aos recursos premium do Sens PUBG');

        const normalized = normalize(activeMarkup);
        for (const forbidden of [
            'autoridade',
            'skill superior',
            'coach verificado',
            'certificacao',
            'pro player',
            'jogador profissional',
            'rank superior',
            'pagante e melhor',
        ]) {
            expect(normalized).not.toContain(forbidden);
        }
    });

    it('does not render account-private, payment, private reader, hidden history, raw analysis, or internal-note fields', () => {
        const markup = normalize(renderDetail());

        for (const forbidden of [
            'reader@example.com',
            'payment_state',
            'paid',
            'private_reader',
            'historico oculto',
            'private raw trajectory',
            'raw_private_analysis',
            'internal_notes',
            'private coach note',
            'sensibilidade perfeita garantida',
            'rank garantido',
            'pubg oficial',
            'krafton',
        ]) {
            expect(markup).not.toContain(forbidden);
        }
    });
});
