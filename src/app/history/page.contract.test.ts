import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('history page field evolution contract', () => {
    it('renders weapon icons and field feedback summaries instead of weapon emojis', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/WeaponIcon/);
        expect(source).toMatch(/acceptanceFeedback/);
        expect(source).toMatch(/Leitura de campo/);
        expect(source).toMatch(/Aguardando teste real/);
        expect(source).not.toMatch(/🔫|🎯/);
    });
    it('exposes a minimal coach plan summary on the history detail page when hydrated', () => {
        const source = readFileSync(new URL('./[id]/page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/analysisResult\.coachPlan \?/);
        expect(source).toMatch(/Coach da sessao salva/);
        expect(source).toMatch(/analysisResult\.coachPlan\.sessionSummary/);
        expect(source).toMatch(/analysisResult\.coachPlan\.primaryFocus\.title/);
        expect(source).toMatch(/analysisResult\.coachPlan\.nextBlock\.title/);
        expect(source).toMatch(/<ResultsDashboard result=\{analysisResult\} \/>/);
    });
});
