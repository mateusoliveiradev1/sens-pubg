/**
 * Coach Engine — Gera feedback personalizado baseado nos diagnósticos.
 * Cada diagnóstico → feedback com: what, why, fix, test, adaptation time.
 */

import type { Diagnosis, CoachFeedback } from '@/types/engine';

// ═══════════════════════════════════════════
// Adaptation Time Estimator
// ═══════════════════════════════════════════

function estimateAdaptationDays(severity: number): number {
    // Higher severity = more time to adapt
    switch (severity) {
        case 1: return 1;
        case 2: return 2;
        case 3: return 3;
        case 4: return 5;
        case 5: return 7;
        default: return 3;
    }
}

// ═══════════════════════════════════════════
// Testing Instructions
// ═══════════════════════════════════════════

const TEST_INSTRUCTIONS: Record<string, string> = {
    overpull: 'Vá ao Training Mode, pegue a arma que analisou e faça 10 sprays de 15 balas em parede a ~30m. O spray deve manter a posição inicial, sem descer abaixo do ponto de mira.',
    underpull: 'Training Mode → spray de 15 balas a ~30m. Foque em puxar o mouse para baixo de forma contínua e gradual. O spray deve ficar concentrado, não subindo.',
    late_compensation: 'Pratique sprays curtos (3-5 balas) focando em iniciar o pulldown JUNTO com o primeiro tiro. Use a cadência como referência: tiro = puxar.',
    excessive_jitter: 'Spray de 15 balas SEM tentar controlar o horizontal — foque APENAS no vertical. Depois, adicione controle horizontal gradualmente.',
    horizontal_drift: 'Fique de frente para uma parede, alinhe a mira em uma marca e faça 10 sprays. Observe se o grupo de tiros sempre pende para o mesmo lado.',
    inconsistency: 'Faça 20 sprays consecutivos com a mesma arma, mesma distância. Compare os padrões. Busque repetir o mesmo movimento toda vez.',
};

// ═══════════════════════════════════════════
// Main: Generate Coaching
// ═══════════════════════════════════════════

export function generateCoaching(diagnoses: readonly Diagnosis[]): CoachFeedback[] {
    return diagnoses.map((diagnosis): CoachFeedback => {
        const testInstructions = TEST_INSTRUCTIONS[diagnosis.type] ?? 'Repita a análise após praticar os ajustes sugeridos.';

        return {
            diagnosis,
            whatIsWrong: diagnosis.description,
            whyItHappens: diagnosis.cause,
            whatToAdjust: diagnosis.remediation,
            howToTest: testInstructions,
            adaptationTimeDays: estimateAdaptationDays(diagnosis.severity),
        };
    });
}
