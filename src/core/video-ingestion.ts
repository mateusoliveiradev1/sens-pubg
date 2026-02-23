/**
 * Video Ingestion — Validação e preparação do clip de spray.
 * Verifica MIME type, magic bytes, duração, resolução.
 * 100% client-side.
 */

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MIN_DURATION_S = 3;
const MAX_DURATION_S = 20;
const ALLOWED_MIMES = ['video/mp4', 'video/webm'] as const;

// Magic bytes para validação de formato
const MAGIC_BYTES: Record<string, readonly number[]> = {
    'video/mp4': [0x00, 0x00, 0x00], // ftyp box (offset 4)
    'video/webm': [0x1a, 0x45, 0xdf, 0xa3], // EBML header
} as const;

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface VideoMetadata {
    readonly file: File;
    readonly url: string;
    readonly mimeType: string;
    readonly width: number;
    readonly height: number;
    readonly duration: number;
    readonly fps: number;
}

export interface VideoValidationError {
    readonly type: 'size' | 'mime' | 'magic' | 'duration' | 'resolution' | 'load';
    readonly message: string;
}

export type VideoValidationResult =
    | { readonly valid: true; readonly metadata: VideoMetadata }
    | { readonly valid: false; readonly error: VideoValidationError };

// ═══════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════

async function validateMagicBytes(file: File): Promise<boolean> {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // MP4: check 'ftyp' at offset 4
    if (file.type === 'video/mp4') {
        const ftyp = String.fromCharCode(bytes[4] ?? 0, bytes[5] ?? 0, bytes[6] ?? 0, bytes[7] ?? 0);
        return ftyp === 'ftyp';
    }

    // WebM: check EBML header
    if (file.type === 'video/webm') {
        const expected = MAGIC_BYTES['video/webm'];
        if (!expected) return false;
        return expected.every((b, i) => bytes[i] === b);
    }

    return false;
}

function loadVideoMetadata(file: File): Promise<{
    width: number;
    height: number;
    duration: number;
    url: string;
}> {
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
            reject(new Error('Falha ao carregar o vídeo'));
        };

        video.src = url;
    });
}

/**
 * Estima FPS do vídeo usando requestVideoFrameCallback.
 * Retorna 30 como fallback se a API não estiver disponível.
 */
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
                (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: typeof callback) => void })
                    .requestVideoFrameCallback(callback);
            } else {
                video.pause();
                video.src = '';

                if (timestamps.length < 2) {
                    resolve(30);
                    return;
                }

                const diffs: number[] = [];
                for (let i = 1; i < timestamps.length; i++) {
                    const prev = timestamps[i - 1];
                    const curr = timestamps[i];
                    if (prev !== undefined && curr !== undefined) {
                        diffs.push(curr - prev);
                    }
                }

                const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                const fps = avgDiff > 0 ? Math.round(1 / avgDiff) : 30;
                resolve(Math.min(fps, 240));
            }
        };

        video.oncanplay = () => {
            void video.play();
            (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: typeof callback) => void })
                .requestVideoFrameCallback(callback);
        };

        // Timeout fallback
        setTimeout(() => resolve(30), 5000);
    });
}

// ═══════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════

export async function validateAndPrepareVideo(file: File): Promise<VideoValidationResult> {
    // 1. File size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: { type: 'size', message: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        };
    }

    // 2. MIME type
    if (!ALLOWED_MIMES.includes(file.type as typeof ALLOWED_MIMES[number])) {
        return {
            valid: false,
            error: { type: 'mime', message: `Formato não suportado. Use MP4 ou WebM.` },
        };
    }

    // 3. Magic bytes
    const validMagic = await validateMagicBytes(file);
    if (!validMagic) {
        return {
            valid: false,
            error: { type: 'magic', message: 'Arquivo corrompido ou formato inválido.' },
        };
    }

    // 4. Load metadata
    let meta: Awaited<ReturnType<typeof loadVideoMetadata>>;
    try {
        meta = await loadVideoMetadata(file);
    } catch {
        return {
            valid: false,
            error: { type: 'load', message: 'Não foi possível carregar o vídeo.' },
        };
    }

    // 5. Duration
    if (meta.duration < MIN_DURATION_S || meta.duration > MAX_DURATION_S) {
        URL.revokeObjectURL(meta.url);
        return {
            valid: false,
            error: { type: 'duration', message: `Duração deve ser entre ${MIN_DURATION_S}s e ${MAX_DURATION_S}s. Seu clip: ${Math.round(meta.duration)}s` },
        };
    }

    // 6. Resolution
    if (meta.width < 640 || meta.height < 360) {
        URL.revokeObjectURL(meta.url);
        return {
            valid: false,
            error: { type: 'resolution', message: `Resolução muito baixa (${meta.width}×${meta.height}). Mínimo: 640×360.` },
        };
    }

    // 7. Estimate FPS
    const fps = await estimateFps(meta.url);

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
        },
    };
}

/**
 * Limpa URL.createObjectURL ao desmontar.
 */
export function releaseVideoUrl(url: string): void {
    URL.revokeObjectURL(url);
}
