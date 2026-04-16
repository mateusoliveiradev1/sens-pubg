import type {
    ReticleExogenousDisturbance,
    TrackingFrameObservation,
    TrackingFrameStatus,
} from '@/types/engine';

export interface CapturedFrameReviewLabel {
    readonly frameIndex: number;
    readonly timestampSeconds: number;
    readonly label: {
        readonly status: TrackingFrameStatus;
        readonly x?: number | null;
        readonly y?: number | null;
        readonly notes?: string;
    };
}

export interface TrackingReviewFrameSize {
    readonly width: number;
    readonly height: number;
}

export interface TrackingReviewOverlayMarker {
    readonly frame: number;
    readonly timestampMs: number;
    readonly status: TrackingFrameStatus;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly colorState: TrackingFrameObservation['colorState'];
    readonly exogenousDisturbance: ReticleExogenousDisturbance;
    readonly x?: number;
    readonly y?: number;
    readonly normalizedX?: number;
    readonly normalizedY?: number;
    readonly labelStatus?: TrackingFrameStatus;
    readonly labelX?: number;
    readonly labelY?: number;
    readonly labelNormalizedX?: number;
    readonly labelNormalizedY?: number;
    readonly statusMatches?: boolean;
    readonly errorPx?: number;
    readonly reacquisitionFrames?: number;
    readonly notes?: string;
}

export interface TrackingReviewOverlaySummary {
    readonly markers: number;
    readonly labeledMarkers: number;
    readonly statusMismatches: number;
    readonly meanErrorPx: number;
    readonly maxErrorPx: number;
    readonly reacquisitionEvents: number;
}

export interface BuildTrackingReviewOverlayInput {
    readonly trackingFrames: readonly TrackingFrameObservation[];
    readonly labels?: readonly CapturedFrameReviewLabel[];
    readonly frameSize?: TrackingReviewFrameSize;
}

function optionalNumber(value: number | null | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function timestampKeyFromMs(timestampMs: number): string {
    return (timestampMs / 1000).toFixed(3);
}

function timestampKeyFromSeconds(timestampSeconds: number): string {
    return timestampSeconds.toFixed(3);
}

function normalizeCoordinate(value: number | undefined, size: number | undefined): number | undefined {
    if (value === undefined || size === undefined || size <= 0) {
        return undefined;
    }

    return Math.max(0, Math.min(1, value / size));
}

function calculateErrorPx(
    observedX: number | undefined,
    observedY: number | undefined,
    labelX: number | undefined,
    labelY: number | undefined
): number | undefined {
    if (
        observedX === undefined
        || observedY === undefined
        || labelX === undefined
        || labelY === undefined
    ) {
        return undefined;
    }

    return Math.hypot(observedX - labelX, observedY - labelY);
}

export function buildTrackingReviewOverlay({
    trackingFrames,
    labels = [],
    frameSize,
}: BuildTrackingReviewOverlayInput): readonly TrackingReviewOverlayMarker[] {
    const labelsByFrame = new Map(labels.map((label) => [label.frameIndex, label]));
    const labelsByTimestamp = new Map(labels.map((label) => [
        timestampKeyFromSeconds(label.timestampSeconds),
        label,
    ]));

    return trackingFrames.map((frame) => {
        const timestampMs = Number(frame.timestamp);
        const label = labelsByFrame.get(frame.frame)
            ?? labelsByTimestamp.get(timestampKeyFromMs(timestampMs));
        const observedX = optionalNumber(Number(frame.x));
        const observedY = optionalNumber(Number(frame.y));
        const labelX = optionalNumber(label?.label.x);
        const labelY = optionalNumber(label?.label.y);
        const errorPx = calculateErrorPx(observedX, observedY, labelX, labelY);
        const normalizedX = normalizeCoordinate(observedX, frameSize?.width);
        const normalizedY = normalizeCoordinate(observedY, frameSize?.height);
        const labelNormalizedX = normalizeCoordinate(labelX, frameSize?.width);
        const labelNormalizedY = normalizeCoordinate(labelY, frameSize?.height);

        return {
            frame: frame.frame,
            timestampMs,
            status: frame.status,
            confidence: frame.confidence,
            visiblePixels: frame.visiblePixels,
            colorState: frame.colorState,
            exogenousDisturbance: frame.exogenousDisturbance,
            ...(observedX !== undefined ? { x: observedX } : {}),
            ...(observedY !== undefined ? { y: observedY } : {}),
            ...(normalizedX !== undefined ? { normalizedX } : {}),
            ...(normalizedY !== undefined ? { normalizedY } : {}),
            ...(label ? { labelStatus: label.label.status } : {}),
            ...(labelX !== undefined ? { labelX } : {}),
            ...(labelY !== undefined ? { labelY } : {}),
            ...(labelNormalizedX !== undefined ? { labelNormalizedX } : {}),
            ...(labelNormalizedY !== undefined ? { labelNormalizedY } : {}),
            ...(label ? { statusMatches: frame.status === label.label.status } : {}),
            ...(errorPx !== undefined ? { errorPx } : {}),
            ...(frame.reacquisitionFrames !== undefined
                ? { reacquisitionFrames: frame.reacquisitionFrames }
                : {}),
            ...(label?.label.notes ? { notes: label.label.notes } : {}),
        };
    });
}

export function summarizeTrackingReviewOverlay(
    markers: readonly TrackingReviewOverlayMarker[]
): TrackingReviewOverlaySummary {
    const markersWithLabels = markers.filter((marker) => marker.labelStatus !== undefined);
    const errors = markers
        .map((marker) => marker.errorPx)
        .filter((error): error is number => error !== undefined);

    return {
        markers: markers.length,
        labeledMarkers: markersWithLabels.length,
        statusMismatches: markersWithLabels.filter((marker) => marker.statusMatches === false).length,
        meanErrorPx: errors.length > 0
            ? errors.reduce((sum, error) => sum + error, 0) / errors.length
            : 0,
        maxErrorPx: errors.length > 0 ? Math.max(...errors) : 0,
        reacquisitionEvents: markers.filter((marker) => (marker.reacquisitionFrames ?? 0) > 0).length,
    };
}

export function renderCapturedFrameLabelerHtml(): string {
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Captured Frame Labeler</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0b1020;
      color: #f8fafc;
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top left, rgba(14, 165, 233, 0.22), transparent 34rem), #0b1020;
    }
    main {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 24px;
      padding: 24px;
    }
    aside,
    section {
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.78);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      padding: 18px;
    }
    h1,
    h2 {
      margin: 0 0 12px;
    }
    button {
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.92);
      color: #f8fafc;
      cursor: pointer;
      padding: 8px 12px;
    }
    button.active {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    video {
      width: 100%;
      max-height: 68vh;
      border-radius: 14px;
      background: #020617;
    }
    .templates,
    .frames,
    .status-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .frames {
      max-height: 42vh;
      overflow: auto;
      margin-top: 12px;
    }
    .frame-button[data-ready="true"] {
      border-color: rgba(34, 197, 94, 0.65);
    }
    .hint,
    .status {
      color: #cbd5e1;
      line-height: 1.5;
      font-size: 0.92rem;
    }
    .status {
      margin-top: 12px;
      min-height: 1.5rem;
    }
  </style>
</head>
<body>
  <main>
    <aside>
      <h1>Captured Frame Labeler</h1>
      <p class="hint">Escolha um template, pule para um frame e marque o status. Click no video grava coordenadas para frames visiveis.</p>
      <h2>Templates</h2>
      <div id="templates" class="templates"></div>
      <h2>Frames</h2>
      <div id="frames" class="frames"></div>
    </aside>
    <section>
      <div class="status-row">
        <button data-status="tracked" class="active">tracked</button>
        <button data-status="uncertain">uncertain</button>
        <button data-status="occluded">occluded</button>
        <button data-status="lost">lost</button>
      </div>
      <p class="hint">Autosave fica ativo a cada anotacao. Use tracked/uncertain com click no video; occluded/lost limpam coordenadas.</p>
      <video id="video" controls></video>
      <p id="status" class="status">Carregando templates de /api/templates...</p>
    </section>
  </main>
  <script>
    const state = {
      templates: [],
      template: null,
      activeFrameIndex: 0,
      activeStatus: 'tracked'
    };
    const templatesEl = document.querySelector('#templates');
    const framesEl = document.querySelector('#frames');
    const videoEl = document.querySelector('#video');
    const statusEl = document.querySelector('#status');
    const setStatus = (message) => { statusEl.textContent = message; };
    const api = async (url, options) => {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    };
    const currentFrame = () => state.template && state.template.frames[state.activeFrameIndex];
    const renderFrames = () => {
      framesEl.innerHTML = '';
      if (!state.template) return;
      state.template.frames.forEach((frame, index) => {
        const button = document.createElement('button');
        button.className = 'frame-button' + (index === state.activeFrameIndex ? ' active' : '');
        button.dataset.ready = String(frame.label.status !== null);
        button.textContent = String(frame.frameIndex) + ' @ ' + frame.timestampSeconds.toFixed(2) + 's';
        button.onclick = () => {
          state.activeFrameIndex = index;
          videoEl.currentTime = frame.timestampSeconds;
          renderFrames();
        };
        framesEl.appendChild(button);
      });
    };
    const saveTemplate = async () => {
      if (!state.template) return;
      await api('/api/templates/' + encodeURIComponent(state.template.clipId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state.template)
      });
      setStatus('Autosave concluido para ' + state.template.clipId);
      renderFrames();
    };
    const loadTemplate = async (clipId, mediaUrl) => {
      const payload = await api('/api/templates/' + encodeURIComponent(clipId));
      state.template = payload.template;
      state.activeFrameIndex = 0;
      videoEl.src = mediaUrl;
      renderFrames();
      setStatus('Template carregado: ' + clipId);
    };
    const renderTemplates = () => {
      templatesEl.innerHTML = '';
      state.templates.forEach((template) => {
        const button = document.createElement('button');
        button.textContent = template.clipId + ' (' + template.summary.missingFrameCount + ' faltando)';
        button.onclick = () => loadTemplate(template.clipId, template.mediaUrl);
        templatesEl.appendChild(button);
      });
    };
    document.querySelectorAll('[data-status]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeStatus = button.dataset.status;
        document.querySelectorAll('[data-status]').forEach((candidate) => candidate.classList.remove('active'));
        button.classList.add('active');
      });
    });
    videoEl.addEventListener('click', async (event) => {
      const frame = currentFrame();
      if (!frame) return;
      if (state.activeStatus === 'tracked' || state.activeStatus === 'uncertain') {
        const rect = videoEl.getBoundingClientRect();
        const scaleX = state.template.frameSize.width / rect.width;
        const scaleY = state.template.frameSize.height / rect.height;
        frame.label = {
          status: state.activeStatus,
          x: Math.round((event.clientX - rect.left) * scaleX),
          y: Math.round((event.clientY - rect.top) * scaleY)
        };
      } else {
        frame.label = { status: state.activeStatus, x: null, y: null };
      }
      await saveTemplate();
    });
    api('/api/templates')
      .then((payload) => {
        state.templates = payload.templates;
        renderTemplates();
        setStatus(payload.templates.length ? 'Selecione um template.' : 'Nenhum template encontrado.');
      })
      .catch((error) => setStatus('Erro: ' + error.message));
  </script>
</body>
</html>`;
}
