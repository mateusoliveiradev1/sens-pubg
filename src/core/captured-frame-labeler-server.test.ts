import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    renderCapturedFrameLabelerHtml,
    startCapturedFrameLabelerServer,
    type CapturedFrameLabelerServerHandle,
} from '../../scripts/serve-captured-frame-labeler';
import { parseCapturedFrameLabelTemplate } from '@/types/captured-frame-labels';

const handles: CapturedFrameLabelerServerHandle[] = [];

const createWorkspace = async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'sens-pubg-labeler-'));
    const labelsDir = path.join(rootDir, 'labels');
    const mediaDir = path.join(rootDir, 'media');
    const templatePath = path.join(labelsDir, 'clip-a.frames.todo.json');

    await writeFile(path.join(mediaDir, '.keep'), '', 'utf8').catch(async () => {
        await import('node:fs/promises').then(({ mkdir }) => mkdir(mediaDir, { recursive: true }));
        await writeFile(path.join(mediaDir, '.keep'), '', 'utf8');
    });
    await writeFile(path.join(mediaDir, 'clip-a.mp4'), 'fake-video', 'utf8');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(labelsDir, { recursive: true }));
    await writeFile(
        templatePath,
        JSON.stringify({
            schemaVersion: 1,
            clipId: 'clip-a',
            sourceVideoPath: 'media/clip-a.mp4',
            createdAt: '2026-04-14T20:00:00.000Z',
            sampleIntervalSeconds: 1,
            frameSize: { width: 640, height: 360 },
            frames: [
                {
                    frameIndex: 0,
                    timestampSeconds: 0,
                    label: { status: null, x: null, y: null },
                },
                {
                    frameIndex: 60,
                    timestampSeconds: 1,
                    label: { status: null, x: null, y: null },
                },
            ],
        }, null, 2),
        'utf8',
    );

    return { rootDir, labelsDir, templatePath };
};

const readJson = async (response: Response): Promise<unknown> => response.json();

describe('captured frame labeler server', () => {
    afterEach(async () => {
        await Promise.all(handles.splice(0).map((handle) => handle.close()));
    });

    it('lists templates, serves a template, and persists valid frame annotations', async () => {
        const workspace = await createWorkspace();
        const handle = await startCapturedFrameLabelerServer({
            labelsDir: workspace.labelsDir,
            rootDir: workspace.rootDir,
            port: 0,
        });
        handles.push(handle);

        const listResponse = await fetch(`${handle.url}/api/templates`);
        const list = await readJson(listResponse) as {
            readonly templates: readonly {
                readonly clipId: string;
                readonly fileName: string;
                readonly mediaUrl: string;
                readonly summary: { readonly totalFrames: number; readonly missingFrameCount: number };
            }[];
        };

        expect(listResponse.status).toBe(200);
        expect(list.templates).toEqual([
            {
                clipId: 'clip-a',
                fileName: 'clip-a.frames.todo.json',
                mediaUrl: '/media/clip-a',
                summary: {
                    totalFrames: 2,
                    missingFrameCount: 2,
                },
            },
        ]);

        const templateResponse = await fetch(`${handle.url}/api/templates/clip-a`);
        const templatePayload = await readJson(templateResponse) as {
            readonly template: ReturnType<typeof parseCapturedFrameLabelTemplate>;
        };
        const updatedTemplate = {
            ...templatePayload.template,
            frames: [
                {
                    ...templatePayload.template.frames[0]!,
                    label: { status: 'tracked' as const, x: 320, y: 180 },
                },
                {
                    ...templatePayload.template.frames[1]!,
                    label: { status: 'occluded' as const, x: null, y: null },
                },
            ],
        };

        const saveResponse = await fetch(`${handle.url}/api/templates/clip-a`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(updatedTemplate),
        });
        const savedPayload = await readJson(saveResponse) as {
            readonly summary: { readonly readyFrameCount: number; readonly missingFrameCount: number };
        };
        const savedTemplate = parseCapturedFrameLabelTemplate(JSON.parse(await readFile(workspace.templatePath, 'utf8')));

        expect(saveResponse.status).toBe(200);
        expect(savedPayload.summary).toMatchObject({ readyFrameCount: 2, missingFrameCount: 0 });
        expect(savedTemplate.frames[0]?.label).toEqual({ status: 'tracked', x: 320, y: 180 });
        expect(savedTemplate.frames[1]?.label).toEqual({ status: 'occluded', x: null, y: null });
    });

    it('rejects visible frame annotations without coordinates', async () => {
        const workspace = await createWorkspace();
        const handle = await startCapturedFrameLabelerServer({
            labelsDir: workspace.labelsDir,
            rootDir: workspace.rootDir,
            port: 0,
        });
        handles.push(handle);

        const templateResponse = await fetch(`${handle.url}/api/templates/clip-a`);
        const templatePayload = await readJson(templateResponse) as {
            readonly template: ReturnType<typeof parseCapturedFrameLabelTemplate>;
        };
        const invalidTemplate = {
            ...templatePayload.template,
            frames: [
                {
                    ...templatePayload.template.frames[0]!,
                    label: { status: 'tracked' as const, x: null, y: null },
                },
                templatePayload.template.frames[1]!,
            ],
        };

        const saveResponse = await fetch(`${handle.url}/api/templates/clip-a`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(invalidTemplate),
        });
        const payload = await readJson(saveResponse) as { readonly error: string };
        const savedTemplate = parseCapturedFrameLabelTemplate(JSON.parse(await readFile(workspace.templatePath, 'utf8')));

        expect(saveResponse.status).toBe(400);
        expect(payload.error).toContain('frames visiveis precisam de coordenadas');
        expect(savedTemplate.frames[0]?.label.status).toBeNull();
    });

    it('serves local source video files with byte ranges for seeking', async () => {
        const workspace = await createWorkspace();
        const handle = await startCapturedFrameLabelerServer({
            labelsDir: workspace.labelsDir,
            rootDir: workspace.rootDir,
            port: 0,
        });
        handles.push(handle);

        const response = await fetch(`${handle.url}/media/clip-a`, {
            headers: { range: 'bytes=0-3' },
        });

        expect(response.status).toBe(206);
        expect(response.headers.get('content-range')).toBe('bytes 0-3/10');
        expect(await response.text()).toBe('fake');
    });

    it('renders a browser workspace with click-to-label controls', () => {
        const html = renderCapturedFrameLabelerHtml();

        expect(html).toContain('Captured Frame Labeler');
        expect(html).toContain('/api/templates');
        expect(html).toContain('data-status="tracked"');
        expect(html).toContain('Click no video');
        expect(html).toContain('Autosave');
    });
});
