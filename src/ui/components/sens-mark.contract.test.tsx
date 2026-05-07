import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { SensMark } from './sens-mark';

describe('SensMark contract', () => {
    it('renders an original accessible Sens PUBG precision mark', () => {
        const html = renderToStaticMarkup(<SensMark title="Marca Sens PUBG" variant="pro" />);

        expect(html).toContain('aria-label="Marca Sens PUBG"');
        expect(html).toContain('data-brand-source="authored-sens-pubg"');
        expect(html).toContain('data-part="precision-frame"');
        expect(html).toContain('data-part="s-curve"');
        expect(html).toContain('data-part="recoil-trail"');
        expect(html).toContain('data-part="crosshair"');
        expect(html).not.toMatch(/krafton|official|pubg\.com|battlegrounds/i);
    });

    it('supports compact, mono, and pro variants without hiding the SVG', () => {
        const compact = renderToStaticMarkup(<SensMark title="Marca compacta" variant="compact" />);
        const mono = renderToStaticMarkup(<SensMark title="Marca mono" variant="mono" />);

        expect(compact).toContain('<svg');
        expect(mono).toContain('<svg');
    });
});
