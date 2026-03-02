 
/**
 * aimAnalyzer.worker.ts
 * Processamento de vídeo frame-a-frame em segundo plano para análise de recoil.
 */

// Importante: Workers não têm acesso ao DOM, mas podem usar OffscreenCanvas se necessário.
// Aqui focamos em receber ImageData processado da main thread.

type WeaponProfile = {
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly baseVerticalRecoil: number;
    readonly baseHorizontalRng: number;
    readonly fireRateMs: number;
    readonly multipliers: Record<string, unknown>;
};

type TrackingPoint = {
    readonly frame: number;
    readonly timestamp: number;
    readonly x: number;
    readonly y: number;
    readonly confidence: number;
};

type CrosshairColor = 'RED' | 'GREEN';

type AnalysisContext = {
    readonly fov: number;
    readonly resolutionY: number;
    readonly weapon: WeaponProfile;
    readonly multipliers: {
        readonly vertical: number;
        readonly horizontal: number;
    };
    readonly vsm: number;
    readonly crosshairColor?: CrosshairColor;
};

// Variáveis de estado do rastreamento (persistentes durante a sessão START -> FINISH)
let previousCrosshairX: number | null = null;
let previousCrosshairY: number | null = null;

// Acumuladores de Diagnóstico
let totalJitter = 0;
let totalDrift = 0;
let totalVerticalError = 0;
let frameCount = 0;
let trackedPoints: TrackingPoint[] = [];

// Pontos de Âncora (Spray Start)
// let sprayStartX = 0;
// let sprayStartY = 0;

/**
 * Escuta mensagens da Thread Principal
 */
self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'START_ANALYSIS':
            resetState();
            // Opcional: payload.startX/Y se o usuário clicar no retículo no frame 0
            if (payload?.startX !== undefined) {
                previousCrosshairX = payload.startX;
                // sprayStartX = payload.startX;
            }
            if (payload?.startY !== undefined) {
                previousCrosshairY = payload.startY;
                // sprayStartY = payload.startY;
            }
            break;

        case 'PROCESS_FRAME':
            handleProcessFrame(payload);
            break;

        case 'FINISH_ANALYSIS':
            handleFinishAnalysis();
            break;
    }
};

function resetState() {
    previousCrosshairX = null;
    previousCrosshairY = null;
    // sprayStartX = 0;
    // sprayStartY = 0;
    totalJitter = 0;
    totalDrift = 0;
    totalVerticalError = 0;
    frameCount = 0;
    trackedPoints = [];
}

/**
 * Processa um único frame (ImageData)
 */
function handleProcessFrame(payload: { imageData: ImageData, timestamp: number, context: AnalysisContext }) {
    const { imageData, timestamp, context } = payload;

    // 1. Encontrar o Retículo no frame atual com o algoritmo de Centróide
    const crosshairPos = findCrosshair(imageData, context.crosshairColor || 'RED');

    // Se a mira sumiu (Tomou flash, recarregando, etc), ignoramos o frame
    if (!crosshairPos) return;

    const { currentX, currentY } = crosshairPos;

    // Se for o primeiro frame processado, apenas marcamos a posição inicial
    if (previousCrosshairX === null || previousCrosshairY === null) {
        previousCrosshairX = currentX;
        previousCrosshairY = currentY;
        return;
    }

    // 2. Calcular o Delta de movimento em pixels
    const deltaX = currentX - (previousCrosshairX || currentX);
    const deltaY = currentY - (previousCrosshairY || currentY);

    // 3. Lógica de Diagnóstico Matemática (RNG vs Erro Humano)
    // Calcula o limite do que é considerado "RNG aceitável" para esta arma e acessórios
    const allowedH = context.weapon.baseHorizontalRng * context.multipliers.horizontal;

    // --- CÁLCULO DE JITTER (Tremores) ---
    // Se o pulo horizontal no frame atual for maior que o RNG do jogo, o jogador tremeu o mouse.
    if (Math.abs(deltaX) > allowedH) {
        totalJitter += Math.abs(deltaX) - allowedH;
    }

    // --- CÁLCULO DE VERTICAL ERROR (Overpull / Underpull) ---
    // Positivo = mira desceu (Overpull), Negativo = mira subiu (Underpull)
    totalVerticalError += deltaY;

    // --- CÁLCULO DE DRIFT (Fuga Lateral contínua) ---
    // Drift é a distância do X atual para o X inicial (âncora).
    // const distanceFromCenter = Math.abs(currentX - sprayStartX);
    // const driftTolerance = allowedH * 2; // Tolerância de 2x o RNG

    // if (distanceFromCenter > driftTolerance) {
    //     // Peso pequeno para acumular progressivamente a 60fps
    //     totalDrift += (distanceFromCenter - driftTolerance) * 0.05;
    // }

    // Atualiza estado para o próximo frame
    previousCrosshairX = currentX;
    previousCrosshairY = currentY;
    // 4. Salvar ponto para trajetória
    trackedPoints.push({
        frame: frameCount,
        timestamp,
        x: currentX,
        y: currentY,
        confidence: 1.0 // Centróide básico assume confiança alta se encontrado
    });

    frameCount++;

    // Feedback de progresso
    self.postMessage({ type: 'PROGRESS', payload: { frameCount } });
}

function handleFinishAnalysis() {
    const sprayScore = calculateSprayScore(totalJitter, totalDrift, totalVerticalError, frameCount);

    self.postMessage({
        type: 'RESULT',
        payload: {
            score: sprayScore,
            metrics: {
                jitter: totalJitter,
                drift: totalDrift,
                vError: totalVerticalError
            },
            points: trackedPoints,
            suggestion: generateSuggestion(sprayScore, totalVerticalError)
        }
    });
}

/**
 * Algoritmo de Visão Computacional (Centróide)
 * Procura por pixels Vermelhos ou Verdes e calcula o centro de massa geométrico.
 */
function findCrosshair(imageData: ImageData, targetColor: CrosshairColor = 'RED'): { currentX: number, currentY: number } | null {
    const data = imageData.data;
    const width = imageData.width;
    // const height = imageData.height;

    let totalX = 0;
    let totalY = 0;
    let matchCount = 0;

    // Itera sobre todos os pixels (cada pixel tem 4 valores: R, G, B, Alpha)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;

        let isMatch = false;

        // Lógica de Threshold (Limiar de Cor)
        if (targetColor === 'RED') {
            // O vermelho do PUBG é muito forte, com pouca interferência de verde e azul
            if (r > 200 && g < 80 && b < 80) {
                isMatch = true;
            }
        } else if (targetColor === 'GREEN') {
            // O verde é um neon brilhante
            if (g > 200 && r < 100 && b < 100) {
                isMatch = true;
            }
        }

        if (isMatch) {
            // Converte o índice linear do array (1D) para coordenadas X e Y (2D)
            const pixelIndex = i / 4;
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);

            totalX += x;
            totalY += y;
            matchCount++;
        }
    }

    // Se a mira sumiu (matchCount < 5), retornamos null
    if (matchCount < 5) {
        return null;
    }

    // Retorna o Centróide (média da posição de todos os pixels detectados)
    return {
        currentX: totalX / matchCount,
        currentY: totalY / matchCount
    };
}

function calculateSprayScore(jitter: number, drift: number, vError: number, frames: number): number {
    if (frames === 0) return 0;

    const avgJitter = jitter / frames;
    const avgVError = Math.abs(vError) / frames;

    // Penalidades escalonadas
    const penalty = (avgJitter * 150) + (avgVError * 100);
    return Math.max(0, Math.min(100, 100 - penalty));
}

function generateSuggestion(score: number, vError: number): string {
    if (score > 90) return 'Perfeito! Seu controle de recoil está impecável.';
    if (vError > 0) return 'Você está puxando demais para baixo. Tente diminuir o Multiplicador Vertical.';
    if (vError < -5) return 'Você não está compensando o suficiente. Aumente seu Multiplicador Vertical ou Sensibilidade Geral.';
    return 'Tente focar em reduzir o tremor horizontal durante o spray.';
}

// Helpers matemáticos locais (para evitar problemas de import no worker se o bundler nao suportar)
/* 
function getPixelToDegree(fov: number, resolutionY: number): number {
    const aspectRatio = 16 / 9;
    const fovHRad = (fov * Math.PI) / 180;
    const fovVRad = 2 * Math.atan(Math.tan(fovHRad / 2) / aspectRatio);
    const fovV = (fovVRad * 180) / Math.PI;
    return fovV / resolutionY;
}
*/
