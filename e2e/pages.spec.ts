/**
 * E2E: Navigation & Page Loading
 * Verifica que todas as paginas carregam corretamente.
 */

import { test, expect } from '@playwright/test';

test.describe('Page Loading', () => {
    test('landing page loads with hero section', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/PUBG Aim Analyzer/);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText(/Come.*Anal/i)).toBeVisible();
    });

    test('login page shows auth providers', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/Entrar/);
        await expect(page.getByText('Continuar com Google')).toBeVisible();
        await expect(page.getByText('Continuar com Discord')).toBeVisible();
    });

    test('analyze page loads with a valid primary flow', async ({ page }) => {
        await page.goto('/analyze');
        await expect(page).toHaveTitle(/Analisar/);
        await expect(
            page
                .getByText(/solte seu clip/i)
                .or(page.getByRole('link', { name: /iniciar assistente de setup/i }))
        ).toBeVisible();
    });

    test('header has navigation links', async ({ page }) => {
        await page.goto('/');
        const nav = page.getByRole('navigation', { name: /navega/i });
        await expect(nav.locator('a[href="/analyze"]')).toBeVisible();
        await expect(nav.locator('a[href="/history"]')).toBeVisible();
        await expect(nav.locator('a[href="/profile"]')).toBeVisible();
    });

    test('header shows ENTRAR button when not logged in', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    });
});
