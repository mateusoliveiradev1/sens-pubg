import {
    MAX_SPRAY_CLIP_DURATION_SECONDS,
    MIN_SPRAY_CLIP_DURATION_SECONDS,
    isSupportedSprayClipDuration,
} from './video-ingestion-contract';
import { analyzeCaptureQualityFrames, createVideoQualityReport } from './capture-quality';
import { extractFrames } from './frame-extraction';
import type { VideoQualityReport } from '../types/engine';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIMES = ['video/mp4', 'video/webm'] as const;

const MAGIC_BYTES: Record<string, readonly number[]> = {
    'video/mp4': [0x00, 0x00, 0x00],
    'video/webm': [0x1a, 0x45, 0xdf, 0xa3],
} as const;

export interface VideoMetadata {
    readonly file: File;
    readonly url: string;
    readonly mimeType: string;
    readonly width: number;
    readonly height: number;
    readonly duration: number;
    readonly fps: number;
    readonly qualityReport: VideoQualityReport;
}

export interface VideoValidationError {
    readonly type: 'size' | 'mime' | 'magic' | 'duration' | 'resolution' | 'load';
    readonly message: string;
}

export type VideoValidationResult =
    | { readonly valid: true; readonly metadata: VideoMetadata }
    | { readonly valid: false; readonly error: VideoValidationError };

interface LoadedVideoMetadata {
    readonly width: number;
    readonly height: number;
    readonly duration: number;
    readonly url: string;
}

export interface VideoValidationDependencies {
    readonly validateMagicBytes?: (file: File) => Promise<boolean>;
    readonly loadVideoMetadata?: (file: File) => Promise<LoadedVideoMetadata>;
    readonly estimateFps?: (url: string) => Promise<number>;
    readonly assessQuality?: (input: {
        readonly url: string;
        readonly fps: number;
        readonly duration: number;
    }) => Promise<VideoQualityReport>;
    readonly revokeObjectUrl?: (url: string) => void;
}

async function validateMagicBytes(file: File): Promise<boolean> {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (file.type === 'video/mp4') {
        const ftyp = String.fromCharCode(bytes[4] ?? 0, bytes[5] ?? 0, bytes[6] ?? 0, bytes[7] ?? 0);
        return ftyp === 'ftyp';
    }

    if (file.type === 'video/webm') {
        const expected = MAGIC_BYTES['video/webm'];
        if (!expected) {
            return false;
        }

        return expected.every((value, index) => bytes[index] === value);
    }

    return false;
}

function loadVideoMetadata(file: File): Promise<LoadedVideoMetadata> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            resolve({
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration,
                url,
            });
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Falha ao carregar o video'));
        };

        video.src = url;
    });
}

async function estimateFps(url: string): Promise<number> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;

        if (!('requestVideoFrameCallback' in video)) {
            resolve(30);
            return;
        }

        const timestamps: number[] = [];
        let count = 0;

        const callback = (_now: DOMHighResTimeStamp, metadata: { mediaTime: number }): void => {
            timestamps.push(metadata.mediaTime);
            count++;

            if (count < 30) {
                (video as HTMLVideoElement & {
                    requestVideoFrameCallback: (cb: typeof callback) => void;
                }).requestVideoFrameCallback(callback);
                return;
            }

            video.pause();
            video.src = '';

            if (timestamps.length < 2) {
                resolve(30);
                return;
            }

            const diffs: number[] = [];
            for (let index = 1; index < timestamps.length; index++) {
                const previous = timestamps[index - 1];
                const current = timestamps[index];
                if (previous !== undefined && current !== undefined) {
                    diffs.push(current - previous);
                }
            }

            const averageDiff = diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
            const fps = averageDiff > 0 ? Math.round(1 / averageDiff) : 30;
            resolve(Math.min(fps, 240));
        };

        video.oncanplay = () => {
            void video.play();
            (video as HTMLVideoElement & {
                requestVideoFrameCallback: (cb: typeof callback) => void;
            }).requestVideoFrameCallback(callback);
        };

        setTimeout(() => resolve(30), 5000);
    });
}

async function assessVideoQuality(input: {
    readonly url: string;
    readonly fps: number;
    readonly duration: number;
}): Promise<VideoQualityReport> {
    try {
        const sampleFps = Math.max(1, Math.min(4, Math.round(input.fps / 15)));
        const sampleDuration = Math.min(input.duration, 1.5);
        const frames = await extractFrames(input.url, sampleFps, 0, sampleDuration);

        return analyzeCaptureQualityFrames(
            frames.map((frame) => frame.imageData),
            {
                roiStability: 100,
                fpsStability: input.fps >= 59 ? 100 : Math.max(45, (input.fps / 60) * 100),
            }
        );
    } catch {
        return createVideoQualityReport({
            sharpness: 55,
            compressionBurden: 45,
            reticleContrast: 55,
            roiStability: 100,
            fpsStability: input.fps >= 59 ? 100 : 70,
        });
    }
}

function formatObservedDuration(durationSeconds: number): string {
    const hasFraction = Math.abs(durationSeconds - Math.round(durationSeconds)) >= 0.05;

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: hasFraction ? 1 : 0,
        maximumFractionDigits: 1,
    }).format(durationSeconds);
}

export async function validateAndPrepareVideo(
    file: File,
    dependencies: VideoValidationDependencies = {}
): Promise<VideoValidationResult> {
    const validateMagicBytesFn = dependencies.validateMagicBytes ?? validateMagicBytes;
    const loadVideoMetadataFn = dependencies.loadVideoMetadata ?? loadVideoMetadata;
    const estimateFpsFn = dependencies.estimateFps ?? estimateFps;
    const assessQualityFn = dependencies.assessQuality ?? assessVideoQuality;
    const revokeObjectUrl = dependencies.revokeObjectUrl ?? URL.revokeObjectURL;

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: {
                type: 'size',
                message: `Arquivo muito grande. Maximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            },
        };
    }

    if (!ALLOWED_MIMES.includes(file.type as typeof ALLOWED_MIMES[number])) {
        return {
            valid: false,
            error: {
                type: 'mime',
                message: 'Formato nao suportado. Use MP4 ou WebM.',
            },
        };
    }

    const validMagic = await validateMagicBytesFn(file);
    if (!validMagic) {
        return {
            valid: false,
            error: {
                type: 'magic',
                message: 'Arquivo corrompido ou formato invalido.',
            },
        };
    }

    let meta: Awaited<ReturnType<typeof loadVideoMetadataFn>>;
    try {
        meta = await loadVideoMetadataFn(file);
    } catch {
        return {
            valid: false,
            error: {
                type: 'load',
                message: 'Nao foi possivel carregar o video.',
            },
        };
    }

    if (!isSupportedSprayClipDuration(meta.duration)) {
        revokeObjectUrl(meta.url);
        return {
            valid: false,
            error: {
                type: 'duration',
                message: `Duracao deve ser entre ${MIN_SPRAY_CLIP_DURATION_SECONDS}s e ${MAX_SPRAY_CLIP_DURATION_SECONDS}s. Seu clip: ${formatObservedDuration(meta.duration)}s`,
            },
        };
    }

    if (meta.width < 640 || meta.height < 360) {
        revokeObjectUrl(meta.url);
        return {
            valid: false,
            error: {
                type: 'resolution',
                message: `Resolucao muito baixa (${meta.width}x${meta.height}). Minimo: 640x360.`,
            },
        };
    }

    const fps = await estimateFpsFn(meta.url);
    const qualityReport = await assessQualityFn({
        url: meta.url,
        fps,
        duration: meta.duration,
    });

    return {
        valid: true,
        metadata: {
            file,
            url: meta.url,
            mimeType: file.type,
            width: meta.width,
            height: meta.height,
            duration: meta.duration,
            fps,
            qualityReport,
        },
    };
}

export function releaseVideoUrl(url: string): void {
    URL.revokeObjectURL(url);
}
