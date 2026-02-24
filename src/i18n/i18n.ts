/**
 * i18n — Sistema de internacionalização.
 * PT-BR padrão, suporte para EN e ES.
 */

export type Locale = 'pt-BR' | 'en' | 'es';

export const defaultLocale: Locale = 'pt-BR';
export const locales: readonly Locale[] = ['pt-BR', 'en', 'es'] as const;

type TranslationValue = string | Record<string, string>;
export type TranslationKeys = keyof typeof import('./pt-BR').default;

let currentLocale: Locale = defaultLocale;
let currentTranslations: Record<string, TranslationValue> = {};

export async function setLocale(locale: Locale): Promise<void> {
    currentLocale = locale;
    switch (locale) {
        case 'pt-BR':
            currentTranslations = (await import('./pt-BR')).default;
            break;
        case 'en':
            currentTranslations = (await import('./en')).default;
            break;
        case 'es':
            currentTranslations = (await import('./es')).default;
            break;
    }
}

export function t(key: TranslationKeys, params?: Record<string, string | number>): string {
    const value = currentTranslations[key as string];
    if (value === undefined) {
        console.warn(`[i18n] Chave não encontrada: "${key}" no locale "${currentLocale}"`);
        return key as string;
    }

    if (typeof value !== 'string') {
        return key;
    }

    if (!params) return value;

    return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey: string) => {
        const replacement = params[paramKey];
        return replacement !== undefined ? String(replacement) : `{{${paramKey}}}`;
    });
}

export function getLocale(): Locale {
    return currentLocale;
}

export function detectLocale(): Locale {
    if (typeof window === 'undefined') return defaultLocale;

    const saved = localStorage.getItem('locale');
    if (saved && locales.includes(saved as Locale)) return saved as Locale;

    const browserLang = navigator.language;
    if (browserLang.startsWith('pt')) return 'pt-BR';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('en')) return 'en';

    return defaultLocale;
}
