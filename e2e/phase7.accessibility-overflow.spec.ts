import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;

const ROUTES = [
    '/',
    '/analyze',
    '/dashboard',
    '/history',
    '/pricing',
    '/checkout/cancel',
    '/visual/phase7-analysis',
    '/visual/phase7-weapon-icons',
    '/visual/phase7-state-matrix',
] as const;

async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

async function expectInteractiveControlsHaveNames(page: Page) {
    const unnamed = await page.locator('a, button, input, select, textarea, [role="button"]').evaluateAll((elements) => {
        return elements
            .filter((element) => {
                const style = window.getComputedStyle(element);
                const input = element as HTMLInputElement;

                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && element.getAttribute('aria-hidden') !== 'true'
                    && input.type !== 'hidden';
            })
            .filter((element) => {
                const input = element as HTMLInputElement;
                const name = element.getAttribute('aria-label')
                    || element.getAttribute('title')
                    || element.textContent
                    || input.value
                    || input.placeholder;

                return !name?.trim();
            })
            .map((element) => element.outerHTML.slice(0, 120));
    });

    expect(unnamed).toEqual([]);
}

async function expectFocusableControl(page: Page) {
    const firstControl = page.locator('a[href], button:not([disabled]), input:not([disabled]), [role="button"]').first();
    await expect(firstControl).toBeVisible();
    await firstControl.focus();
    await expect(firstControl).toBeFocused();
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 7 accessibility and overflow ${label}`, () => {
        test.use({ viewport });

        for (const route of ROUTES) {
            test(`${route} has no horizontal overflow and named controls`, async ({ page }) => {
                await page.goto(route);
                await expect(page.locator('main, [role="main"]').first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await expectInteractiveControlsHaveNames(page);
                await expectFocusableControl(page);
            });
        }
    });
}
