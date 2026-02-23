/**
 * E2E: Responsive Design
 * Verifica layout em diferentes viewports.
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = {
    mobile: { width: 375, height: 812 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
} as const;

test.describe('Responsive — Mobile', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test('landing page renders on mobile', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText('Começar Análise')).toBeVisible();
    });

    test('login page is usable on mobile', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByText('Continuar com Google')).toBeVisible();
        await expect(page.getByText('Continuar com Discord')).toBeVisible();
    });
});

test.describe('Responsive — Tablet', () => {
    test.use({ viewport: VIEWPORTS.tablet });

    test('landing page renders on tablet', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('features section renders on tablet', async ({ page }) => {
        await page.goto('/');
        const heading = page.getByRole('heading', { name: 'Como Funciona' });
        await heading.scrollIntoViewIfNeeded();
        await expect(heading).toBeVisible();
    });
});

test.describe('Responsive — Desktop', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test('landing page shows full navigation', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Analisar' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Histórico' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Perfil' })).toBeVisible();
    });

    test('hero content is visible above fold', async ({ page }) => {
        await page.goto('/');
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toBeInViewport();
    });
});
