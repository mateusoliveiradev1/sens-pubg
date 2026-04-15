export const renderCapturedFrameLabelerHtml = (): string => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Captured Frame Labeler</title>
  <style>
    :root {
      --bg: #10110d;
      --panel: #191b14;
      --panel-2: #23261b;
      --ink: #f4f0df;
      --muted: #a9a38f;
      --line: #383a2b;
      --accent: #e3b341;
      --accent-2: #8ccf88;
      --danger: #e27164;
      --shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(227, 179, 65, 0.24), transparent 34rem),
        linear-gradient(135deg, #10110d 0%, #17190f 48%, #0b0c09 100%);
    }

    body::before {
      position: fixed;
      inset: 0;
      pointer-events: none;
      content: "";
      opacity: 0.15;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    button {
      border: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    .shell {
      position: relative;
      display: grid;
      grid-template-columns: 19rem minmax(0, 1fr) 21rem;
      gap: 1rem;
      min-height: 100vh;
      padding: 1rem;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: rgba(25, 27, 20, 0.9);
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }

    .sidebar,
    .inspector {
      padding: 1rem;
      overflow: auto;
    }

    .brand {
      margin: 0 0 0.3rem;
      font-family: Georgia, serif;
      font-size: clamp(2rem, 4vw, 4.4rem);
      letter-spacing: -0.08em;
      line-height: 0.9;
    }

    .eyebrow {
      margin: 0 0 1rem;
      color: var(--accent);
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .clip-list {
      display: grid;
      gap: 0.75rem;
    }

    .clip-card {
      width: 100%;
      padding: 0.9rem;
      border: 1px solid var(--line);
      border-radius: 16px;
      text-align: left;
      background: var(--panel-2);
    }

    .clip-card.active {
      outline: 2px solid var(--accent);
    }

    .clip-card strong,
    .frame-pill strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      color: var(--muted);
      font-size: 0.78rem;
    }

    .stage {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 1rem;
      padding: 1rem;
    }

    .status-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .autosave {
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      background: rgba(0, 0, 0, 0.18);
      font-size: 0.8rem;
    }

    .video-wrap {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 24rem;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: #050604;
      overflow: hidden;
    }

    video {
      width: 100%;
      max-height: 70vh;
      background: #000;
      object-fit: contain;
    }

    .reticle {
      position: absolute;
      width: 22px;
      height: 22px;
      border: 2px solid var(--accent);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.55), 0 0 28px rgba(227, 179, 65, 0.85);
    }

    .reticle::before,
    .reticle::after {
      position: absolute;
      content: "";
      background: var(--accent);
    }

    .reticle::before {
      left: 50%;
      top: -9px;
      width: 2px;
      height: 36px;
    }

    .reticle::after {
      left: -9px;
      top: 50%;
      width: 36px;
      height: 2px;
    }

    .toolbar {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .tool {
      padding: 0.8rem 0.7rem;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel-2);
    }

    .tool.active {
      border-color: var(--accent);
      background: #3a3117;
    }

    .tool[data-status="tracked"] {
      color: var(--accent-2);
    }

    .tool[data-status="uncertain"] {
      color: var(--accent);
    }

    .tool[data-status="lost"],
    .tool.clear {
      color: var(--danger);
    }

    .hint {
      margin: 0.7rem 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }

    .timeline {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(5.6rem, 1fr));
      gap: 0.55rem;
      margin-top: 1rem;
    }

    .frame-pill {
      padding: 0.65rem;
      border: 1px solid var(--line);
      border-radius: 14px;
      text-align: left;
      background: rgba(255, 255, 255, 0.04);
    }

    .frame-pill.active {
      border-color: var(--accent);
    }

    .frame-pill.ready {
      border-color: rgba(140, 207, 136, 0.55);
    }

    .field {
      margin-top: 1rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.35rem;
      color: var(--muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    textarea {
      width: 100%;
      min-height: 7rem;
      padding: 0.8rem;
      border: 1px solid var(--line);
      border-radius: 14px;
      color: var(--ink);
      background: #0d0e0a;
      resize: vertical;
    }

    .empty {
      display: grid;
      place-items: center;
      min-height: 100%;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 1080px) {
      .shell {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <aside class="panel sidebar">
      <p class="eyebrow">PUBG captured goldens</p>
      <h1 class="brand">Captured Frame Labeler</h1>
      <p class="meta">Selecione um clipe e rotule os frames amostrados. Autosave grava direto no JSON local.</p>
      <div id="clip-list" class="clip-list"></div>
    </aside>

    <section class="panel stage">
      <div class="status-row">
        <div>
          <p class="eyebrow" id="clip-title">Nenhum clipe selecionado</p>
          <strong id="frame-title">Carregando templates...</strong>
        </div>
        <span class="autosave" id="save-state">Autosave aguardando</span>
      </div>

      <div class="video-wrap">
        <div class="empty" id="empty-state">Escolha um clipe na lateral.</div>
        <video id="video" controls playsinline hidden></video>
        <div id="reticle" class="reticle" hidden></div>
      </div>

      <div>
        <div class="toolbar">
          <button class="tool active" data-status="tracked">Tracked</button>
          <button class="tool" data-status="uncertain">Uncertain</button>
          <button class="tool" data-status="occluded">Occluded</button>
          <button class="tool" data-status="lost">Lost</button>
          <button class="tool clear" id="clear-frame">Clear</button>
        </div>
        <p class="hint" id="hint">Click no video para marcar x/y quando o status for tracked ou uncertain.</p>
      </div>
    </section>

    <aside class="panel inspector">
      <p class="eyebrow">Frame queue</p>
      <div id="summary" class="meta">Sem dados ainda.</div>
      <div class="field">
        <label for="notes">Notas do frame atual</label>
        <textarea id="notes" placeholder="Opcional: explique oclusao, ambiguidade ou reticle dificil de ver."></textarea>
      </div>
      <div id="timeline" class="timeline"></div>
    </aside>
  </main>

  <script>
    const state = {
      templates: [],
      template: null,
      activeClipId: null,
      activeFrameIndex: 0,
      selectedStatus: 'tracked',
      saveTimer: null
    };

    const elements = {
      clipList: document.getElementById('clip-list'),
      clipTitle: document.getElementById('clip-title'),
      frameTitle: document.getElementById('frame-title'),
      saveState: document.getElementById('save-state'),
      video: document.getElementById('video'),
      emptyState: document.getElementById('empty-state'),
      reticle: document.getElementById('reticle'),
      hint: document.getElementById('hint'),
      timeline: document.getElementById('timeline'),
      summary: document.getElementById('summary'),
      notes: document.getElementById('notes'),
      clearFrame: document.getElementById('clear-frame')
    };

    const getCurrentFrame = () => {
      if (!state.template) return null;
      return state.template.frames[state.activeFrameIndex] || null;
    };

    const isReady = (frame) => {
      if (!frame || !frame.label || frame.label.status === null) return false;
      if (frame.label.status === 'tracked' || frame.label.status === 'uncertain') {
        return frame.label.x !== null && frame.label.y !== null;
      }
      return true;
    };

    const setSaveState = (message) => {
      elements.saveState.textContent = 'Autosave ' + message;
    };

    const renderClips = () => {
      elements.clipList.innerHTML = '';
      state.templates.forEach((clip) => {
        const button = document.createElement('button');
        button.className = 'clip-card' + (clip.clipId === state.activeClipId ? ' active' : '');
        button.innerHTML = '<strong>' + clip.clipId + '</strong><span class="meta">' +
          clip.summary.missingFrameCount + ' pendentes de ' + clip.summary.totalFrames + '</span>';
        button.addEventListener('click', () => loadTemplate(clip.clipId));
        elements.clipList.appendChild(button);
      });
    };

    const renderFrame = () => {
      const frame = getCurrentFrame();
      if (!state.template || !frame) return;

      elements.clipTitle.textContent = state.template.clipId;
      elements.frameTitle.textContent = 'Frame ' + frame.frameIndex + ' @ ' + frame.timestampSeconds + 's';
      elements.notes.value = frame.label.notes || '';
      elements.video.currentTime = frame.timestampSeconds;
      renderReticle(frame);
      renderTimeline();
      renderSummary();
    };

    const renderReticle = (frame) => {
      if (!frame || frame.label.x === null || frame.label.y === null) {
        elements.reticle.hidden = true;
        return;
      }

      const rect = elements.video.getBoundingClientRect();
      const left = rect.left + (frame.label.x / state.template.frameSize.width) * rect.width;
      const top = rect.top + (frame.label.y / state.template.frameSize.height) * rect.height;
      elements.reticle.style.left = left + 'px';
      elements.reticle.style.top = top + 'px';
      elements.reticle.hidden = false;
    };

    const renderSummary = () => {
      if (!state.template) return;
      const ready = state.template.frames.filter(isReady).length;
      const total = state.template.frames.length;
      elements.summary.textContent = ready + '/' + total + ' frames prontos. Faltam ' + (total - ready) + '.';
    };

    const renderTimeline = () => {
      elements.timeline.innerHTML = '';
      state.template.frames.forEach((frame, index) => {
        const button = document.createElement('button');
        button.className = 'frame-pill' +
          (index === state.activeFrameIndex ? ' active' : '') +
          (isReady(frame) ? ' ready' : '');
        button.innerHTML = '<strong>' + frame.timestampSeconds + 's</strong><span class="meta">' +
          (frame.label.status || 'pending') + '</span>';
        button.addEventListener('click', () => {
          state.activeFrameIndex = index;
          renderFrame();
        });
        elements.timeline.appendChild(button);
      });
    };

    const saveTemplate = async () => {
      if (!state.template) return;
      setSaveState('salvando...');

      const response = await fetch('/api/templates/' + encodeURIComponent(state.template.clipId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state.template)
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'erro desconhecido' }));
        setSaveState('falhou: ' + payload.error);
        return;
      }

      setSaveState('ok');
      await loadTemplates(false);
    };

    const scheduleSave = () => {
      clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(saveTemplate, 220);
      renderTimeline();
      renderSummary();
    };

    const setFrameLabel = (label) => {
      const frame = getCurrentFrame();
      if (!frame) return;
      frame.label = label;
      scheduleSave();
      renderFrame();
    };

    const applyNonVisibleStatus = (status) => {
      setFrameLabel({ status, x: null, y: null, notes: elements.notes.value.trim() || undefined });
    };

    const selectStatus = (status) => {
      state.selectedStatus = status;
      document.querySelectorAll('[data-status]').forEach((button) => {
        button.classList.toggle('active', button.dataset.status === status);
      });
      if (status === 'occluded' || status === 'lost') {
        applyNonVisibleStatus(status);
        return;
      }
      elements.hint.textContent = 'Click no video para marcar x/y quando o status for ' + status + '.';
    };

    const loadTemplates = async (shouldRenderClips = true) => {
      const response = await fetch('/api/templates');
      const payload = await response.json();
      state.templates = payload.templates;
      if (shouldRenderClips) renderClips();
    };

    const loadTemplate = async (clipId) => {
      const response = await fetch('/api/templates/' + encodeURIComponent(clipId));
      const payload = await response.json();
      state.template = payload.template;
      state.activeClipId = clipId;
      state.activeFrameIndex = 0;
      elements.emptyState.hidden = true;
      elements.video.hidden = false;
      elements.video.src = '/media/' + encodeURIComponent(clipId);
      renderClips();
      renderFrame();
    };

    document.querySelectorAll('[data-status]').forEach((button) => {
      button.addEventListener('click', () => selectStatus(button.dataset.status));
    });

    elements.clearFrame.addEventListener('click', () => {
      setFrameLabel({ status: null, x: null, y: null, notes: elements.notes.value.trim() || undefined });
    });

    elements.notes.addEventListener('input', () => {
      const frame = getCurrentFrame();
      if (!frame) return;
      const notes = elements.notes.value.trim();
      frame.label = { ...frame.label, ...(notes ? { notes } : {}) };
      if (!notes) delete frame.label.notes;
      scheduleSave();
    });

    elements.video.addEventListener('click', (event) => {
      if (!state.template) return;
      if (state.selectedStatus !== 'tracked' && state.selectedStatus !== 'uncertain') return;
      const rect = elements.video.getBoundingClientRect();
      const x = Math.round(((event.clientX - rect.left) / rect.width) * state.template.frameSize.width);
      const y = Math.round(((event.clientY - rect.top) / rect.height) * state.template.frameSize.height);
      setFrameLabel({
        status: state.selectedStatus,
        x,
        y,
        notes: elements.notes.value.trim() || undefined
      });
    });

    elements.video.addEventListener('seeked', () => renderReticle(getCurrentFrame()));
    window.addEventListener('resize', () => renderReticle(getCurrentFrame()));

    loadTemplates().then(() => {
      if (state.templates[0]) {
        loadTemplate(state.templates[0].clipId);
      } else {
        elements.frameTitle.textContent = 'Nenhum template encontrado.';
      }
    }).catch((error) => {
      elements.frameTitle.textContent = 'Falha ao carregar templates';
      setSaveState('falhou: ' + error.message);
    });
  </script>
</body>
</html>`;
