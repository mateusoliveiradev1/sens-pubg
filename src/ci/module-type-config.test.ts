import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ignoredSegments = new Set(['node_modules', '.next', '.next-dev', 'out', 'coverage']);

const collectJavaScriptFiles = (directory: string): string[] => {
    const entries = readdirSync(directory);
    const files: string[] = [];

    for (const entry of entries) {
        if (ignoredSegments.has(entry)) continue;

        const fullPath = join(directory, entry);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
            files.push(...collectJavaScriptFiles(fullPath));
            continue;
        }

        if (entry.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
};

describe('module type configuration', () => {
    it('declares the package as ESM so TypeScript configs do not trigger module reparsing warnings', () => {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { type?: string };

        expect(packageJson.type).toBe('module');
    });

    it('keeps CommonJS scripts on .cjs instead of .js after enabling ESM package mode', () => {
        const commonJsPatterns = [/require\(/, /module\.exports/, /exports\./];
        const offenders = collectJavaScriptFiles(process.cwd())
            .filter((filePath) => {
                const content = readFileSync(filePath, 'utf8');
                return commonJsPatterns.some((pattern) => pattern.test(content));
            })
            .map((filePath) => relative(process.cwd(), filePath));

        expect(offenders).toEqual([]);
    });
});
