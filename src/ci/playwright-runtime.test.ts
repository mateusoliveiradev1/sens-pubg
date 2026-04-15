import { describe, expect, it } from 'vitest';
import { getPlaywrightRuntimeConfig } from './playwright-runtime';

describe('playwright runtime config', () => {
    it('defaults to the local dev server when no env override exists', () => {
        expect(getPlaywrightRuntimeConfig({})).toEqual({
            baseURL: 'http://localhost:3000',
            shouldStartWebServer: true,
        });
    });

    it('targets a deployed url without starting the local dev server', () => {
        expect(getPlaywrightRuntimeConfig({
            PLAYWRIGHT_BASE_URL: 'https://sens-pubg.example.com',
        })).toEqual({
            baseURL: 'https://sens-pubg.example.com',
            shouldStartWebServer: false,
        });
    });

    it('respects an explicit web server skip for smoke tests', () => {
        expect(getPlaywrightRuntimeConfig({
            PLAYWRIGHT_BASE_URL: 'http://localhost:3000',
            PLAYWRIGHT_SKIP_WEBSERVER: '1',
        })).toEqual({
            baseURL: 'http://localhost:3000',
            shouldStartWebServer: false,
        });
    });
});

