/**
 * Rate Limiter — Token bucket algorithm (in-memory).
 * Sem dependências externas. IP-based, 60 req/min padrão.
 */

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
}

interface RateLimitConfig {
    readonly maxTokens: number;
    readonly refillRate: number;    // tokens por segundo
    readonly windowMs: number;      // janela em ms
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxTokens: 60,
    refillRate: 1,      // 1 token/segundo = 60/min
    windowMs: 60_000,   // 1 minuto
} as const;

const store = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas a cada 5 minutos
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (now - entry.lastRefill > DEFAULT_CONFIG.windowMs * 2) {
                store.delete(key);
            }
        }
    }, 300_000);
}

export interface RateLimitResult {
    readonly success: boolean;
    readonly remaining: number;
    readonly resetMs: number;
}

export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
    const now = Date.now();
    let entry = store.get(identifier);

    if (!entry) {
        entry = { tokens: config.maxTokens, lastRefill: now };
        store.set(identifier, entry);
    }

    // Refill tokens baseado no tempo decorrido
    const elapsed = (now - entry.lastRefill) / 1000;
    const refill = Math.floor(elapsed * config.refillRate);
    if (refill > 0) {
        entry.tokens = Math.min(config.maxTokens, entry.tokens + refill);
        entry.lastRefill = now;
    }

    // Verificar se tem tokens disponíveis
    if (entry.tokens > 0) {
        entry.tokens -= 1;
        return {
            success: true,
            remaining: entry.tokens,
            resetMs: Math.ceil((1 / config.refillRate) * 1000),
        };
    }

    return {
        success: false,
        remaining: 0,
        resetMs: Math.ceil(((1 - (elapsed % (1 / config.refillRate))) * 1000)),
    };
}

/** Config para rotas de upload (mais restritivo) */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
    maxTokens: 10,
    refillRate: 0.167,   // 10 por minuto
    windowMs: 60_000,
} as const;

/** Config para rotas de auth (proteção contra brute-force) */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
    maxTokens: 5,
    refillRate: 0.083,   // 5 por minuto
    windowMs: 60_000,
} as const;
