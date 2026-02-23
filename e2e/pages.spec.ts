/**
 * E2E: Navigation & Page Loading
 * Verifica que todas as páginas carregam corretamente.
 */

import { test, expect } from '@playwright/test';

test.describe('Page Loading', () => {
    test('landing page loads with hero section', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/PUBG Aim Analyzer/);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText('Começar Análise')).toBeVisible();
    });

    test('login page shows auth providers', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/Entrar/);
        await expect(page.getByText('Continuar com Google')).toBeVisible();
        await expect(page.getByText('Continuar com Discord')).toBeVisible();
    });

    test('analyze page loads with dropzone', async ({ page }) => {
        await page.goto('/analyze');
        await expect(page).toHaveTitle(/Analisar/);
        await expect(page.getByText(/solte seu clip/i)).toBeVisible();
    });

    test('header has navigation links', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Analisar' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Histórico' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Perfil' })).toBeVisible();
    });

    test('header shows ENTRAR button when not logged in', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    });
});
