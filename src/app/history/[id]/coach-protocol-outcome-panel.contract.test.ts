import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('history coach protocol outcome panel contract', () => {
    it('renders all structured outcome options and records through the coach outcome action', () => {
        const source = readFileSync(new URL('./coach-protocol-outcome-panel.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/recordCoachProtocolOutcome/);
        expect(source).toMatch(/router\.refresh\(\)/);
        expect(source).toMatch(/Comecei o bloco/);
        expect(source).toMatch(/Completei sem medir/);
        expect(source).toMatch(/Melhorou no treino/);
        expect(source).toMatch(/Ficou igual/);
        expect(source).toMatch(/Piorou no treino/);
        expect(source).toMatch(/Captura invalida/);
        expect(source).toMatch(/fatigue_or_pain/);
        expect(source).toMatch(/confused/);
        expect(source).toMatch(/variable_changed/);
        expect(source).toMatch(/Registrar resultado do bloco/);
        expect(source).toMatch(/Registrando resultado\.\.\./);
    });

    it('requires invalid capture reasons and shows the compatible validation receipt', () => {
        const source = readFileSync(new URL('./coach-protocol-outcome-panel.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/selectedStatus === 'invalid_capture'/);
        expect(source).toMatch(/Escolha ao menos um motivo para captura invalida/);
        expect(source).toMatch(/Qualidade da captura/);
        expect(source).toMatch(/Contexto incompativel/);
        expect(source).toMatch(/Execucao ruim/);
        expect(source).toMatch(/Variavel alterada/);
        expect(source).toMatch(/Protocolo confuso/);
        expect(source).toMatch(/Dor\/fadiga/);
        expect(source).toMatch(/Outro motivo/);
        expect(source).toMatch(/Gravar validacao compativel/);
        expect(source).toMatch(/\/spray-lab\?sourceSessionId=/);
        expect(source).toMatch(/encodeURIComponent\(sessionId\)/);
        expect(source).toMatch(/aria-live="polite"/);
    });

    it('adds Phase 8 repair, compatible validation, and transfer cards without unsafe pain copy', () => {
        const source = readFileSync(new URL('./coach-protocol-outcome-panel.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/recordTrainingProtocolTransfer/);
        expect(source).toMatch(/Resultado do bloco/);
        expect(source).toMatch(/Grave o proximo clip assim/);
        expect(source).toMatch(/Transferencia em partida\/TDM/);
        expect(source).toMatch(/Registrar transferencia/);
        expect(source).toMatch(/Transferencia registrada/);
        expect(source).toMatch(/dor, formigamento ou dormencia interrompe o bloco/);
        expect(source).toMatch(/sensitivity, grip, muzzle, optic, distance, stance, weapon ou preparation/);
        expect(source).not.toMatch(/continue com dor|continuar com dor|continue apesar da dor/i);
    });

    it('keeps corrections append-only through auditable revisions', () => {
        const source = readFileSync(new URL('./coach-protocol-outcome-panel.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Corrigir resultado e manter revisao auditavel/);
        expect(source).toMatch(/revisionOfOutcomeId: latestOutcome\.id/);
        expect(source).not.toMatch(/deleteCoachProtocolOutcome|removeCoachProtocolOutcome/);
    });

    it('mounts the coach protocol panel on saved analysis detail and avoids duplicate competing CTAs', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getCoachProtocolOutcomesForSession/);
        expect(source).toMatch(/CoachProtocolOutcomePanel/);
        expect(source).toMatch(/PageCommandHeader/);
        expect(source).toMatch(/LoopRail/);
        expect(source).toMatch(/MetricTile/);
        expect(source).toMatch(/EvidenceChip/);
        expect(source).toMatch(/Header/);
        expect(source).toMatch(/Navegacao da analise/);
        expect(source).toMatch(/Analise salva/);
        expect(source).toMatch(/Resultado completo do clip salvo/);
        expect(source).toMatch(/mode="audit-detail"/);
        expect(source).toMatch(/coachOutcomeSnapshot: buildHistoryCoachOutcomeSnapshot/);
        expect(source).toMatch(/analysisResult\.coachPlan \? \(/);
        expect(source).toMatch(/SensitivityAcceptancePanel/);
        expect(source).toMatch(/Registrar resultado/);
        expect(source).toMatch(/Registrar transferencia/);
        expect(source).toMatch(/Revisar protocolo/);
        expect(source).not.toMatch(/<span>\{'<-'\}<\/span> Voltar/);
    });
});
