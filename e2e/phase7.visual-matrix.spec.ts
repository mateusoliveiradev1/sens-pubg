import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { hasPhase7AuthSecret, seedPhase7HistoryFixture, signInAsPhase7User } from './phase7-fixtures';

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

async function expectRoute(page: Page, path: string, target: Locator, screenshotPath: string) {
    await page.goto(path);
    await expect(target).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
        fullPage: true,
        path: screenshotPath,
    });
}

async function expectCanvasHasPixels(page: Page) {
    await expect.poll(async () => {
        return page.locator('[data-spray-trail-panel] canvas').evaluateAll((canvases) => canvases.every((canvas) => {
            const sprayCanvas = canvas as HTMLCanvasElement;
            const context = sprayCanvas.getContext('2d');
            if (!context) {
                return false;
            }

            const imageData = context.getImageData(0, 0, sprayCanvas.width, sprayCanvas.height).data;
            for (let index = 3; index < imageData.length; index += 16) {
                if (imageData[index] > 0) {
                    return true;
                }
            }

            return false;
        }));
    }).toBe(true);
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 7 final visual matrix ${label}`, () => {
        test.use({ viewport });

        test('captures required public routes and checkout cancel', async ({ page }) => {
            await expectRoute(
                page,
                '/',
                page.getByRole('heading', { level: 1, name: 'Sens PUBG' }),
                `test-results/phase7-route-home-${label}.png`,
            );
            await expectRoute(
                page,
                '/analyze',
                page.getByRole('heading', { name: /Analisar|setup|clip/i }).first(),
                `test-results/phase7-route-analyze-${label}.png`,
            );
            await expectRoute(
                page,
                '/dashboard',
                page.getByRole('heading', { name: /Dashboard de performance|Nenhuma linha ativa ainda/i }),
                `test-results/phase7-route-dashboard-${label}.png`,
            );
            await expectRoute(
                page,
                '/pricing',
                page.getByRole('heading', { name: /Treine o proximo spray/i }),
                `test-results/phase7-route-pricing-${label}.png`,
            );
            await expectRoute(
                page,
                '/checkout/cancel',
                page.getByRole('heading', { name: /Nada foi alterado no seu historico/i }),
                `test-results/phase7-route-checkout-cancel-${label}.png`,
            );
        });

        test('captures authenticated billing, checkout success, and history detail routes', async ({ page }) => {
            test.skip(!hasPhase7AuthSecret, 'AUTH_SECRET is required for authenticated Phase 7 final route screenshots.');

            const fixture = await seedPhase7HistoryFixture();

            try {
                await signInAsPhase7User(page, fixture.user);
                await expectRoute(
                    page,
                    '/history',
                    page.getByRole('heading', { name: /Historico de Analises/i }),
                    `test-results/phase7-route-history-${label}.png`,
                );
                await expectRoute(
                    page,
                    '/billing',
                    page.getByRole('heading', { name: /Seu acesso Sens PUBG/i }),
                    `test-results/phase7-route-billing-${label}.png`,
                );
                await expectRoute(
                    page,
                    '/checkout/success?session_id=cs_phase7_visual_final',
                    page.getByRole('heading', { name: /Pagamento recebido, aguardando webhook/i }),
                    `test-results/phase7-route-checkout-success-${label}.png`,
                );
                await expectRoute(
                    page,
                    `/history/${fixture.sessionId}`,
                    page.getByRole('heading', { name: /beryl-m762/i }),
                    `test-results/phase7-route-history-detail-${label}.png`,
                );
            } finally {
                await fixture.cleanup();
            }
        });

        test('captures spray, weapon, and product state visual matrices', async ({ page }) => {
            await page.goto('/visual/phase7-analysis');
            await expect(page.locator('[data-spray-trail-case]')).toHaveCount(4);
            await expect(page.locator('[data-spray-trail-case="weak"] [data-spray-trail-panel][data-evidence-state="blocked"]')).toBeVisible();
            await expect(page.locator('[data-spray-trail-case="reference-unavailable"] [data-reference-unavailable]')).toBeVisible();
            await expectCanvasHasPixels(page);
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-spray-states-${label}.png`,
            });

            await page.goto('/visual/phase7-weapon-icons');
            await expect(page.locator('[data-weapon-grid-card]')).toHaveCount(29);
            await expect(page.locator('[data-weapon-grid-card][data-silhouette-id*="fallback"]')).toHaveCount(0);
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-weapon-grid-${label}.png`,
            });

            await page.goto('/visual/phase7-state-matrix');
            await expect(page.locator('[data-phase7-state-card]')).toHaveCount(15);
            await expect(page.locator('[data-phase7-lock-card]')).toHaveCount(4);
            await expect(page.locator('[data-phase7-state-card="weak-evidence"]')).toBeVisible();
            await expect(page.locator('[data-phase7-state-card="inconclusive"]')).toBeVisible();
            await expect(page.locator('[data-phase7-state-card="loading"]')).toBeVisible();
            await expect(page.locator('[data-phase7-state-card="error"]')).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-state-matrix-${label}.png`,
            });
        });
    });
}
