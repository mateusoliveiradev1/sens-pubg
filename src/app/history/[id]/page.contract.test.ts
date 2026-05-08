import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('history detail Ciclo Pro audit contract', () => {
    it('renders program audit from persisted cycle snapshots without claiming technical proof too early', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/trainingProgramCycles/);
        expect(source).toMatch(/buildTrainingProgramAuditViewModel/);
        expect(source).toMatch(/id="history-training-program-audit"/);
        expect(source).toMatch(/Auditoria do Ciclo Pro/);
        expect(source).toMatch(/Contexto estrito/);
        expect(source).toMatch(/Checkpoints semanais operacionais/);
        expect(source).toMatch(/Checkpoint tecnico validado/);
        expect(source).toMatch(/Checkpoint tecnico pendente/);
        expect(source).toMatch(/Checkpoint mensal/);
        expect(source).toMatch(/nao classifica jogador/);
        expect(source).toMatch(/Missoes, outcomes e motivos/);
        expect(source).toMatch(/Reparos, reentrada e reinicio de linha/);
        expect(source).toMatch(/Spray Lab relacionado/);
        expect(source).toMatch(/Clips de validacao Analyze/);
        expect(source).toMatch(/Voltar para o Ciclo Pro/);
    });
});
