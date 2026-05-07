import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const bannedClaims = [
    'sensibilidade perfeita',
    'melhora garantida',
    'rank garantido',
    'subir de rank',
    'certeza final',
    'pubg oficial',
    'oficial da pubg',
    'krafton oficial',
] as const;

const normalizeCopy = (copy: string): string => copy
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

async function readBodyCopy(page: Page): Promise<string> {
    return normalizeCopy(await page.locator('body').innerText());
}

async function expectNoFalsePerfectCopy(page: Page) {
    const copy = await readBodyCopy(page);

    for (const bannedClaim of bannedClaims) {
        expect(copy).not.toContain(normalizeCopy(bannedClaim));
    }
}

test.describe('Phase 7 No False Perfect browser gate', () => {
    test('mobile navigation exposes paid route and keeps Sens dos Pros separate', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');

        await page.getByRole('button', { name: /Abrir menu/i }).click();
        const menu = page.getByRole('dialog', { name: /Menu de navegacao mobile/i });
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('link', { name: 'Planos' })).toBeVisible();
        await expect(menu.getByRole('link', { name: 'Sens dos Pros' })).toBeVisible();
        await expect(menu.getByRole('link', { name: /^Pro$/i })).toHaveCount(0);

        await page.screenshot({
            fullPage: true,
            path: 'test-results/phase7-mobile-paid-nav.png',
        });
    });

    test('core public surfaces keep copy honest and evidence-forward', async ({ page }) => {
        const routes = ['/', '/pricing', '/checkout/cancel', '/visual/phase7-state-matrix'] as const;

        for (const route of routes) {
            await page.goto(route);
            await expectNoFalsePerfectCopy(page);
            const copy = await readBodyCopy(page);
            expect(copy).toMatch(/confianca|cobertura|evidencia|bloque/i);
        }
    });

    test('spray states and weapon catalog fail visibly if evidence assets are missing', async ({ page }) => {
        await page.goto('/visual/phase7-analysis');
        await expect(page.getByRole('heading', { name: 'Analysis proof surface matrix' })).toBeVisible();
        await expect(page.locator('[data-spray-trail-case]')).toHaveCount(4);
        await expect(page.locator('[data-spray-trail-case="weak"] [data-spray-trail-panel][data-evidence-state="blocked"]')).toBeVisible();
        await expect(page.locator('[data-spray-trail-case="inconclusive"] [data-spray-trail-panel][data-evidence-state="inconclusive"]')).toBeVisible();
        await expect(page.locator('[data-spray-trail-case="reference-unavailable"] [data-reference-unavailable]')).toBeVisible();

        await page.goto('/visual/phase7-weapon-icons');
        await expect(page.getByRole('heading', { name: '29 weapon visual catalog' })).toBeVisible();
        await expect(page.locator('[data-weapon-grid-card]')).toHaveCount(29);
        await expect(page.locator('[data-weapon-grid-card][data-silhouette-id*="fallback"]')).toHaveCount(0);
    });
});
