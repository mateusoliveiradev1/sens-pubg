import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('history page field evolution contract', () => {
    it('renders weapon icons and field feedback summaries instead of weapon emojis', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/WeaponIcon/);
        expect(source).toMatch(/weaponId=\{session\.weaponId\}/);
        expect(source).toMatch(/weaponName=\{weaponName\}/);
        expect(source).toMatch(/showStatus/);
        expect(source).toMatch(/acceptanceFeedback/);
        expect(source).toMatch(/Leitura de campo/);
        expect(source).toMatch(/Aguardando teste real/);
        expect(source).not.toMatch(/\uD83D\uDD2B|\uD83C\uDFAF/);
    });

    it('renders compatible precision groups, blocker reasons, and checkpoint timelines', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getPrecisionHistoryLines/);
        expect(source).toMatch(/PageCommandHeader/);
        expect(source).toMatch(/LoopRail/);
        expect(source).toMatch(/EvidenceChip/);
        expect(source).toMatch(/MetricTile/);
        expect(source).toMatch(/Evolucao de precisao/);
        expect(source).toMatch(/Linhas compativeis e checkpoints/);
        expect(source).toMatch(/Gravar validacao compativel/);
        expect(source).toMatch(/formatVariableInTest/);
        expect(source).toMatch(/line\.blockerReasons/);
        expect(source).toMatch(/selectedLine\.checkpoints\.map/);
        expect(source).toMatch(/href=\{`\/history\?line=\$\{line\.id\}`\}/);
    });

    it('renders mobile-safe audit cards with evidence, checkpoints, one action, and Pro depth preview', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/gridTemplateColumns: 'repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)'/);
        expect(source).toMatch(/evidenceSummary/);
        expect(source).toMatch(/label="Confianca"/);
        expect(source).toMatch(/label="Cobertura"/);
        expect(source).toMatch(/label="Bloqueadores"/);
        expect(source).toMatch(/label="Checkpoint"/);
        expect(source).toMatch(/sessionActionLabel/);
        expect(source).toMatch(/Abrir auditoria/);
        expect(source).toMatch(/ProLockPreview/);
        expect(source).toMatch(/historyDepthLock/);
        expect(source).toMatch(/featureKey === 'history\.full'/);
        expect(source).toMatch(/canSeeFullHistory/);
        expect(source).toMatch(/Historico recente visivel/);
        expect(source).toMatch(/Salvar analise util/);
    });

    it('exposes a minimal coach plan summary on the history detail page when hydrated', () => {
        const source = readFileSync(new URL('./[id]/page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/analysisResult\.coachPlan \?/);
        expect(source).toMatch(/Coach da sessao salva/);
        expect(source).toMatch(/PageCommandHeader/);
        expect(source).toMatch(/LoopRail/);
        expect(source).toMatch(/MetricTile/);
        expect(source).toMatch(/EvidenceChip/);
        expect(source).toMatch(/Header/);
        expect(source).toMatch(/Navegacao da analise/);
        expect(source).toMatch(/Analise salva/);
        expect(source).toMatch(/resolveDetailLoopStage/);
        expect(source).toMatch(/analysisResult\.coachPlan\.sessionSummary/);
        expect(source).toMatch(/analysisResult\.coachPlan\.primaryFocus\.title/);
        expect(source).toMatch(/analysisResult\.coachPlan\.nextBlock\.title/);
        expect(source).toMatch(/<ResultsDashboard result=\{analysisResultForDisplay\} \/>/);
    });

    it('shows coach outcome chips on history cards and full audit detail', () => {
        const listSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const detailSource = readFileSync(new URL('./[id]/page.tsx', import.meta.url), 'utf8');

        expect(listSource).toMatch(/coachOutcomeStatus/);
        expect(listSource).toMatch(/Coach: \{session\.coachOutcomeStatus\.label\}/);
        expect(listSource).toMatch(/Ver auditoria do coach/);

        expect(detailSource).toMatch(/Auditoria do coach/);
        expect(detailSource).toMatch(/id="coach-outcome-panel"/);
        expect(detailSource).toMatch(/id="sensitivity-feedback"/);
        expect(detailSource).toMatch(/coachDecisionSnapshot/);
        expect(detailSource).toMatch(/coachProtocolOutcomes\.map/);
        expect(detailSource).toMatch(/Linha de outcomes e revisoes/);
        expect(detailSource).toMatch(/Conflito:/);
        expect(detailSource).toMatch(/Clips compativeis/);
    });

    it('shows precision checkpoint context on the history detail page', () => {
        const source = readFileSync(new URL('./[id]/page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/precisionCheckpoints/);
        expect(source).toMatch(/Checkpoint de precisao/);
        expect(source).toMatch(/precisionLineContextLabel/);
        expect(source).toMatch(/precisionVariableLabel/);
        expect(source).toMatch(/checkpointNextValidation/);
        expect(source).toMatch(/checkpointBlockers/);
        expect(source).toMatch(/Abrir auditoria da linha/);
    });
});
