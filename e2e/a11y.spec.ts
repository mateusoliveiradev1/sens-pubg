/**
 * E2E: Accessibility
 * Verifica elementos de acessibilidade em todas as páginas.
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
    test('landing page has proper heading hierarchy', async ({ page }) => {
        await page.goto('/');
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toHaveCount(1);
    });

    test('all images have alt text', async ({ page }) => {
        await page.goto('/');
        const images = page.locator('img');
        const count = await images.count();
        for (let i = 0; i < count; i++) {
            const alt = await images.nth(i).getAttribute('alt');
            expect(alt).toBeTruthy();
        }
    });

    test('navigation has proper aria labels', async ({ page }) => {
        await page.goto('/');
        const nav = page.getByRole('navigation', { name: /navegação principal/i });
        await expect(nav).toBeVisible();
    });

    test('login buttons are focusable', async ({ page }) => {
        await page.goto('/login');
        const googleBtn = page.getByRole('button', { name: /continuar com google/i });
        await expect(googleBtn).toBeVisible();
        await googleBtn.focus();
        await expect(googleBtn).toBeFocused();
    });

    test('header has banner role', async ({ page }) => {
        await page.goto('/');
        const banner = page.getByRole('banner');
        await expect(banner).toBeVisible();
    });

    test('page has proper lang attribute', async ({ page }) => {
        await page.goto('/');
        const lang = await page.getAttribute('html', 'lang');
        expect(lang).toBeTruthy();
    });
});
