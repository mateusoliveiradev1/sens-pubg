import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const visualCases = ['normal', 'weak', 'inconclusive', 'reference-unavailable'] as const;

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

async function expectVisualMatrix(page: Page, viewportWidth: number) {
    await page.goto('/visual/phase7-analysis');
    await expect(page.getByRole('heading', { name: 'Analysis proof surface matrix' })).toBeVisible();

    for (const visualCase of visualCases) {
        const panel = page.locator(`[data-spray-trail-case="${visualCase}"] [data-spray-trail-panel]`);
        await expect(panel).toBeVisible();

        const box = await panel.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
    }

    await expect(page.locator('[data-spray-trail-case="weak"] [data-spray-trail-panel][data-evidence-state="blocked"]')).toBeVisible();
    await expect(page.locator('[data-spray-trail-case="inconclusive"] [data-spray-trail-panel][data-evidence-state="inconclusive"]')).toBeVisible();
    await expect(page.locator('[data-spray-trail-case="reference-unavailable"] [data-reference-state="unavailable"]')).toBeVisible();
    await expect(page.locator('[data-spray-trail-case="reference-unavailable"] [data-reference-unavailable]')).toBeVisible();
    await expectCanvasHasPixels(page);
}

test.describe('Phase 7 analysis proof surface', () => {
    test('captures normal, weak, inconclusive, and reference-unavailable states on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1600 });
        await expectVisualMatrix(page, 1440);

        await page.screenshot({
            fullPage: true,
            path: 'test-results/phase7-analysis-spray-proof-desktop.png',
        });
    });

    test('keeps spray proof states inside a mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 1600 });
        await expectVisualMatrix(page, 390);

        await page.screenshot({
            fullPage: true,
            path: 'test-results/phase7-analysis-spray-proof-mobile.png',
        });
    });
});
