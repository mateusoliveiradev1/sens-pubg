import type { Diagnosis, CoachFeedback, WeaponLoadout } from '@/types/engine';

// ═══════════════════════════════════════════
// PUBG Mechanics Constants
// ═══════════════════════════════════════════

const ATTACHMENTS = {
    vertical: { name: 'Vertical Grip', bonus: 'Reduz o recuo vertical em 15%. Ideal para quem tem dificuldades com pulldown.' },
    half: { name: 'Halfgrip', bonus: 'Reduz recuo vertical e horizontal em 8%, aumenta estabilidade. Melhor custo-benefício para sprays longos.' },
    angled: { name: 'Angled Grip', bonus: 'Reduz recuo horizontal em 15% e aumenta velocidade de ADS. Essencial para corrigir Drifts laterais.' },
    thumb: { name: 'Thumb Grip', bonus: 'Aumenta muito a velocidade de ADS e reduz levemente o recuo vertical inicial.' },
    lightweight: { name: 'Lightweight Grip', bonus: 'Reduz o "kick" do primeiro tiro e melhora a recuperação de mira. Ótimo para Taps e Rajadas.' },
    compensator: { name: 'Compensador', bonus: 'O item mais importante. Reduz o padrão de recuo em 25%.' },
} as const;

const DRILLS: Record<string, string> = {
    overpull: '**O Drill da Janela (30m)**: Vá ao Training Mode e escolha uma janela pequena. Faça sprays de 10 balas focando em manter TODO o spray dentro do buraco, sem deixar a mira descer. Se a mira descer, sua mão está sendo "pesada" demais.',
    underpull: '**Drill de Pulldown Gradual**: Atire em uma parede limpa a 50m. Tente fazer um "ponto" de impactos. Se o spray subir, force o mouse para baixo de forma contínua, não apenas no início.',
    late_compensation: '**The Flash Pull**: Foque no SOM do primeiro tiro. O movimento de descida do mouse deve iniciar EXATAMENTE junto com o áudio do disparo. Pratique sprays de 3 balas resetando a mira rapidamente.',
    excessive_jitter: '**Drill Vertical Puro**: Faça sprays ignorando o horizontal. Deixe a mira balançar para os lados, mas mantenha a altura PERFEITA. Quando o vertical estiver automático, comece a pinçar o horizontal levemente.',
    horizontal_drift: '**Linha de Tracejo**: Siga uma linha vertical na parede (como a quina de um prédio) enquanto faz o spray. Se a mira fugir da linha para o mesmo lado sempre, ajuste a posição do seu braço/mousepad.',
    inconsistency: '**Drill dos 20 Sprays**: Faça 20 sprays na mesma parede. Eles devem ser gêmeos. Se cada um for diferente, foque em relaxar o braço e repetir exatamente o mesmo movimento muscular.',
};

// ═══════════════════════════════════════════
// Adaptation Time Estimator
// ═══════════════════════════════════════════

function estimateAdaptationDays(severity: number): number {
    if (severity >= 5) return 7;
    if (severity >= 4) return 5;
    if (severity >= 3) return 3;
    return 1;
}

// ═══════════════════════════════════════════
// Main: Generate Coaching
// ═══════════════════════════════════════════

export function generateCoaching(diagnoses: readonly Diagnosis[], loadout: WeaponLoadout): CoachFeedback[] {
    return diagnoses.map((diagnosis): CoachFeedback => {
        let whatToAdjust = diagnosis.remediation;
        const whyItHappens = diagnosis.cause;

        // Injetar recomendações de attachments específicas baseadas no diagnóstico e no loadout atual
        if (diagnosis.type === 'overpull') {
            if (loadout.grip !== 'lightweight') {
                whatToAdjust += ` Dica: Experimente usar o ${ATTACHMENTS.lightweight.name} para suavizar o kick inicial.`;
            }
        } else if (diagnosis.type === 'underpull') {
            const needsVert = loadout.grip !== 'vertical';
            const needsComp = loadout.muzzle !== 'compensator';

            if (needsVert && needsComp) {
                whatToAdjust += ` Dica: O ${ATTACHMENTS.vertical.name} e o ${ATTACHMENTS.compensator.name} são obrigatórios para seu caso.`;
            } else if (needsVert) {
                whatToAdjust += ` Dica: O ${ATTACHMENTS.vertical.name} é obrigatório para seu caso.`;
            } else if (needsComp) {
                whatToAdjust += ` Dica: O ${ATTACHMENTS.compensator.name} é obrigatório para seu caso.`;
            }
        } else if (diagnosis.type === 'horizontal_drift' || diagnosis.type === 'excessive_jitter') {
            if (loadout.grip !== 'angled' && loadout.grip !== 'half') {
                whatToAdjust += ` Dica: O ${ATTACHMENTS.angled.name} ou ${ATTACHMENTS.half.name} ajudarão a conter a oscilação lateral.`;
            }
        }

        // Dica de Stance (Matemática do PUBG)
        if (diagnosis.severity >= 3 && loadout.stance === 'standing') {
            whatToAdjust += ` Lembre-se: Agachar (Crouch) reduz o recuo em cerca de 20%. Use isso a seu favor em sprays longos.`;
        }

        return {
            diagnosis,
            whatIsWrong: diagnosis.description,
            whyItHappens,
            whatToAdjust,
            howToTest: DRILLS[diagnosis.type] ?? 'Pratique no Training Mode focando na consistência mecânica.',
            adaptationTimeDays: estimateAdaptationDays(diagnosis.severity),
        };
    });
}
