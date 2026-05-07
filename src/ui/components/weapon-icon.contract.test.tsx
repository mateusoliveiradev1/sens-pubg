import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WeaponIcon } from './weapon-icon';
import { weaponVisualRegistry } from './weapon-visual-registry';

describe('WeaponIcon premium catalog contract', () => {
    it('renders all 29 seed weapons with non-generic visuals and accessible labels', () => {
        for (const entry of weaponVisualRegistry) {
            const html = renderToStaticMarkup(
                <WeaponIcon
                    showStatus
                    weaponId={entry.id}
                    weaponName={entry.displayName}
                />
            );

            expect(html, entry.displayName).toContain(`data-silhouette-id="${entry.silhouetteId}"`);
            expect(html, entry.displayName).toContain(`aria-label="${entry.displayName} - `);
            expect(html, entry.displayName).toContain(
                `data-art-source="${entry.pubgApiImagePath ? 'pubg-api-assets' : 'authored-sens-pubg'}"`,
            );
            expect(html, entry.displayName).toContain('data-seed-weapon="true"');
            expect(html, entry.displayName).not.toMatch(/data-silhouette-id="fallback-|generic/i);
        }
    });

    it('supports name and id lookup aliases for route consumers', () => {
        const byName = renderToStaticMarkup(<WeaponIcon weaponName="Mk47 Mutant" />);
        const byId = renderToStaticMarkup(<WeaponIcon weaponId="mk47-mutant" />);
        const miniAlias = renderToStaticMarkup(<WeaponIcon weaponName="Mini 14" />);

        expect(byName).toContain('data-silhouette-id="mk47-mutant"');
        expect(byId).toContain('data-silhouette-id="mk47-mutant"');
        expect(miniAlias).toContain('data-silhouette-id="mini14"');
    });

    it('keeps unknown or future weapons on a premium fallback with honest visual support copy', () => {
        const html = renderToStaticMarkup(
            <WeaponIcon category="DMR" showStatus weaponName="Future Test Rifle" />
        );

        expect(html).toContain('data-seed-weapon="false"');
        expect(html).toContain('data-silhouette-id="fallback-dmr"');
        expect(html).toContain('suporte visual');
    });

    it('uses local PUBG API asset copies without hotlinking external image hosts', () => {
        const source = readFileSync(new URL('./weapon-icon.tsx', import.meta.url), 'utf8');

        expect(source).not.toMatch(/<image|href=|jpg|webp|krafton|battlegrounds|raw\.githubusercontent|pubg\.com|wiki/i);
        expect(source).toMatch(/data-art-source="pubg-api-assets"/);
        expect(source).toMatch(/data-art-source="authored-sens-pubg"/);
    });
});
