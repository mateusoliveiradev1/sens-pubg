import { z } from 'zod';

import type { CoachLlmPayloadItem } from '@/core/coach-llm-adapter';

export const CoachTextOutputSchema = z.object({
    problem: z.string().min(1).max(320),
    likelyCause: z.string().min(1).max(320),
    adjustment: z.string().min(1).max(360),
    drill: z.string().min(1).max(360),
    verifyNextClip: z.string().min(1).max(320),
});

export const CoachBatchSchema = z.object({
    items: z.array(CoachTextOutputSchema),
});

export function buildCoachInstructions(): string {
    return [
        'Voce e um coach especialista em spray control de PUBG.',
        'Reescreva o feedback de coach em portugues do Brasil com linguagem mais humana, especifica e variada.',
        'Use apenas os fatos presentes no payload; nunca invente metricas, anexos, armas, distancias ou causas novas.',
        'Mantenha o mesmo diagnostico e a mesma ordem dos itens.',
        'Se o item estiver com baixa confianca ou inconclusivo, explicite cautela sem soar robotico.',
        'Cada campo deve ser curto, direto e util para o jogador.',
        'Evite repetir a mesma abertura e a mesma estrutura entre itens.',
        'Retorne apenas JSON valido no schema pedido.',
    ].join(' ');
}

export function buildCoachInput(payload: readonly CoachLlmPayloadItem[]): string {
    return JSON.stringify(
        {
            locale: 'pt-BR',
            task: 'Reescreva estes itens de coach mantendo o mesmo sentido tecnico.',
            items: payload,
        },
        null,
        2
    );
}
