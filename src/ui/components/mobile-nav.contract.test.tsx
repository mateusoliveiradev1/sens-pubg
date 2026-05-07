import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/ui/components/mobile-nav.tsx'), 'utf8');
const stylesSource = readFileSync(join(process.cwd(), 'src/ui/components/mobile-nav.module.css'), 'utf8');

describe('mobile navigation contract', () => {
    it('exposes paid route visibility and separates Sens dos Pros from paid plans', () => {
        expect(source).toContain("href: '/pricing'");
        expect(source).toContain("label: 'Planos'");
        expect(source).toContain("href: '/billing'");
        expect(source).toContain("label: 'Assinatura'");
        expect(source).toContain("href: '/pros'");
        expect(source).toContain("label: 'Sens dos Pros'");
        expect(source).not.toMatch(/label:\s*'Pro'|label:\s*'Pros'/);
        expect(source).not.toMatch(/localStorage|isPro|pro_active/);
    });

    it('uses local SVG glyphs and keeps touch targets at least 48px', () => {
        expect(source).toContain('<svg');
        expect(source).not.toMatch(/[🎯📊🌐🕰️🛡️]/u);
        expect(stylesSource).toContain('width: var(--spacing-2xl)');
        expect(stylesSource).toContain('min-height: var(--spacing-2xl)');
    });
});
