import { describe, expect, it } from 'vitest';

import {
    buildSocialProReportViewModel,
    socialProEvidenceLayerOrder,
} from './social-pro-report-view-model';

const sourceIds = {
    analysisSessionId: 'analysis-1',
    protocolRevisionId: 'protocol-1',
    sprayLabSessionId: 'lab-1',
    trainingProgramCycleId: 'cycle-1',
    validationLinkId: 'validation-1',
};

function createPublicSafeReportFixture() {
    return {
        id: 'report-1',
        visibility: 'public',
        status: 'published',
        publicSummary: {
            title: 'Beryl 3x 50m - caso de evolucao',
            whatChanged: 'Controle vertical ficou mais estavel no mesmo contexto testado.',
            nextAction: 'Continuar Ciclo Pro e gravar validacao compativel.',
        },
        honesty: {
            confidence: 0.81,
            coverage: 0.77,
            blockers: ['validacao compativel ainda pendente'],
            inconclusiveState: false,
            limitedSupport: ['um contexto de arma e distancia'],
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
                    layer: 'compatible_validation',
                    title: 'Validacao pendente',
                    summary: 'Ainda precisa clip compativel.',
                    sourceId: 'validation-1',
                },
            ],
            private_debug_payload: {
                rawTrajectory: 'private raw tracking data',
            },
        },
        ownerAccount: {
            email: 'player@example.com',
        },
        rawPrivateAnalysis: {
            trajectory: 'private raw tracking data',
        },
    };
}

describe('Social Pro report view model', () => {
    it('builds a Relatorio Pro Compartilhavel case with summary, honesty, timeline, and continuity actions', () => {
        const model = buildSocialProReportViewModel({
            report: createPublicSafeReportFixture(),
            sourceIds,
            generatedAt: '2026-05-09T12:00:00.000Z',
        });

        expect(model.reportId).toBe('report-1');
        expect(model.title).toBe('Beryl 3x 50m - caso de evolucao');
        expect(model.caseLabel).toBe('Relatorio Pro Compartilhavel');
        expect(model.publicSummary).toMatchObject({
            whatChanged: expect.stringContaining('Controle vertical'),
            nextAction: expect.stringContaining('Ciclo Pro'),
        });
        expect(model.requiredHonesty).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'confidence', visible: true }),
            expect.objectContaining({ key: 'coverage', visible: true }),
            expect.objectContaining({ key: 'blockers', visible: true }),
            expect.objectContaining({ key: 'validation_state', visible: true }),
            expect.objectContaining({ key: 'no_overclaim_disclaimer', visible: true }),
        ]));
        expect(model.continuityActions).toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: 'continue_ciclo_pro', sourceId: 'cycle-1' }),
            expect.objectContaining({ kind: 'open_spray_lab', sourceId: 'lab-1' }),
            expect.objectContaining({ kind: 'record_validation', sourceId: 'validation-1' }),
        ]));
    });

    it('distinguishes technical evidence, training execution, practical transfer, compatible validation, blockers, repairs, and current state', () => {
        const model = buildSocialProReportViewModel({
            report: createPublicSafeReportFixture(),
            sourceIds,
        });

        expect(socialProEvidenceLayerOrder).toEqual([
            'technical_evidence',
            'training_execution',
            'practical_transfer',
            'compatible_validation',
            'blockers',
            'repairs',
            'current_state',
        ]);
        expect(model.evidenceLayers.map((layer) => layer.kind)).toEqual(socialProEvidenceLayerOrder);
        expect(model.evidenceLayers.find((layer) => layer.kind === 'technical_evidence')).toMatchObject({
            sourceId: 'analysis-1',
            evidenceStrength: 'technical',
        });
        expect(model.evidenceLayers.find((layer) => layer.kind === 'practical_transfer')).toMatchObject({
            evidenceStrength: 'practical_only',
        });
        expect(model.evidenceLayers.find((layer) => layer.kind === 'blockers')?.summary).toContain('validacao compativel ainda pendente');
    });

    it('never renders raw private payloads or private account data from report input', () => {
        const model = buildSocialProReportViewModel({
            report: createPublicSafeReportFixture(),
            sourceIds,
        });
        const serialized = JSON.stringify(model).toLowerCase();

        expect(serialized).not.toContain('player@example.com');
        expect(serialized).not.toContain('private raw tracking data');
        expect(serialized).not.toContain('rawtrajectory');
        expect(serialized).toContain('confianca');
        expect(serialized).toContain('cobertura');
        expect(serialized).toContain('validacao');
    });
});
