/**
 * Frame Extraction — Extrai frames de vídeo usando Canvas API.
 * Usa requestVideoFrameCallback quando disponível para timing preciso,
 * fallback para seek + draw para compatibilidade.
 */

export interface ExtractedFrame {
    readonly index: number;
    readonly timestamp: number;    // ms
    readonly imageData: ImageData;
}

export interface ExtractionProgress {
    readonly current: number;
    readonly total: number;
    readonly percent: number;
}

export type ExtractionProgressCallback = (progress: ExtractionProgress) => void;

/**
 * Extrai frames de um vídeo em intervalos regulares.
 * 
 * @param videoUrl - URL.createObjectURL do vídeo
 * @param fps - FPS alvo (padrão: 30 frames por segundo do vídeo)
 * @param onProgress - Callback de progresso
 * @returns Array de frames extraídos
 */
export async function extractFrames(
    videoUrl: string,
    fps: number = 30,
    startTime: number = 0,
    durationSecs: number = 0, // 0 = complete video
    onProgress?: ExtractionProgressCallback
): Promise<ExtractedFrame[]> {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'auto';

    await new Promise<void>((resolve, reject) => {
        video.oncanplaythrough = () => resolve();
        video.onerror = () => reject(new Error('Falha ao carregar vídeo para extração'));
        video.load();
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context não disponível');

    const duration = video.duration;
    const actualDuration = durationSecs > 0 ? Math.min(durationSecs, duration - startTime) : (duration - startTime);
    const frameInterval = 1 / fps;
    const totalFrames = Math.floor(actualDuration * fps);
    const frames: ExtractedFrame[] = [];

    // Extrair usando seek-based approach para garantir timestamps precisos
    for (let i = 0; i < totalFrames; i++) {
        const timestamp = startTime + (i * frameInterval);

        // Seek para o timestamp
        await seekToTime(video, timestamp);

        // Capturar frame
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        frames.push({
            index: i,
            timestamp: timestamp * 1000, // Convert to ms
            imageData,
        });

        if (onProgress) {
            onProgress({
                current: i + 1,
                total: totalFrames,
                percent: Math.round(((i + 1) / totalFrames) * 100),
            });
        }
    }

    return frames;
}

/**
 * Seek preciso para um timestamp usando promise.
 */
function seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
        if (Math.abs(video.currentTime - time) < 0.01) {
            resolve();
            return;
        }

        const handler = (): void => {
            video.removeEventListener('seeked', handler);
            resolve();
        };
        video.addEventListener('seeked', handler);
        video.currentTime = time;
    });
}

/**
 * Extrai frames usando OffscreenCanvas (para uso em Web Workers).
 * Recebe transferência do vídeo bitmap e processa off-main-thread.
 */
export async function extractFramesFromBitmaps(
    bitmaps: readonly ImageBitmap[],
    timestamps: readonly number[]
): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < bitmaps.length; i++) {
        const bitmap = bitmaps[i];
        const ts = timestamps[i];
        if (!bitmap || ts === undefined) continue;

        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

        frames.push({
            index: i,
            timestamp: ts,
            imageData,
        });
    }

    return frames;
}
