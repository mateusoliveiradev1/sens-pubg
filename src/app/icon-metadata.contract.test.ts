import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const publicPath = (...segments: readonly string[]): string => join(process.cwd(), 'public', ...segments);

function readPngDimensions(filePath: string): { readonly width: number; readonly height: number } {
    const buffer = readFileSync(filePath);

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

function readPngCornerAlpha(filePath: string): number {
    const buffer = readFileSync(filePath);
    let offset = 8;
    const idatChunks: Buffer[] = [];
    let colorType = -1;

    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;

        if (type === 'IHDR') {
            colorType = buffer.readUInt8(dataStart + 9);
        }

        if (type === 'IDAT') {
            idatChunks.push(buffer.subarray(dataStart, dataEnd));
        }

        offset = dataEnd + 4;
    }

    expect(colorType, filePath).toBe(6);

    const inflated = inflateSync(Buffer.concat(idatChunks));

    return inflated.readUInt8(4);
}

describe('Sens PUBG app icon metadata contract', () => {
    it('ships branded manifest metadata without the old product identity', () => {
        const manifest = JSON.parse(readFileSync(publicPath('manifest.json'), 'utf8')) as {
            readonly name: string;
            readonly short_name: string;
            readonly theme_color: string;
            readonly background_color: string;
            readonly icons: readonly { readonly src: string; readonly sizes: string; readonly purpose?: string }[];
        };
        const siteManifest = JSON.parse(readFileSync(publicPath('site.webmanifest'), 'utf8')) as {
            readonly name: string;
            readonly short_name: string;
            readonly theme_color: string;
            readonly background_color: string;
        };

        expect(manifest.name).toBe('Sens PUBG');
        expect(manifest.short_name).toBe('Sens PUBG');
        expect(siteManifest.name).toBe('Sens PUBG');
        expect(siteManifest.short_name).toBe('Sens PUBG');
        expect(manifest.theme_color).toBe('#f4b51f');
        expect(manifest.background_color).toBe('#08080c');
        expect(JSON.stringify(manifest)).not.toMatch(/PUBG Aim Analyzer|AimAnalyzer/);
        expect(manifest.icons.some((icon) => icon.src === '/android-chrome-512x512.png' && icon.purpose === 'any maskable')).toBe(true);
    });

    it('keeps generated icon files present at the declared sizes', () => {
        const expectedPngs = [
            ['favicon-16x16.png', 16],
            ['favicon-32x32.png', 32],
            ['apple-touch-icon.png', 180],
            ['android-chrome-192x192.png', 192],
            ['android-chrome-512x512.png', 512],
        ] as const;

        for (const [fileName, size] of expectedPngs) {
            const dimensions = readPngDimensions(publicPath(fileName));

            expect(dimensions, fileName).toEqual({ width: size, height: size });
            expect(readPngCornerAlpha(publicPath(fileName)), fileName).toBe(0);
        }

        expect(existsSync(publicPath('favicon.svg'))).toBe(true);
        expect(existsSync(publicPath('safari-pinned-tab.svg'))).toBe(true);
    });

    it('uses authored brand geometry instead of official PUBG/KRAFTON assets', () => {
        const faviconSvg = readFileSync(publicPath('favicon.svg'), 'utf8');
        const pinnedTabSvg = readFileSync(publicPath('safari-pinned-tab.svg'), 'utf8');

        expect(faviconSvg).toContain('data-brand-source="authored-sens-pubg"');
        expect(pinnedTabSvg).toContain('data-brand-source="authored-sens-pubg"');
        expect(`${faviconSvg}\n${pinnedTabSvg}`).not.toMatch(/helmet|barrel|krafton|battlegrounds|pubg\.com/i);
    });
});
