import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;

async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 7 home/global ${label}`, () => {
        test.use({ viewport });

        test('home entry shows the Sens PUBG loop without horizontal overflow', async ({ page }) => {
            await page.goto('/');

            await expect(page.getByRole('heading', { level: 1, name: 'Sens PUBG' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Analisar meu spray' }).first()).toBeVisible();
            await expect(page.getByLabel('Preview do loop Sens PUBG')).toBeVisible();
            await expect(page.getByLabel('Loop Sens PUBG').first()).toBeVisible();
            await expect(page.getByText(/confianca/i).first()).toBeVisible();
            await expect(page.getByText(/cobertura/i).first()).toBeVisible();
            await expect(page.getByText(/blockers/i).first()).toBeVisible();
            await expect(page.getByText(/Proximo: loop solo/i)).toBeVisible();
            await expectNoHorizontalOverflow(page);

            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-home-${label}.png`,
            });
        });
    });
}
