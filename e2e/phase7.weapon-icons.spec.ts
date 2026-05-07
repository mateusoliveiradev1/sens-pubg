import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const seedWeaponNames = [
    'Beryl M762',
    'M416',
    'AUG',
    'ACE32',
    'AKM',
    'SCAR-L',
    'G36C',
    'QBZ',
    'K2',
    'Groza',
    'FAMAS',
    'M16A4',
    'Mk47 Mutant',
    'UMP45',
    'Vector',
    'Micro UZI',
    'MP5K',
    'PP-19 Bizon',
    'Tommy Gun',
    'JS9',
    'P90',
    'Mini14',
    'Mk12',
    'SKS',
    'SLR',
    'Dragunov',
    'QBU',
    'VSS',
    'Mk14',
] as const;

async function expectCompleteWeaponGrid(page: Page) {
    await page.goto('/visual/phase7-weapon-icons');
    await expect(page.getByRole('heading', { name: '29 weapon visual catalog' })).toBeVisible();

    const cards = page.locator('[data-weapon-grid-card]');
    await expect(cards).toHaveCount(29);

    for (const weaponName of seedWeaponNames) {
        await expect(page.getByRole('heading', { name: weaponName })).toBeVisible();
        const card = page.locator('[data-weapon-grid-card]', { hasText: weaponName });
        await expect(card).not.toHaveAttribute('data-silhouette-id', /fallback|generic/i);
    }
}

test.describe('Phase 7 weapon icon visual matrix', () => {
    test('renders all 29 weapon visuals on desktop and captures evidence', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1200 });
        await expectCompleteWeaponGrid(page);

        await page.screenshot({
            fullPage: true,
            path: 'test-results/phase7-weapon-icons-desktop.png',
        });
    });

    test('keeps all weapon labels and status copy inside the mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 1200 });
        await expectCompleteWeaponGrid(page);

        const cards = await page.locator('[data-weapon-grid-card]').all();
        for (const card of cards) {
            const box = await card.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.x).toBeGreaterThanOrEqual(0);
            expect(box!.x + box!.width).toBeLessThanOrEqual(375);
        }

        await page.screenshot({
            fullPage: true,
            path: 'test-results/phase7-weapon-icons-mobile.png',
        });
    });
});
