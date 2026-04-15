import { createReadStream } from 'node:fs';
import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { renderCapturedFrameLabelerHtml } from '../src/core/captured-frame-labeler-view';
import {
    parseCapturedFrameLabelTemplate,
    summarizeCapturedFrameLabelTemplate,
    type CapturedFrameLabelTemplate,
} from '../src/types/captured-frame-labels';

export { renderCapturedFrameLabelerHtml };

export interface CapturedFrameLabelerServerOptions {
    readonly labelsDir?: string;
    readonly rootDir?: string;
    readonly host?: string;
    readonly port?: number;
}

export interface CapturedFrameLabelerServerHandle {
    readonly url: string;
    readonly close: () => Promise<void>;
}

interface TemplateEntry {
    readonly fileName: string;
    readonly filePath: string;
    readonly template: CapturedFrameLabelTemplate;
}

const DEFAULT_LABELS_DIR = 'tests/fixtures/captured-clips/labels';

const resolveFromCwd = (filePath: string): string =>
    path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(process.cwd(), filePath);

const sendJson = (response: ServerResponse, statusCode: number, value: unknown): void => {
    response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(value, null, 2));
};

const sendText = (
    response: ServerResponse,
    statusCode: number,
    value: string,
    contentType = 'text/plain; charset=utf-8',
): void => {
    response.writeHead(statusCode, { 'content-type': contentType });
    response.end(value);
};

const readRequestBody = async (request: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf8');
};

const parseJsonRequest = async (request: IncomingMessage): Promise<unknown> => {
    const raw = await readRequestBody(request);
    return JSON.parse(raw);
};

const toErrorMessage = (error: unknown): string => {
    if (error instanceof z.ZodError) {
        return error.issues.map((issue) => issue.message).join('; ');
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'erro desconhecido';
};

const isPathInside = (rootDir: string, candidatePath: string): boolean => {
    const relative = path.relative(rootDir, candidatePath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const getTemplateEntries = async (labelsDir: string): Promise<TemplateEntry[]> => {
    const fileNames = (await readdir(labelsDir))
        .filter((fileName) => fileName.endsWith('.frames.todo.json'))
        .sort((left, right) => left.localeCompare(right));
    const entries = await Promise.all(fileNames.map(async (fileName) => {
        const filePath = path.join(labelsDir, fileName);
        const template = parseCapturedFrameLabelTemplate(JSON.parse(await readFile(filePath, 'utf8')));

        return { fileName, filePath, template };
    }));

    return entries;
};

const getTemplateEntry = async (labelsDir: string, clipId: string): Promise<TemplateEntry | null> => {
    const entries = await getTemplateEntries(labelsDir);
    return entries.find((entry) => entry.template.clipId === clipId) ?? null;
};

const toListSummary = (template: CapturedFrameLabelTemplate) => {
    const summary = summarizeCapturedFrameLabelTemplate(template);

    return {
        totalFrames: summary.totalFrames,
        missingFrameCount: summary.missingFrameCount,
    };
};

const listTemplates = async (labelsDir: string) => {
    const entries = await getTemplateEntries(labelsDir);

    return {
        templates: entries.map((entry) => ({
            clipId: entry.template.clipId,
            fileName: entry.fileName,
            mediaUrl: `/media/${encodeURIComponent(entry.template.clipId)}`,
            summary: toListSummary(entry.template),
        })),
    };
};

const getMimeType = (filePath: string): string => {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.mp4') return 'video/mp4';
    if (extension === '.webm') return 'video/webm';
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.mkv') return 'video/x-matroska';

    return 'application/octet-stream';
};

const getSourceVideoPath = (rootDir: string, template: CapturedFrameLabelTemplate): string => {
    const sourcePath = path.isAbsolute(template.sourceVideoPath)
        ? path.resolve(template.sourceVideoPath)
        : path.resolve(rootDir, template.sourceVideoPath);

    if (!isPathInside(rootDir, sourcePath)) {
        throw new Error('sourceVideoPath fica fora do workspace permitido');
    }

    return sourcePath;
};

const parseRangeHeader = (
    rangeHeader: string | undefined,
    size: number,
): { readonly start: number; readonly end: number } | null => {
    if (!rangeHeader) return null;

    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) return null;

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : size - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
        return null;
    }

    return { start, end: Math.min(end, size - 1) };
};

const serveMedia = async (
    request: IncomingMessage,
    response: ServerResponse,
    filePath: string,
): Promise<void> => {
    await access(filePath);

    const metadata = await stat(filePath);
    const mimeType = getMimeType(filePath);
    const range = parseRangeHeader(request.headers.range, metadata.size);

    if (range) {
        response.writeHead(206, {
            'accept-ranges': 'bytes',
            'content-length': range.end - range.start + 1,
            'content-range': `bytes ${range.start}-${range.end}/${metadata.size}`,
            'content-type': mimeType,
        });
        createReadStream(filePath, { start: range.start, end: range.end }).pipe(response);
        return;
    }

    response.writeHead(200, {
        'accept-ranges': 'bytes',
        'content-length': metadata.size,
        'content-type': mimeType,
    });
    createReadStream(filePath).pipe(response);
};

const handleApiRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
    labelsDir: string,
    url: URL,
): Promise<void> => {
    if (request.method === 'GET' && url.pathname === '/api/templates') {
        sendJson(response, 200, await listTemplates(labelsDir));
        return;
    }

    const templateMatch = /^\/api\/templates\/([^/]+)$/.exec(url.pathname);
    if (!templateMatch) {
        sendJson(response, 404, { error: 'rota nao encontrada' });
        return;
    }

    const clipId = decodeURIComponent(templateMatch[1]!);
    const entry = await getTemplateEntry(labelsDir, clipId);
    if (!entry) {
        sendJson(response, 404, { error: `template nao encontrado: ${clipId}` });
        return;
    }

    if (request.method === 'GET') {
        sendJson(response, 200, {
            template: entry.template,
            summary: summarizeCapturedFrameLabelTemplate(entry.template),
        });
        return;
    }

    if (request.method === 'PUT') {
        const template = parseCapturedFrameLabelTemplate(await parseJsonRequest(request));
        if (template.clipId !== clipId) {
            sendJson(response, 400, { error: 'clipId do payload nao bate com a URL' });
            return;
        }

        await writeFile(entry.filePath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
        sendJson(response, 200, {
            template,
            summary: summarizeCapturedFrameLabelTemplate(template),
        });
        return;
    }

    sendJson(response, 405, { error: 'metodo nao permitido' });
};

const handleRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
    labelsDir: string,
    rootDir: string,
): Promise<void> => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    try {
        if (request.method === 'GET' && url.pathname === '/') {
            sendText(response, 200, renderCapturedFrameLabelerHtml(), 'text/html; charset=utf-8');
            return;
        }

        if (url.pathname.startsWith('/api/')) {
            await handleApiRequest(request, response, labelsDir, url);
            return;
        }

        const mediaMatch = /^\/media\/([^/]+)$/.exec(url.pathname);
        if (request.method === 'GET' && mediaMatch) {
            const clipId = decodeURIComponent(mediaMatch[1]!);
            const entry = await getTemplateEntry(labelsDir, clipId);
            if (!entry) {
                sendJson(response, 404, { error: `midia nao encontrada: ${clipId}` });
                return;
            }

            await serveMedia(request, response, getSourceVideoPath(rootDir, entry.template));
            return;
        }

        sendJson(response, 404, { error: 'rota nao encontrada' });
    } catch (error) {
        sendJson(response, 400, { error: toErrorMessage(error) });
    }
};

export const startCapturedFrameLabelerServer = async (
    options: CapturedFrameLabelerServerOptions = {},
): Promise<CapturedFrameLabelerServerHandle> => {
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? 4177;
    const labelsDir = resolveFromCwd(options.labelsDir ?? DEFAULT_LABELS_DIR);
    const rootDir = resolveFromCwd(options.rootDir ?? process.cwd());

    const server = createServer((request, response) => {
        void handleRequest(request, response, labelsDir, rootDir);
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.off('error', reject);
            resolve();
        });
    });

    const address = server.address() as AddressInfo;
    const url = `http://${host}:${address.port}`;

    return {
        url,
        close: () => new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        }),
    };
};

const isCliEntrypoint = (): boolean => {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
};

const main = async (): Promise<void> => {
    const [, , labelsDirArg, portArg] = process.argv;
    const handle = await startCapturedFrameLabelerServer({
        ...(labelsDirArg ? { labelsDir: labelsDirArg } : {}),
        ...(portArg ? { port: Number(portArg) } : {}),
    });

    console.log(`Captured Frame Labeler rodando em ${handle.url}`);
    console.log('Pressione Ctrl+C para encerrar.');
};

if (isCliEntrypoint()) {
    void main();
}
