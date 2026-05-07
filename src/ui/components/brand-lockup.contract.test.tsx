import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { BrandLockup } from './brand-lockup';

describe('BrandLockup contract', () => {
    it('renders Sens PUBG as the visible wordmark with an original mark', () => {
        const html = renderToStaticMarkup(<BrandLockup href="/" variant="default" />);

        expect(html).toContain('data-wordmark="Sens PUBG"');
        expect(html).toContain('PUBG');
        expect(html).toContain('aria-label="Sens PUBG inicio"');
        expect(html).toContain('data-brand-source="authored-sens-pubg"');
        expect(html).not.toMatch(/AIMANALYZER|official PUBG|KRAFTON/i);
    });
});
