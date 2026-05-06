import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('header monetization CTA contract', () => {
    it('exposes Pro pricing and billing routes without local entitlement state', () => {
        const source = readFileSync(join(process.cwd(), 'src/ui/components/header.tsx'), 'utf8');

        expect(source).toContain('href="/pricing"');
        expect(source).toContain('href="/billing"');
        expect(source).not.toMatch(/localStorage|isPro|pro_active/);
    });
});
