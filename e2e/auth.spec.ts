/**
 * E2E: Route Protection
 * Verifica que rotas protegidas redirecionam para login.
 */

import { test, expect } from '@playwright/test';

test.describe('Route Protection', () => {
    test('/profile redirects to /login when not authenticated', async ({ page }) => {
        await page.goto('/profile');
        await page.waitForURL('**/login**');
        expect(page.url()).toContain('/login');
        expect(page.url()).toContain('callbackUrl=%2Fprofile');
    });

    test('/history redirects to /login when not authenticated', async ({ page }) => {
        await page.goto('/history');
        await page.waitForURL('**/login**');
        expect(page.url()).toContain('/login');
        expect(page.url()).toContain('callbackUrl=%2Fhistory');
    });

    test('/analyze is accessible without authentication', async ({ page }) => {
        await page.goto('/analyze');
        await expect(page).toHaveTitle(/Analisar/);
        expect(page.url()).toContain('/analyze');
    });

    test('login page is accessible without authentication', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/Entrar/);
        expect(page.url()).toContain('/login');
    });
});
