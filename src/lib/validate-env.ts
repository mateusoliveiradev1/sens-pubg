/**
 * Validate Environment — Valida todas as env vars no startup via Zod.
 * Crash early se alguma variável obrigatória estiver faltando.
 */

import { envSchema } from '@/types/schemas';

export function validateEnv(): void {
    // Só valida AUTH_SECRET em produção (dev pode ter vazio)
    const isProduction = process.env.NODE_ENV === 'production';

    const schema = isProduction
        ? envSchema
        : envSchema.partial({
            AUTH_SECRET: true,
            AUTH_DISCORD_ID: true,
            AUTH_DISCORD_SECRET: true,
            AUTH_GOOGLE_ID: true,
            AUTH_GOOGLE_SECRET: true,
        });

    const result = schema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Variáveis de ambiente inválidas:');
        for (const issue of result.error.issues) {
            console.error(`   ${issue.path.join('.')}: ${issue.message}`);
        }
        if (isProduction) {
            throw new Error('Variáveis de ambiente inválidas. Verifique o .env.local');
        }
        console.warn('⚠️ Continuando em modo desenvolvimento com env vars incompletas');
    }
}
