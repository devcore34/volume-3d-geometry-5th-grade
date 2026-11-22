import './style.css';
import {
  SECTIONS,
  PALETTES,
  BUILDER_PRESETS,
  RESERVOIR_PRESETS,
  pluralCubes,
  pluralUnitCubes,
  getLayerBreakdown,
  canonicalShapeKey,
  isShapeConnected,
  generateRandomFigure,
} from './data/lessons.js';
import {
  GRID_SECTIONS,
  GRID_PALETTES,
  makeBoxCubes,
  generateRandomGridBox,
} from './data/gridLessons.js';
import { GeometryScene } from './engine/scene3d.js';
import { MINECRAFT_BLOCKS } from './engine/minecraftTextures.js';
import { renderCubesSvg } from './ui/svgThumb.js';
import { renderTextbook2DStage } from './ui/textbook2d.js';
import { IsometricGridController, getIsoStepCaption } from './ui/isometricGrid.js';
import { WhiteboardDraw } from './ui/whiteboardDraw.js';

const TOPICS = {
  volume: SECTIONS,
  grid: GRID_SECTIONS,
};

function getTopicSections(topic = state.topic) {
  return TOPICS[topic] || SECTIONS;
}

function getTopicItems(topic = state.topic) {
  const out = [];
  getTopicSections(topic).forEach((sec, sIdx) => {
    sec.items.forEach((item, iIdx) => {
      out.push({ section: sec, item, sectionIdx: sIdx, itemIdx: iIdx });
    });
  });
  return out;
}

function isGridItem(item) {
  return item && (item.type === 'grid-single' || item.type === 'grid-double' || item.type === 'grid-random');
}

// ==================== APP STATE ====================
const initialTopic = window.location.hash === '#volume' ? 'volume' : 'grid';
const initialSections = TOPICS[initialTopic];

const state = {
  topic: initialTopic, // 'volume' (стр.111–114) | 'grid' (стр.115–117)
  sectionId: initialSections[0].id,
  itemId: initialSections[0].items[0].id,
  viewMode: '2d', // '2d' (textbook flat drawing / dot grid first!) | '3d' (interactive 3D model)
  theme: 'light',
  zen: false,
  leftCollapsed: false,
  rightCollapsed: false,
  markerActive: false,

  // ⛏️ Minecraft Voxel Block Mode (works across BOTH topics!)
  minecraftMode: false,
  minecraftBlock: 'grass',

  // Per-item revealed answer flags & hint flags
  revealed: new Set(),
  hintsOpen: new Set(),
  quizFeedback: new Map(), // itemId -> { type: 'ok' | 'err', text }
  compareFocusSubset: false,

  // Active 3D tool states
  explode: 0,
  layerLimit: null,
  xray: false,
  autoRotate: false,
  projection: 'perspective',
  showDimensions: false,
  interactionMode: 'orbit', // 'orbit' | 'count' | 'peel'
  interactionStats: { counted: 0, peeled: 0, total: 0 },

  // Count-Up Step Animation
  countUpActive: false,
  countUpPlaying: false,
  countUpStep: 0,
  countUpTimer: null,

  // 3D Builder state (Практика №1)
  builderMode: '1a', // '1a' (3 cubes x2) | '1b' (4 cubes x4) | 'free'
  builderTool: 'add', // 'add' | 'remove'
  builderCubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0]],
  builderSaved: {
    '1a': [], // { key, cubes }
    '1b': [],
  },

  // Random Puzzle & Self-Check (Стр. 114 & Стр. 117)
  randomDifficulty: 'medium',
  selfCheck: { a: false, b: false },
  gridSelfCheck: { a: false, b: false },

  // 3D Glass Reservoir Filling Demo (Стр. 111 · Что такое объём)
  reservoirPresetId: 'r322',
  reservoirFilled: 0,
  reservoirPlaying: false,
  reservoirSpeed: 'calm', // 'calm' | 'fast'
  reservoirShowNums: false,
  reservoirTimer: null,

  // Topic 2: Isometric Dot-Grid Studio state (Стр. 115–117)
  isoStep: 4, // 0..4
  isoPlaying: false,
  isoTimer: null,
  isoDrawMode: false,
  isoShowDimNames: true, // Always show color-coded Длина / Ширина / Высота arrows by default!
  isoShowUnits: false,
  isoShowHidden: false,
  highlightDim: null, // 'length' | 'width' | 'height' | null
  gridFlipped: false,
};

// Topic 2 Theory examples (pages 115-116 & sample) show the dot-grid example right away;
// ALL Topic 1 items AND all Topic 2 practice/exercise/random items start hidden until clicked!
for (const sec of GRID_SECTIONS) {
  for (const item of sec.items) {
    if (!item.hideAnswerByDefault) {
      state.revealed.add(item.id);
    }
  }
}

// ==================== DOM ELEMENTS ====================
const viewportEl = document.getElementById('viewport-3d');
const stage2dEl = document.getElementById('stage-2d');
const drawCanvas = document.getElementById('draw-overlay');
const orbitHintEl = document.getElementById('orbit-hint');
const answerBannerEl = document.getElementById('answer-banner');

const btnTopicVolume = document.getElementById('btn-topic-volume');
const btnTopicGrid = document.getElementById('btn-topic-grid');
const btnMinecraft = document.getElementById('btn-minecraft');
const zenMcBtn = document.getElementById('zen-mc');
const mcBarEl = document.getElementById('mc-bar');

const bottomDockIsoEl = document.getElementById('bottom-dock-iso');
const isoPlayBtn = document.getElementById('iso-play-btn');
const isoDrawBtn = document.getElementById('iso-draw-btn');
const isoUndoBtn = document.getElementById('iso-undo-btn');
const isoClearBtn = document.getElementById('iso-clear-btn');
const isoDimNamesBtn = document.getElementById('iso-dimnames-btn');
const isoUnitsBtn = document.getElementById('iso-units-btn');
const isoHiddenBtn = document.getElementById('iso-hidden-btn');
const isoTo3dBtn = document.getElementById('iso-to-3d-btn');
const isoAnswerBtn = document.getElementById('iso-answer-btn');

const btnMode2d = document.getElementById('btn-mode-2d');
const btnMode3d = document.getElementById('btn-mode-3d');
const zenBarEl = document.getElementById('zen-bar');
const btnExitZen = document.getElementById('btn-exit-zen');
const zenPrevBtn = document.getElementById('zen-prev');
const zenNextBtn = document.getElementById('zen-next');
const zenMode2dBtn = document.getElementById('zen-mode-2d');
const zenMode3dBtn = document.getElementById('zen-mode-3d');
const zenAnswerBtn = document.getElementById('zen-answer');
const bottomDock2dEl = document.getElementById('bottom-dock-2d');
const bottomDock3dEl = document.getElementById('bottom-dock');
const bottomDockResEl = document.getElementById('bottom-dock-reservoir');
const resDockPlayBtn = document.getElementById('res-dock-play');
const resDockStep1Btn = document.getElementById('res-dock-step1');
const resDockLayerBtn = document.getElementById('res-dock-layer');
const resDockResetBtn = document.getElementById('res-dock-reset');
const resDockNumsBtn = document.getElementById('res-dock-nums');
const resDockAnswerBtn = document.getElementById('res-dock-answer');
const resDockRotateBtn = document.getElementById('res-dock-rotate');
const resDockDimsBtn = document.getElementById('res-dock-dims');
const btnReveal3d = document.getElementById('btn-reveal-3d');
const btnAnswer2d = document.getElementById('btn-answer-2d');
const btnAnswer3d = document.getElementById('btn-answer-3d');
const btnBack2d = document.getElementById('btn-back-2d');

const sectionTabsEl = document.getElementById('section-tabs');
const topBarEl = document.getElementById('top-bar');
const mobileBackdropEl = document.getElementById('mobile-backdrop');
const btnMobileMenu = document.getElementById('btn-mobile-menu');
const btnMobileInfo = document.getElementById('btn-mobile-info');
const leftRailEl = document.getElementById('left-rail');
const rightPanelEl = document.getElementById('right-panel');
const btnOpenLeft = document.getElementById('btn-open-left');
const btnOpenRight = document.getElementById('btn-open-right');
const railBadgeEl = document.getElementById('rail-badge');
const railTitleEl = document.getElementById('rail-section-title');
const figureListEl = document.getElementById('figure-list');

const itemPageBadgeEl = document.getElementById('item-page-badge');
const rightBodyEl = document.getElementById('right-panel-body');

const liveHudEl = document.getElementById('live-hud');
const markerBarEl = document.getElementById('marker-bar');
const btnMarker = document.getElementById('btn-marker');
const btnTheme = document.getElementById('btn-theme');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');
const btnZen = document.getElementById('btn-zen');
const btnFullscreen = document.getElementById('btn-fullscreen');

const explodeSlider = document.getElementById('explode-slider');
const explodePctEl = document.getElementById('explode-pct');
const layerGroupEl = document.getElementById('layer-group');
const layerButtonsEl = document.getElementById('layer-buttons');
const toolsDividerEl = document.getElementById('tools-divider');
const toolsGroupEl = document.getElementById('tools-group');
const btnAutoRotate = document.getElementById('btn-autorotate');
const btnProjection = document.getElementById('btn-projection');
const btnCountUp = document.getElementById('btn-countup');
const btnTapCount = document.getElementById('btn-tapcount');
const btnPeel = document.getElementById('btn-peel');
const btnXRay = document.getElementById('btn-xray');
const btnDims = document.getElementById('btn-dims');
const toastEl = document.getElementById('toast');

// Auto-enable fast GPU compositing on 4K interactive touch whiteboards / low-core boards
if (
  (window.screen.width >= 2400 && (navigator.maxTouchPoints || 0) > 0) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
) {
  document.body.classList.add('perf-lite');
}

// ==================== INIT 3D ENGINE & WHITEBOARD ====================
const scene3d = new GeometryScene(viewportEl, {
  onInteractionChange(stats) {
    state.interactionStats = stats;
    renderLiveHud();
  },
  onBuilderChange(cubes) {
    state.builderCubes = cubes;
    renderRightPanel();
  },
  onLowPerfDetected() {
    document.body.classList.add('perf-lite');
  },
});

const whiteboard = new WhiteboardDraw(drawCanvas);
const isoGrid = new IsometricGridController(stage2dEl, () => {
  renderStage2D();
  renderIsoDock();
});

// Fade out orbit hint smoothly once the user touches/drags the 3D canvas
let hintDismissed = false;
viewportEl.addEventListener(
  'pointerdown',
  () => {
    if (!hintDismissed) {
      hintDismissed = true;
      orbitHintEl.classList.add('fade-out');
      setTimeout(() => orbitHintEl.classList.add('hidden'), 600);
    }
  },
  { passive: true }
);

// ==================== HELPERS ====================
let toastTimer = null;
function showToast(text, tone = '') {
  toastEl.textContent = text;
  toastEl.className = `toast ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2900);
}

function getActiveEntry() {
  const items = getTopicItems();
  return items.find((e) => e.item.id === state.itemId) || items[0];
}

function getActiveSection() {
  const secs = getTopicSections();
  return secs.find((s) => s.id === state.sectionId) || secs[0];
}

function stopIsoTimer() {
  if (state.isoTimer) {
    clearInterval(state.isoTimer);
    state.isoTimer = null;
  }
  state.isoPlaying = false;
}

function stopCountUpTimer() {
  if (state.countUpTimer) {
    clearInterval(state.countUpTimer);
    state.countUpTimer = null;
  }
  state.countUpPlaying = false;
}

function getActiveReservoirPreset() {
  return (
    RESERVOIR_PRESETS.find((p) => p.id === state.reservoirPresetId) || RESERVOIR_PRESETS[1]
  );
}

function stopReservoirTimer() {
  if (state.reservoirTimer) {
    clearInterval(state.reservoirTimer);
    state.reservoirTimer = null;
  }
  state.reservoirPlaying = false;
}

function resetToolsForNewItem(item) {
  stopCountUpTimer();
  stopReservoirTimer();
  stopIsoTimer();
  state.explode = 0;
  state.layerLimit = null;
  state.xray = false;
  state.countUpActive = false;
  state.countUpStep = 0;
  state.interactionMode = 'orbit';
  state.interactionStats = { counted: 0, peeled: 0, total: item.cubes?.length || 0 };
  state.showDimensions = Boolean(item.showDimensionsDefault);
  state.compareFocusSubset = false;
  state.isoDrawMode = false;
  state.highlightDim = null;
  state.gridFlipped = false;
  isoGrid.setDrawMode(false);
  isoGrid.clearDrawings();

  explodeSlider.value = '0';
  explodePctEl.textContent = '0%';
  scene3d.setExplode(0);
  scene3d.setXRay(false);
  scene3d.setShowNumbers(false);
  scene3d.setInteractionMode('orbit');
  scene3d.setCountVisible(null);
  whiteboard.clear();
}

// ==================== LOAD TOPIC / ITEM ====================
function selectTopic(topic) {
  if (!TOPICS[topic]) return;
  state.topic = topic;
  try {
    history.replaceState(null, '', `#${topic}`);
  } catch {
    // ignore in file:// single-file offline mode
  }
  const firstSec = TOPICS[topic][0];
  selectItem(firstSec.items[0].id);
  requestAnimationFrame(() => updateSafeInsets(false));
}

function selectItem(itemId) {
  const entry = getTopicItems().find((e) => e.item.id === itemId);
  if (!entry) return;

  state.sectionId = entry.section.id;
  state.itemId = entry.item.id;
  const item = entry.item;

  resetToolsForNewItem(item);

  if (isGridItem(item)) {
    state.viewMode = '2d';
    const isRev = state.revealed.has(item.id);
    state.isoStep = isRev ? 4 : 0;
    const activeBox =
      item.type === 'grid-double' || (item.type === 'grid-random' && item.randomKind === 'double')
        ? item.pos1
        : item.box;
    scene3d.loadGridBox(activeBox, {
      palette: item.palette,
      colorCodedFaces:
        Boolean(item.colorCodedFaces) ||
        (item.type === 'grid-random' && item.randomKind === 'double'),
      showDimensions: true,
      instant: true,
    });
  } else if (item.type === 'figure' || item.type === 'random') {
    state.viewMode = '2d';
    scene3d.loadFigure(item.cubes, {
      palette: item.palette,
      dimensions: item.dimensions,
      showDimensions: Boolean(item.showDimensionsDefault),
      view: 'textbook',
      instant: true,
    });
  } else if (item.type === 'compare') {
    state.viewMode = '2d';
    const models = state.compareFocusSubset && item.focusSubset
      ? item.models.filter((m) => item.focusSubset.includes(m.key))
      : item.models;
    scene3d.loadComparison(models, {
      revealAnswers: state.revealed.has(item.id),
      highlightIds: item.highlightIds || [],
    });
  } else if (item.type === 'builder') {
    state.viewMode = '3d';
    scene3d.loadBuilder(state.builderCubes, item.palette || 'emerald');
    scene3d.setBuilderTool(state.builderTool);
  } else if (item.type === 'reservoir') {
    state.viewMode = '3d';
    state.reservoirFilled = 0;
    const p = getActiveReservoirPreset();
    scene3d.loadReservoir(p.nx, p.ny, p.nz, {
      palette: item.palette || 'pink',
      showDimensions: true,
    });
    scene3d.setShowNumbers(state.reservoirShowNums);
    scene3d.setReservoirCount(0, true);
  }

  renderAll();
}

function setViewMode(mode, withRevealAnim = true) {
  if (mode !== '2d' && mode !== '3d') return;
  const prev = state.viewMode;
  state.viewMode = mode;

  if (mode === '2d') {
    // Pause animations & WebGL rendering completely while showing 2D sheet (0% GPU!)
    stopCountUpTimer();
    stopReservoirTimer();
    scene3d.setPaused(true);
  } else {
    stopIsoTimer();
    scene3d.setPaused(false);
    if (prev === '2d' && withRevealAnim) {
      // Dramatic smooth 2D -> 3D reveal sweep!
      scene3d.revealFrom2D();
    }
  }

  renderViewModeUI();
  renderAnswerControls();
  renderLiveHud();
  renderMcBar();
}

function renderStage2D() {
  const { item } = getActiveEntry();
  if (isGridItem(item)) {
    isoGrid.render(item, {
      theme: state.theme,
      step: state.isoStep,
      revealed: state.revealed.has(item.id),
      showUnitGrid: state.isoShowUnits,
      showHiddenEdges: state.isoShowHidden,
      showDimNames: state.isoShowDimNames,
      highlightDim: state.highlightDim,
    });
    return;
  }
  stage2dEl.innerHTML = renderTextbook2DStage(item, {
    theme: state.theme,
    revealed: state.revealed.has(item.id),
    compareFocusSubset: state.compareFocusSubset,
    builderCubes: state.builderCubes,
    reservoirPreset: getActiveReservoirPreset(),
  });
}

function renderViewModeUI() {
  const { item } = getActiveEntry();
  const is2d = state.viewMode === '2d';
  const isRes = item.type === 'reservoir';
  const isGrid = isGridItem(item);

  // Keep WebGL completely idle (0% GPU/CPU) whenever the full 2D sheet covers the stage!
  scene3d.setPaused(is2d);

  stage2dEl.classList.toggle('is-hidden-3d', !is2d);
  bottomDockIsoEl.classList.toggle('hidden', !is2d || !isGrid);
  bottomDock2dEl.classList.toggle('hidden', !is2d || isGrid);
  bottomDock3dEl.classList.toggle('hidden', is2d || isRes);
  bottomDockResEl.classList.toggle('hidden', is2d || !isRes);

  btnTopicVolume?.classList.toggle('active', state.topic === 'volume');
  btnTopicGrid?.classList.toggle('active', state.topic === 'grid');

  btnMode2d.classList.toggle('active', is2d);
  btnMode3d.classList.toggle('active', !is2d);
  zenMode2dBtn.classList.toggle('active', is2d);
  zenMode2dBtn.classList.toggle('primary', is2d);
  zenMode3dBtn.classList.toggle('active', !is2d);
  zenMode3dBtn.classList.toggle('primary', !is2d);

  // Show orbit hint only in 3D mode (until user first drags)
  if (!hintDismissed) {
    orbitHintEl.classList.toggle('hidden', is2d);
  }

  if (is2d) {
    renderStage2D();
    if (isGrid) renderIsoDock();
  }
  renderMcBar();
}

function selectSection(sectionId) {
  const sec = getTopicSections().find((s) => s.id === sectionId);
  if (!sec || sec.items.length === 0) return;
  selectItem(sec.items[0].id);
}

function stepSlide(delta) {
  const items = getTopicItems();
  const idx = items.findIndex((e) => e.item.id === state.itemId);
  if (idx < 0) return;
  const next = (idx + delta + items.length) % items.length;
  selectItem(items[next].item.id);
}

function getActiveGridBox(item) {
  if (!isGridItem(item)) return null;
  const isDouble =
    item.type === 'grid-double' ||
    (item.type === 'grid-random' && item.randomKind === 'double');
  return isDouble ? item.pos1 : item.box;
}

function isGridDoubleItem(item) {
  return (
    item &&
    (item.type === 'grid-double' ||
      (item.type === 'grid-random' && item.randomKind === 'double'))
  );
}

function renderGridBoxThumbSvg(box, paletteKey = 'purple', colorCoded = false, size = 42) {
  const pal = GRID_PALETTES[paletteKey] || GRID_PALETTES.purple;
  const { a, b, h } = box;
  const cos30 = 0.866;
  const sin30 = 0.5;
  const pt = (ia, ib, ih) => [(ia + ib) * cos30, (ia - ib) * sin30 + ih];
  const L = pt(0, 0, 0);
  const T = pt(0, b, 0);
  const F = pt(a, 0, 0);
  const R = pt(a, b, 0);
  const Lb = pt(0, 0, h);
  const Fb = pt(a, 0, h);
  const Rb = pt(a, b, h);
  const all = [L, T, F, R, Lb, Fb, Rb];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of all) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const pad = Math.max(maxX - minX, maxY - minY) * 0.14 + 0.2;
  const span = Math.max(maxX - minX, maxY - minY) + pad * 2;
  const vx = (minX + maxX) / 2 - span / 2;
  const vy = (minY + maxY) / 2 - span / 2;
  const sw = Math.max(span * 0.038, 0.06);
  const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const topFill = colorCoded && pal.faceColorsPos1 ? pal.faceColorsPos1.top : pal.top;
  const leftFill = colorCoded && pal.faceColorsPos1 ? pal.faceColorsPos1.left : pal.left;
  const rightFill = colorCoded && pal.faceColorsPos1 ? pal.faceColorsPos1.right : pal.right;

  return `<svg width="${size}" height="${size}" viewBox="${vx.toFixed(2)} ${vy.toFixed(2)} ${span.toFixed(2)} ${span.toFixed(2)}" aria-hidden="true">
    <polygon points="${fmt([L, T, R, F])}" fill="${topFill}" stroke="${pal.stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    <polygon points="${fmt([L, F, Fb, Lb])}" fill="${leftFill}" stroke="${pal.stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    <polygon points="${fmt([F, R, Rb, Fb])}" fill="${rightFill}" stroke="${pal.stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
  </svg>`;
}

// ==================== RENDER UI ====================
function toggleCurrentAnswer() {
  const { item } = getActiveEntry();
  if (item.type === 'builder') return;

  if (state.revealed.has(item.id)) {
    state.revealed.delete(item.id);
    state.quizFeedback.delete(item.id);
    if (isGridItem(item)) {
      stopIsoTimer();
      state.isoStep = 0;
    }
  } else {
    state.revealed.add(item.id);
    if (isGridItem(item)) {
      stopIsoTimer();
      state.isoStep = 4;
    }
  }

  if (item.type === 'compare') {
    scene3d.setCompareReveal(state.revealed.has(item.id), item.highlightIds || []);
  }
  if (state.viewMode === '2d') {
    renderStage2D();
    if (isGridItem(item)) renderIsoDock();
  }
  renderLeftRail();
  renderRightPanel();
  renderAnswerControls();
  renderLiveHud();
}

function renderAnswerControls() {
  const { item } = getActiveEntry();
  const isBuilder = item.type === 'builder';
  const isRev = state.revealed.has(item.id);

  [zenAnswerBtn, btnAnswer2d, btnAnswer3d, resDockAnswerBtn, isoAnswerBtn].forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('hidden', isBuilder);
    btn.classList.toggle('is-revealed', isRev);
    btn.textContent = isRev ? '🙈 Скрыть' : '👁 Ответ';
  });

  // Floating Answer Banner: shown whenever answer is revealed AND the Right Panel is hidden
  // (Clean Board Zen mode, collapsed right panel, or Mobile).
  // Skip on pre-revealed Topic 2 theory examples (already labeled on 2D & 3D) and when 3D Two-Position HUD is active!
  const skipGridBanner =
    isGridItem(item) &&
    (!item.hideAnswerByDefault || (isGridDoubleItem(item) && state.viewMode === '3d'));
  const showFloatingBanner =
    isRev &&
    !isBuilder &&
    item.type !== 'reservoir' &&
    !skipGridBanner &&
    (state.zen || state.rightCollapsed || isMobileViewport());

  if (!showFloatingBanner) {
    answerBannerEl.classList.add('hidden');
    return;
  }

  let contentHtml = '';
  if (isGridItem(item)) {
    const b = getActiveGridBox(item);
    const total = b.a * b.b * b.h;
    contentHtml = `
      <span>✅ Размеры:</span>
      <span class="answer-banner-num">${b.a} × ${b.b} × ${b.h}</span>
      <span style="font-family:var(--font-mono);font-size:13px">(V = ${pluralCubes(total)})</span>
    `;
  } else if (item.type === 'compare') {
    contentHtml = `
      <span>✅ Ответ:</span>
      <span>${item.compareAnswerText}</span>
    `;
  } else {
    const total = item.cubes.length;
    const layers = getLayerBreakdown(item.cubes);
    const layerInfo =
      layers.length > 1
        ? `<span style="font-family:var(--font-mono);font-size:13px">(${layers.map((l) => l.count).join(' + ')} = ${total})</span>`
        : '';
    contentHtml = `
      <span>✅ Ответ:</span>
      <span class="answer-banner-num">${pluralCubes(total)}</span>
      ${layerInfo}
    `;
  }

  answerBannerEl.innerHTML = `${contentHtml}<button class="answer-banner-close" id="btn-close-ans-banner" title="Скрыть ответ">✕</button>`;
  answerBannerEl.classList.remove('hidden');
  document.getElementById('btn-close-ans-banner').onclick = toggleCurrentAnswer;
}

function renderAll() {
  renderSectionTabs();
  renderLeftRail();
  renderRightPanel();
  renderBottomDock();
  renderViewModeUI();
  renderAnswerControls();
  renderLiveHud();
  renderMcBar();
}

function renderSectionTabs() {
  sectionTabsEl.innerHTML = getTopicSections()
    .map((sec) => {
      const gPal = GRID_PALETTES[sec.palette];
      const vPal = PALETTES[sec.palette];
      const dotColor = gPal?.fill3d || vPal?.fill || '#3b82f6';
      const active = sec.id === state.sectionId ? 'active' : '';
      return `<button class="section-tab ${active}" data-section="${sec.id}">
        <span class="tab-dot" style="background:${dotColor}"></span>
        <span>${sec.shortTitle}</span>
      </button>`;
    })
    .join('');

  sectionTabsEl.querySelectorAll('.section-tab').forEach((btn) => {
    btn.addEventListener('click', () => selectSection(btn.dataset.section));
  });
}

function renderLeftRail() {
  const sec = getActiveSection();
  railBadgeEl.textContent = sec.badge;
  railTitleEl.textContent = sec.title;

  figureListEl.innerHTML = sec.items
    .map((item) => {
      const active = item.id === state.itemId ? 'active' : '';
      let thumbHtml = '';
      let subText = '';
      let subClass = 'fig-sub';

      if (isGridItem(item)) {
        const b = getActiveGridBox(item);
        const isRev = state.revealed.has(item.id);
        if (item.type === 'grid-random') {
          thumbHtml = '🎲';
          subText = isRev ? `${b.a}×${b.b}×${b.h} (V=${b.a * b.b * b.h})` : 'Случайный чертёж';
        } else {
          thumbHtml = renderGridBoxThumbSvg(b, item.palette, Boolean(item.colorCodedFaces), 42);
          if (item.type === 'grid-double') {
            subText = isRev ? '2 положения · ✓' : '2 положения · ?';
          } else {
            subText = isRev
              ? `${b.a}×${b.b}×${b.h} · ${b.a * b.b * b.h} куб.`
              : `${b.a}×${b.b}×${b.h} · ? на сетке`;
          }
        }
        if (isRev) subClass += ' revealed';
      } else if (item.type === 'figure' || item.type === 'random') {
        thumbHtml = renderCubesSvg(item.cubes, item.palette, 42);
        if (state.revealed.has(item.id)) {
          subText = `${item.cubes.length} куб. ед.`;
          subClass += ' revealed';
        } else {
          subText = '? куб. ед.';
        }
      } else if (item.type === 'compare') {
        thumbHtml = '⚖️';
        subText = `${item.models.length} фигуры рядом`;
      } else if (item.type === 'builder') {
        thumbHtml = '🧱';
        const c1 = state.builderSaved['1a'].length;
        const c2 = state.builderSaved['1b'].length;
        subText = `3 куба: ${c1}/2 · 4 куба: ${c2}/4`;
      } else if (item.type === 'reservoir') {
        thumbHtml = '📦';
        const p = getActiveReservoirPreset();
        subText = `Ёмкость ${p.nx}×${p.ny}×${p.nz}`;
      }

      return `<button class="figure-card ${active}" data-item="${item.id}">
        <div class="fig-thumb">${thumbHtml}</div>
        <div class="fig-meta">
          <div class="fig-name">${item.shortLabel}</div>
          <div class="${subClass}">${subText}</div>
        </div>
      </button>`;
    })
    .join('');

  figureListEl.querySelectorAll('.figure-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectItem(btn.dataset.item);
      if (isMobileViewport()) closeMobileDrawers();
    });
  });
}

function renderBottomDock() {
  const { item } = getActiveEntry();
  const isBuilder = item.type === 'builder';
  const isCompare = item.type === 'compare';
  const isReservoir = item.type === 'reservoir';

  if (isReservoir) {
    const p = getActiveReservoirPreset();
    const total = p.nx * p.ny * p.nz;
    const isFull = state.reservoirFilled >= total;
    resDockPlayBtn.textContent = state.reservoirPlaying
      ? '⏸ Пауза'
      : isFull
        ? '↺ Наполнить ещё раз'
        : state.reservoirFilled > 0
          ? '▶ Продолжить'
          : '▶ Наполнить до краёв';
    resDockNumsBtn.classList.toggle('active', state.reservoirShowNums);
    resDockRotateBtn.classList.toggle('active', state.autoRotate);
    resDockDimsBtn.classList.toggle('active', state.showDimensions);
    return;
  }

  // Show/hide layer & pedagogical tools cleanly based on mode
  layerGroupEl.classList.toggle('hidden', isBuilder);
  toolsDividerEl.classList.toggle('hidden', isBuilder);
  btnCountUp.classList.toggle('hidden', isBuilder || isCompare);
  btnTapCount.classList.toggle('hidden', isBuilder);
  btnPeel.classList.toggle('hidden', isBuilder);
  btnDims.classList.toggle('hidden', isBuilder || isCompare);

  // Build layer buttons dynamically (Все, 1, 2, ... maxLayer)
  if (!isBuilder) {
    const maxL = scene3d.getMaxLayer();
    let html = `<button class="dock-btn ${state.layerLimit === null ? 'active' : ''}" data-layer="all">Все</button>`;
    for (let l = 1; l <= maxL; l++) {
      html += `<button class="dock-btn ${state.layerLimit === l ? 'active' : ''}" data-layer="${l}">${l}</button>`;
    }
    layerButtonsEl.innerHTML = html;
    layerButtonsEl.querySelectorAll('[data-layer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.layer === 'all' ? null : Number(btn.dataset.layer);
        state.layerLimit = val;
        scene3d.setLayerLimit(val);
        renderBottomDock();
        renderLiveHud();
      });
    });
  }

  btnAutoRotate.classList.toggle('active', state.autoRotate);
  btnProjection.classList.toggle('active', state.projection === 'ortho');
  btnProjection.textContent = state.projection === 'ortho' ? '📐 Изом.' : '🧊 3D';
  btnCountUp.classList.toggle('active', state.countUpActive);
  btnTapCount.classList.toggle('active', state.interactionMode === 'count');
  btnPeel.classList.toggle('active', state.interactionMode === 'peel');
  btnXRay.classList.toggle('active', state.xray);
  btnDims.classList.toggle('active', state.showDimensions);
}

function renderLiveHud() {
  liveHudEl.classList.remove('is-res-full');
  if (state.viewMode === '2d') {
    liveHudEl.classList.add('hidden');
    return;
  }
  const { item } = getActiveEntry();

  // 0) 3D Glass Reservoir Live Status & Full-to-Brim Banner (Answer stays hidden until clicked!)
  if (item.type === 'reservoir') {
    const p = getActiveReservoirPreset();
    const total = p.nx * p.ny * p.nz;
    const filled = state.reservoirFilled;
    const pct = Math.round((filled / total) * 100);
    const isRev = state.revealed.has(item.id);
    liveHudEl.classList.remove('hidden');

    if (isRev) {
      liveHudEl.classList.add('is-res-full');
      liveHudEl.innerHTML = `
        <span>✅ <strong>Ответ:</strong> Ёмкость вмещает</span>
        <span class="hud-big-num" style="background:rgba(16,185,129,0.2);color:var(--success)">${pluralCubes(total)}</span>
        <span style="font-family:var(--font-mono);font-size:13px">(${p.nx}×${p.ny}×${p.nz} = ${total})</span>
      `;
    } else if (filled >= total) {
      liveHudEl.classList.add('is-res-full');
      liveHudEl.innerHTML = `
        <span>✨ <strong>Заполнено до краёв!</strong> Сколько куб. ед. вместилось?</span>
        <button class="mini-btn primary" id="hud-res-reveal">👁 Показать ответ</button>
      `;
      document.getElementById('hud-res-reveal').onclick = toggleCurrentAnswer;
    } else if (filled === 0) {
      liveHudEl.innerHTML = `
        <span>📦 Пустой резервуар <strong>${p.label}</strong> — нажми «Наполнить до краёв»</span>
      `;
    } else if (state.reservoirShowNums) {
      liveHudEl.innerHTML = `
        <span>📦 В резервуаре:</span>
        <span class="hud-big-num">${filled} куб. ед.</span>
        <div class="hud-res-bar"><span style="width:${pct}%"></span></div>
        <span style="font-size:12.5px;color:var(--text-soft)">${pct}%</span>
      `;
    } else {
      liveHudEl.innerHTML = `
        <span>📦 Наполнение резервуара:</span>
        <div class="hud-res-bar"><span style="width:${pct}%"></span></div>
        <span style="font-size:13px;font-weight:800">${pct}%</span>
      `;
    }
    return;
  }

  // 1) Step-by-step Count-Up HUD
  if (state.countUpActive) {
    const total = scene3d.getCubeCount();
    const isRev = state.revealed.has(item.id) || state.countUpStep >= total;
    liveHudEl.classList.remove('hidden');
    liveHudEl.innerHTML = `
      <span>🔢 Считаем по одному:</span>
      <span class="hud-big-num">${state.countUpStep}${isRev ? ` / ${total}` : ''}</span>
      <button class="mini-btn primary" id="hud-play">${state.countUpPlaying ? '⏸ Пауза' : '▶ Пуск'}</button>
      <button class="mini-btn" id="hud-prev" title="Назад на 1 куб">−1</button>
      <button class="mini-btn" id="hud-next" title="Добавить 1 куб">+1</button>
      <button class="mini-btn" id="hud-reset" title="Начать с 1">↺</button>
      <button class="mini-btn" id="hud-done">Показать все</button>
    `;
    document.getElementById('hud-play').onclick = toggleCountUpPlay;
    document.getElementById('hud-prev').onclick = () => stepCountUp(-1);
    document.getElementById('hud-next').onclick = () => stepCountUp(1);
    document.getElementById('hud-reset').onclick = () => {
      stopCountUpTimer();
      state.countUpStep = 1;
      scene3d.setCountVisible(1);
      renderLiveHud();
    };
    document.getElementById('hud-done').onclick = exitCountUpMode;
    return;
  }

  // 2) Interactive Tap-to-Count HUD
  if (state.interactionMode === 'count') {
    liveHudEl.classList.remove('hidden');
    liveHudEl.innerHTML = `
      <span>👆 Нажимай на кубы на доске:</span>
      <span class="hud-big-num">${state.interactionStats.counted}</span>
      <button class="mini-btn" id="hud-clear-marks">↺ Сбросить</button>
      <button class="mini-btn primary" id="hud-exit-interact">Готово</button>
    `;
    document.getElementById('hud-clear-marks').onclick = () => scene3d.resetInteractiveMarks();
    document.getElementById('hud-exit-interact').onclick = () => setInteractionMode('orbit');
    return;
  }

  // 3) Interactive Peel HUD
  if (state.interactionMode === 'peel') {
    liveHudEl.classList.remove('hidden');
    liveHudEl.innerHTML = `
      <span>🪟 Нажми на куб, чтобы заглянуть за него · Снято:</span>
      <span class="hud-big-num">${state.interactionStats.peeled}</span>
      <button class="mini-btn" id="hud-clear-marks">↺ Вернуть все</button>
      <button class="mini-btn primary" id="hud-exit-interact">Готово</button>
    `;
    document.getElementById('hud-clear-marks').onclick = () => scene3d.resetInteractiveMarks();
    document.getElementById('hud-exit-interact').onclick = () => setInteractionMode('orbit');
    return;
  }

  // 4) Layer Slicer active HUD
  if (state.layerLimit !== null && item.type !== 'builder') {
    let cubes = [];
    if (isGridItem(item)) {
      const b = getActiveGridBox(item);
      cubes = makeBoxCubes(b.a, b.b, b.h);
    } else if (item.type === 'compare') {
      cubes = item.models.flatMap((m) => m.cubes);
    } else {
      cubes = item.cubes || [];
    }
    const shownCount = cubes.filter(([, y]) => y + 1 <= state.layerLimit).length;
    const isRev = state.revealed.has(item.id);
    const label =
      item.type === 'compare'
        ? `Показаны слои 1–${state.layerLimit}`
        : isRev
          ? `Слои 1–${state.layerLimit}: ${pluralUnitCubes(shownCount)}`
          : `Показаны слои с 1 по ${state.layerLimit} (посчитай!)`;
    liveHudEl.classList.remove('hidden');
    liveHudEl.innerHTML = `
      <span>🍰 ${label}</span>
      <button class="mini-btn primary" id="hud-all-layers">Показать все слои</button>
    `;
    document.getElementById('hud-all-layers').onclick = () => {
      state.layerLimit = null;
      scene3d.setLayerLimit(null);
      renderBottomDock();
      renderLiveHud();
    };
    return;
  }

  // 5) Topic 2 Two-Position 90° Flip Live HUD in 3D mode (Page 117 Образец + Практ. a-d + Random double)
  if (isGridDoubleItem(item)) {
    const pos = state.gridFlipped ? item.pos2 : item.pos1;
    liveHudEl.classList.remove('hidden');
    liveHudEl.innerHTML = `
      <span>📐 <strong>${state.gridFlipped ? 'Положение 2' : 'Положение 1'}</strong> (${pos.a} × ${pos.b} × ${pos.h})</span>
      <button class="mini-btn flip-btn-3d" id="hud-flip-90">🔄 Повернуть на 90°</button>
    `;
    document.getElementById('hud-flip-90').onclick = toggleGridFlip;
    return;
  }

  liveHudEl.classList.add('hidden');
}

// ==================== RIGHT PANEL CONTENT ====================
function renderRightPanel() {
  const { item } = getActiveEntry();
  itemPageBadgeEl.textContent = item.page;

  if (isGridItem(item)) {
    renderGridPanel(item);
    return;
  }
  if (item.type === 'reservoir') {
    renderReservoirPanel(item);
    return;
  }
  if (item.type === 'builder') {
    renderBuilderPanel(item);
    return;
  }
  if (item.type === 'compare') {
    renderComparePanel(item);
    return;
  }
  renderFigurePanel(item);
}

// ==================== TOPIC 2: ISOMETRIC DOT-GRID PANEL & CONTROLS ====================
function renderGridPanel(item) {
  const isDouble = isGridDoubleItem(item);
  const baseBox = getActiveGridBox(item);
  const box = isDouble && state.gridFlipped ? item.pos2 : baseBox;
  const totalVol = box.a * box.b * box.h;
  const isRev = state.revealed.has(item.id);
  const hintOpen = state.hintsOpen.has(item.id);
  const hl = state.highlightDim;

  let html = `<h2 class="card-title">${item.title}</h2>`;
  html += `<p class="card-desc">${item.description}</p>`;

  // Clickable 3-color Dimension Legend (Длина / Ширина / Высота) — tap any to glow its edges on 2D & 3D!
  html += `
    <div class="iso-dim-section">
      <div class="iso-dim-chips">
        <button class="iso-dim-chip is-length ${hl === 'length' ? 'is-active' : ''}" data-hl-dim="length" title="Нажми, чтобы подсветить Длину (↗) на чертеже">
          <span>↗ Длина</span>
          <strong>${box.b} ед.</strong>
        </button>
        <button class="iso-dim-chip is-width ${hl === 'width' ? 'is-active' : ''}" data-hl-dim="width" title="Нажми, чтобы подсветить Ширину (↘) на чертеже">
          <span>↘ Ширина</span>
          <strong>${box.a} ед.</strong>
        </button>
        <button class="iso-dim-chip is-height ${hl === 'height' ? 'is-active' : ''}" data-hl-dim="height" title="Нажми, чтобы подсветить Высоту (↕) на чертеже">
          <span>↕ Высота</span>
          <strong>${box.h} ед.</strong>
        </button>
      </div>
      <div class="iso-dim-hint">👆 Нажми на <strong>Длину</strong>, <strong>Ширину</strong> или <strong>Высоту</strong> — подсветим эти рёбра на чертеже!</div>
    </div>
  `;

  if (item.callout) {
    html += `<div class="callout-box">💬 ${item.callout}</div>`;
  }

  // Random Generator box (Куб / Кубоид / 2 положения)
  if (item.type === 'grid-random') {
    const kind = item.randomKind || 'cuboid';
    html += `
      <div class="quiz-box">
        <div class="vol-label">Тип случайного задания на сетке</div>
        <div class="seg-tabs">
          <button class="seg-tab ${kind === 'cube' ? 'active' : ''}" data-gkind="cube">Куб</button>
          <button class="seg-tab ${kind === 'cuboid' ? 'active' : ''}" data-gkind="cuboid">Кубоид</button>
          <button class="seg-tab ${kind === 'double' ? 'active' : ''}" data-gkind="double">2 положения</button>
        </div>
        <button id="btn-gen-grid-random" class="btn-action primary full">🎲 Новое случайное задание</button>
      </div>
    `;
  }

  // Two-position 90° smooth 3D flip showcase (Page 117)
  if (isDouble) {
    html += `
      <div class="reservoir-promo">
        <div class="reservoir-promo-title">🔄 Два положения одного кубоида</div>
        <div class="reservoir-promo-desc">
          ${
            state.gridFlipped
              ? `Сейчас: <strong>Положение 2</strong> (${item.pos2.a} × ${item.pos2.b} × ${item.pos2.h}). Нажми, чтобы вернуть обратно!`
              : `Сейчас: <strong>Положение 1</strong> (${item.pos1.a} × ${item.pos1.b} × ${item.pos1.h}). Поверни на 90° в 3D и проследи за цветными гранями!`
          }
        </div>
        <button id="btn-panel-flip90" class="btn-action flip-btn-3d full">
          🔄 ${state.gridFlipped ? 'Вернуть в Положение 1' : 'Повернуть на 90° в 3D →'}
        </button>
      </div>
    `;
  }

  // Step-by-step teaching controls + magnetic dot-snap drawing
  html += `
    <div class="quiz-box">
      <div class="vol-label">Объяснение у доски (4 простых шага)</div>
      <div class="iso-step-caption">${getIsoStepCaption(isRev ? state.isoStep : 0)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button id="btn-panel-iso-play" class="btn-action primary">${
          state.isoPlaying ? '⏸ Пауза' : '▶ Пошагово'
        }</button>
        <button id="btn-panel-iso-draw" class="btn-action ${state.isoDrawMode ? 'primary' : ''}">✍️ Рисовать</button>
      </div>
      <div class="iso-step-pills">
        ${[0, 1, 2, 3, 4]
          .map(
            (s) =>
              `<button class="seg-tab ${(isRev ? state.isoStep : 0) === s ? 'active' : ''}" data-panel-step="${s}">${
                s === 0 ? 'Сетка' : `Шаг ${s}`
              }</button>`
          )
          .join('')}
      </div>
    </div>
  `;

  // Answer / Volume reveal block (strictly hidden on practice/random items until clicked!)
  if (isRev) {
    html += `
      <div class="volume-showcase">
        <div class="vol-label">✅ Ответ показан на сетке · Объём</div>
        <div class="vol-big">${pluralCubes(totalVol)}</div>
        <div class="vol-formula">${box.a} × ${box.b} × ${box.h} = ${totalVol} куб. ед.</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button id="btn-grid-toggle-rev" class="btn-action">🙈 Скрыть сетку</button>
        <button id="btn-grid-open-mc" class="btn-action ${state.minecraftMode ? 'success' : ''}">⛏️ Minecraft</button>
      </div>
    `;
  } else {
    html += `
      <div class="quiz-box">
        <button id="btn-grid-toggle-rev" class="btn-action success full">👁 Показать ответ на сетке</button>
        <button id="btn-grid-open-mc" class="btn-action full">⛏️ Показать фигуру из блоков Minecraft</button>
      </div>
    `;
  }

  // Collapsible Hint
  if (item.hint) {
    html += `<button id="btn-grid-hint" class="hint-toggle-btn">${
      hintOpen ? '▾ Скрыть подсказку' : '💡 Показать подсказку для класса'
    }</button>`;
    if (hintOpen) {
      html += `<div class="hint-content">${item.hint}</div>`;
    }
  }

  // Textbook Page 117 "Проверьте себя" checklist on final generator slide
  if (item.type === 'grid-random') {
    html += `
      <div class="selfcheck-card">
        <div class="selfcheck-title">✅ Проверьте себя (стр. 117)</div>
        <label class="check-item">
          <input type="checkbox" id="chk-gself-a" ${state.gridSelfCheck.a ? 'checked' : ''} />
          <span>a) Я могу нарисовать куб на трёхмерной сетке.</span>
        </label>
        <label class="check-item">
          <input type="checkbox" id="chk-gself-b" ${state.gridSelfCheck.b ? 'checked' : ''} />
          <span>b) Я могу нарисовать кубоид на трёхмерной сетке.</span>
        </label>
      </div>
    `;
  }

  rightBodyEl.innerHTML = html;

  // Bind Topic 2 panel events
  rightBodyEl.querySelectorAll('[data-hl-dim]').forEach((btn) => {
    btn.onclick = () => {
      const dim = btn.dataset.hlDim;
      state.highlightDim = state.highlightDim === dim ? null : dim;
      if (state.highlightDim) {
        state.isoShowDimNames = true;
        if (state.viewMode === '3d' && !state.showDimensions) {
          state.showDimensions = true;
          scene3d.setShowDimensions(true);
          renderBottomDock();
        }
      }
      scene3d.setHighlightDim(state.highlightDim);
      if (state.viewMode === '2d') {
        renderStage2D();
        renderIsoDock();
      }
      renderRightPanel();
      if (isMobileViewport() && state.highlightDim) closeMobileDrawers();
    };
  });

  const revBtn = document.getElementById('btn-grid-toggle-rev');
  if (revBtn) revBtn.onclick = toggleCurrentAnswer;

  const mcBtn = document.getElementById('btn-grid-open-mc');
  if (mcBtn) {
    mcBtn.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      if (!state.minecraftMode) {
        toggleMinecraftMode(true);
      } else {
        setViewMode('3d', true);
      }
    };
  }

  const flipBtn = document.getElementById('btn-panel-flip90');
  if (flipBtn) {
    flipBtn.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      toggleGridFlip();
    };
  }

  const playBtn = document.getElementById('btn-panel-iso-play');
  if (playBtn) {
    playBtn.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      toggleIsoPlay();
    };
  }

  const drawBtn = document.getElementById('btn-panel-iso-draw');
  if (drawBtn) {
    drawBtn.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      toggleIsoDrawMode();
    };
  }

  rightBodyEl.querySelectorAll('[data-panel-step]').forEach((b) => {
    b.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      setIsoStep(Number(b.dataset.panelStep));
    };
  });

  const hintBtn = document.getElementById('btn-grid-hint');
  if (hintBtn) {
    hintBtn.onclick = () => {
      if (state.hintsOpen.has(item.id)) state.hintsOpen.delete(item.id);
      else state.hintsOpen.add(item.id);
      renderRightPanel();
    };
  }

  if (item.type === 'grid-random') {
    rightBodyEl.querySelectorAll('[data-gkind]').forEach((b) => {
      b.onclick = () => {
        item.randomKind = b.dataset.gkind;
        regenerateGridRandom(item);
      };
    });
    const genBtn = document.getElementById('btn-gen-grid-random');
    if (genBtn) {
      genBtn.onclick = () => {
        if (isMobileViewport()) closeMobileDrawers();
        regenerateGridRandom(item);
      };
    }
    const chkA = document.getElementById('chk-gself-a');
    const chkB = document.getElementById('chk-gself-b');
    if (chkA) chkA.onchange = () => (state.gridSelfCheck.a = chkA.checked);
    if (chkB) chkB.onchange = () => (state.gridSelfCheck.b = chkB.checked);
  }
}

function regenerateGridRandom(item) {
  const kind = item.randomKind || 'cuboid';
  const gen = generateRandomGridBox(kind);
  item.isCube = gen.isCube;
  item.box = gen.box;
  if (gen.pos1 && gen.pos2) {
    item.pos1 = gen.pos1;
    item.pos2 = gen.pos2;
  }
  item.title = gen.title;
  item.description = gen.description;
  item.hint = gen.hint;
  item.colorCodedFaces = kind === 'double';
  item.palette = kind === 'cube' ? 'purple' : kind === 'double' ? 'sample' : 'peach';

  state.revealed.delete(item.id);
  state.hintsOpen.delete(item.id);
  resetToolsForNewItem(item);
  state.isoStep = 0;
  state.viewMode = '2d';

  scene3d.loadGridBox(getActiveGridBox(item), {
    palette: item.palette,
    colorCodedFaces: kind === 'double',
    showDimensions: true,
    instant: true,
  });

  showToast('🎲 Новое задание на 3D-сетке готово! Нарисуйте по точкам или нажмите «👁 Ответ»');
  renderAll();
}

function setIsoStep(step) {
  const { item } = getActiveEntry();
  if (!isGridItem(item)) return;
  stopIsoTimer();
  state.isoStep = Math.max(0, Math.min(4, step));
  if (state.isoStep > 0) {
    state.revealed.add(item.id);
  } else if (item.hideAnswerByDefault) {
    state.revealed.delete(item.id);
  }
  if (state.viewMode !== '2d') {
    setViewMode('2d', false);
  } else {
    renderStage2D();
    renderIsoDock();
  }
  renderLeftRail();
  renderRightPanel();
  renderAnswerControls();
}

function toggleIsoPlay() {
  const { item } = getActiveEntry();
  if (!isGridItem(item)) return;
  if (state.isoPlaying) {
    stopIsoTimer();
    renderIsoDock();
    renderRightPanel();
    return;
  }

  if (state.isoDrawMode) {
    state.isoDrawMode = false;
    isoGrid.setDrawMode(false);
  }

  state.revealed.add(item.id);
  state.isoStep = 1;
  state.isoPlaying = true;
  if (state.viewMode !== '2d') {
    state.viewMode = '2d';
    scene3d.setPaused(true);
  }
  renderViewModeUI();
  renderLeftRail();
  renderRightPanel();
  renderAnswerControls();

  state.isoTimer = setInterval(() => {
    if (state.isoStep >= 4) {
      stopIsoTimer();
      renderIsoDock();
      renderRightPanel();
      return;
    }
    state.isoStep += 1;
    renderStage2D();
    renderIsoDock();
    renderRightPanel();
    if (state.isoStep >= 4) {
      stopIsoTimer();
      renderIsoDock();
      renderRightPanel();
    }
  }, 1350);
}

function toggleIsoDrawMode() {
  const { item } = getActiveEntry();
  if (!isGridItem(item)) return;
  stopIsoTimer();
  state.isoDrawMode = !state.isoDrawMode;
  isoGrid.setDrawMode(state.isoDrawMode);
  if (state.isoDrawMode) {
    if (state.markerActive) setMarkerActive(false);
    if (state.viewMode !== '2d') {
      state.viewMode = '2d';
      scene3d.setPaused(true);
    }
    showToast('✍️ Тяни от точки к точке — линия сама примагнитится к сетке!');
  }
  renderViewModeUI();
  renderRightPanel();
}

function renderIsoDock() {
  const { item } = getActiveEntry();
  if (!isGridItem(item)) return;
  const isRev = state.revealed.has(item.id);
  const shownStep = isRev ? state.isoStep : 0;

  isoPlayBtn.textContent = state.isoPlaying ? '⏸ Пауза' : '▶ Пошагово';
  bottomDockIsoEl.querySelectorAll('.iso-step-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.isoStep) === shownStep);
  });
  isoDrawBtn.classList.toggle('active', state.isoDrawMode);
  const hasLines = isoGrid.hasUserLines();
  isoUndoBtn.classList.toggle('hidden', !hasLines);
  isoClearBtn.classList.toggle('hidden', !hasLines);
  isoDimNamesBtn?.classList.toggle('active', state.isoShowDimNames);
  isoUnitsBtn.classList.toggle('active', state.isoShowUnits);
  isoHiddenBtn.classList.toggle('active', state.isoShowHidden);
}

function toggleGridFlip() {
  const { item } = getActiveEntry();
  if (!isGridDoubleItem(item)) return;
  if (state.viewMode !== '3d') {
    setViewMode('3d', false);
    // Flip right after switching so students watch the 90° tip-over live!
    setTimeout(() => {
      state.gridFlipped = !state.gridFlipped;
      scene3d.flipGridBox(state.gridFlipped);
      renderLiveHud();
      renderRightPanel();
    }, 140);
    return;
  }
  state.gridFlipped = !state.gridFlipped;
  scene3d.flipGridBox(state.gridFlipped);
  renderLiveHud();
  renderRightPanel();
}

// ==================== MINECRAFT VOXEL BLOCK MODE ====================
function toggleMinecraftMode(force) {
  const next = typeof force === 'boolean' ? force : !state.minecraftMode;
  state.minecraftMode = next;
  scene3d.setMinecraftMode(state.minecraftMode, state.minecraftBlock);

  if (state.minecraftMode) {
    if (state.viewMode === '2d') {
      setViewMode('3d', true);
    }
    showToast('⛏️ Режим Minecraft включён! Выбирай тип блоков внизу', 'ok');
  } else {
    showToast('🧊 Включён обычный стиль учебника');
  }
  renderMcBar();
  renderRightPanel();
}

function selectMinecraftBlock(blockId) {
  state.minecraftBlock = blockId;
  state.minecraftMode = true;
  scene3d.setMinecraftMode(true, blockId);
  renderMcBar();
}

function renderMcBar() {
  btnMinecraft?.classList.toggle('active', state.minecraftMode);
  zenMcBtn?.classList.toggle('active', state.minecraftMode);
  zenMcBtn?.classList.toggle('primary', state.minecraftMode);

  const showBar = state.minecraftMode && state.viewMode === '3d';
  mcBarEl.classList.toggle('hidden', !showBar);
  document.body.classList.toggle('mc-active', showBar);
  if (!showBar) return;

  mcBarEl.innerHTML = `
    <span class="mc-bar-tag">⛏️ Блоки:</span>
    ${MINECRAFT_BLOCKS.map(
      (b) =>
        `<button class="mc-block-btn ${b.id === state.minecraftBlock ? 'active' : ''}" data-mc-block="${b.id}" title="${b.label}">
          <span>${b.icon}</span><span>${b.label}</span>
        </button>`
    ).join('')}
  `;

  mcBarEl.querySelectorAll('[data-mc-block]').forEach((btn) => {
    btn.onclick = () => selectMinecraftBlock(btn.dataset.mcBlock);
  });
}

function renderFigurePanel(item) {
  const total = item.cubes.length;
  const isRevealed = state.revealed.has(item.id);
  const hintOpen = state.hintsOpen.has(item.id);
  const layers = getLayerBreakdown(item.cubes);
  const fb = state.quizFeedback.get(item.id);

  let html = `<h2 class="card-title">${item.title}</h2>`;
  html += `<p class="card-desc">${item.description}</p>`;

  if (item.callout) {
    html += `<div class="callout-box">💬 ${item.callout}</div>`;
  }

  // Prominent shortcut to the 3D Glass Reservoir filling demo right inside "1. Единичный куб"!
  if (item.hasReservoirShortcut) {
    html += `
      <div class="reservoir-promo">
        <div class="reservoir-promo-title">📦 Наглядно: как измерить объём?</div>
        <div class="reservoir-promo-desc">
          Запусти 3D-анимацию: наполни прозрачный резервуар этими единичными кубами плавно до самых краёв!
        </div>
        <button id="btn-open-reservoir" class="btn-action primary full">▶ Наполнить 3D-резервуар кубами →</button>
      </div>
    `;
  }

  // Random puzzle generator bar if item.type === 'random'
  if (item.type === 'random') {
    html += `
      <div class="quiz-box">
        <div class="vol-label">Сложность новой 3D-фигуры</div>
        <div class="seg-tabs">
          <button class="seg-tab ${state.randomDifficulty === 'easy' ? 'active' : ''}" data-diff="easy">Легко</button>
          <button class="seg-tab ${state.randomDifficulty === 'medium' ? 'active' : ''}" data-diff="medium">Средне</button>
          <button class="seg-tab ${state.randomDifficulty === 'hard' ? 'active' : ''}" data-diff="hard">Сложно</button>
        </div>
        <button id="btn-gen-random" class="btn-action primary full">🎲 Новая случайная 3D-фигура</button>
      </div>
    `;
  }

  // Answer / Quiz Block (strictly hidden until teacher clicks «👁 Показать ответ»!)
  if (isRevealed) {
    html += `
      <div class="volume-showcase">
        <div class="vol-label">✅ Ответ · Объём фигуры</div>
        <div class="vol-big">${pluralCubes(total)}</div>
        <div style="font-size:13px;font-weight:700;color:var(--text-muted)">
          ${item.revealedNote || `Состоит из ${pluralUnitCubes(total)}`}
        </div>
        ${item.formula ? `<div class="vol-formula">${item.formula}</div>` : ''}
      </div>
    `;

    // Layer breakdown
    if (layers.length > 1) {
      const sumExpr = layers.map((l) => l.count).join(' + ') + ` = ${total}`;
      html += `
        <div class="layer-breakdown">
          <div class="vol-label">Разбор по слоям (снизу вверх)</div>
          ${layers
            .map(
              (l) => `<div class="layer-row">
                <span>Слой ${l.level}</span>
                <span class="layer-pill-num">${l.count} куб.</span>
              </div>`
            )
            .join('')}
          <div class="layer-row" style="border-top:1px solid var(--border-soft);padding-top:6px;margin-top:2px">
            <span>Сумма</span>
            <span class="layer-pill-num">${sumExpr}</span>
          </div>
        </div>
      `;
    }

    // Teacher button to hide answer again
    html += `<button id="btn-toggle-reveal" class="btn-action full">🙈 Скрыть ответ</button>`;
  } else {
    html += `
      <div class="quiz-box">
        <button id="btn-toggle-reveal" class="btn-action success full">👁 Показать ответ</button>
        <div class="vol-label" style="margin-top:2px">Или проверьте ответ ученика</div>
        <div class="quiz-row">
          <input id="quiz-answer-input" class="quiz-input" type="number" min="1" max="99" inputmode="numeric" placeholder="?" />
          <button id="btn-check-answer" class="btn-action primary">Проверить</button>
        </div>
        ${fb ? `<div class="quiz-feedback ${fb.type}">${fb.text}</div>` : ''}
      </div>
    `;
  }

  // Collapsible Hint
  if (item.hint) {
    html += `<button id="btn-toggle-hint" class="hint-toggle-btn">${
      hintOpen ? '▾ Скрыть подсказку' : '💡 Показать подсказку для класса'
    }</button>`;
    if (hintOpen) {
      html += `<div class="hint-content">${item.hint}</div>`;
    }
  }

  // Textbook Page 114 "Проверьте себя" checklist on the final item
  if (item.type === 'random') {
    html += `
      <div class="selfcheck-card">
        <div class="selfcheck-title">✅ Проверьте себя (стр. 114)</div>
        <label class="check-item">
          <input type="checkbox" id="chk-self-a" ${state.selfCheck.a ? 'checked' : ''} />
          <span>a) Я могу составить фигуры, используя единичные кубы.</span>
        </label>
        <label class="check-item">
          <input type="checkbox" id="chk-self-b" ${state.selfCheck.b ? 'checked' : ''} />
          <span>b) Я могу измерить объём фигур в кубических единицах.</span>
        </label>
      </div>
    `;
  }

  rightBodyEl.innerHTML = html;

  // Bind events
  const openResBtn = document.getElementById('btn-open-reservoir');
  if (openResBtn) {
    openResBtn.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      selectItem('unit-reservoir');
    };
  }

  const revealBtn = document.getElementById('btn-toggle-reveal');
  if (revealBtn) {
    revealBtn.onclick = toggleCurrentAnswer;
  }

  const checkBtn = document.getElementById('btn-check-answer');
  const inputEl = document.getElementById('quiz-answer-input');
  if (checkBtn && inputEl) {
    const doCheck = () => {
      const val = Number(inputEl.value.trim());
      if (!val || Number.isNaN(val)) {
        state.quizFeedback.set(item.id, { type: 'err', text: 'Введите число единичных кубов!' });
        renderRightPanel();
        return;
      }
      if (val === total) {
        state.revealed.add(item.id);
        state.quizFeedback.delete(item.id);
        showToast(`🎉 Верно! Объём равен ${pluralCubes(total)}!`, 'ok');
        renderLeftRail();
        renderRightPanel();
        renderAnswerControls();
        renderLiveHud();
      } else {
        const diffHint =
          val < total
            ? 'Попробуй ещё! Кажется, несколько кубов спрятались сзади или снизу — покрути 3D-чертёж или нажми «Разнести»!'
            : 'Чуть меньше! Попробуй включить «Слои» или «Тык-счёт» и пересчитать кубы.';
        state.quizFeedback.set(item.id, { type: 'err', text: `Не совсем (${val}). ${diffHint}` });
        renderRightPanel();
      }
    };
    checkBtn.onclick = doCheck;
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doCheck();
    });
  }

  const hintBtn = document.getElementById('btn-toggle-hint');
  if (hintBtn) {
    hintBtn.onclick = () => {
      if (state.hintsOpen.has(item.id)) state.hintsOpen.delete(item.id);
      else state.hintsOpen.add(item.id);
      renderRightPanel();
    };
  }

  // Random generator events
  if (item.type === 'random') {
    rightBodyEl.querySelectorAll('[data-diff]').forEach((b) => {
      b.onclick = () => {
        state.randomDifficulty = b.dataset.diff;
        renderRightPanel();
      };
    });
    const genBtn = document.getElementById('btn-gen-random');
    if (genBtn) {
      genBtn.onclick = () => {
        item.cubes = generateRandomFigure(state.randomDifficulty);
        const lBreak = getLayerBreakdown(item.cubes);
        item.hint = `Разбор по слоям: ${lBreak.map((l) => `Слой ${l.level}: ${l.count}`).join(', ')}.`;
        state.revealed.delete(item.id);
        state.quizFeedback.delete(item.id);
        state.hintsOpen.delete(item.id);
        resetToolsForNewItem(item);
        state.viewMode = '2d';
        scene3d.loadFigure(item.cubes, { palette: item.palette, view: 'textbook', instant: true });
        showToast('🎲 Новая задача готова! Сначала 2D — потом нажми «Показать в 3D»');
        renderAll();
      };
    }
    const chkA = document.getElementById('chk-self-a');
    const chkB = document.getElementById('chk-self-b');
    if (chkA) chkA.onchange = () => (state.selfCheck.a = chkA.checked);
    if (chkB) chkB.onchange = () => (state.selfCheck.b = chkB.checked);
  }
}

function renderComparePanel(item) {
  const isRevealed = state.revealed.has(item.id);
  const hl = item.highlightIds || [];

  let html = `<h2 class="card-title">${item.title}</h2>`;
  html += `<p class="card-desc">${item.description}</p>`;
  if (item.callout) {
    html += `<div class="callout-box">💬 ${item.callout}</div>`;
  }

  // Focus button (e.g. "Только B и D рядом") — shown ONLY AFTER revealing answer so it never spoils B = D!
  if (item.focusSubset && isRevealed) {
    html += `
      <button id="btn-focus-subset" class="btn-action ${state.compareFocusSubset ? 'primary' : ''} full">
        ${state.compareFocusSubset ? '👀 Показать все 4 фигуры (A, B, C, D)' : `🔍 ${item.focusButtonLabel}`}
      </button>
    `;
  }

  // Textbook table
  html += `
    <table class="cmp-table">
      <thead>
        <tr>
          <th>Фигура</th>
          <th>Кол-во кубов</th>
          <th>Объём (куб. ед.)</th>
        </tr>
      </thead>
      <tbody>
        ${item.models
          .map((m) => {
            const isHl = isRevealed && hl.includes(m.key);
            return `<tr class="${isHl ? 'row-highlight' : ''}">
              <td><strong>${m.key}</strong></td>
              <td>${isRevealed ? `${m.cubes.length} шт.` : '?'}</td>
              <td>${isRevealed ? `${m.cubes.length}` : '?'}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  `;

  if (isRevealed) {
    html += `
      <div class="volume-showcase">
        <div class="vol-label">${item.compareQuestion}</div>
        <div style="font-size:14.5px;font-weight:800;line-height:1.4;color:var(--text-main)">
          ${item.compareAnswerText}
        </div>
      </div>
      <button id="btn-cmp-reveal" class="btn-action full">🙈 Скрыть ответы</button>
    `;
  } else {
    html += `<button id="btn-cmp-reveal" class="btn-action primary full">👁 Показать таблицу и ответ</button>`;
  }

  rightBodyEl.innerHTML = html;

  const focusBtn = document.getElementById('btn-focus-subset');
  if (focusBtn) {
    focusBtn.onclick = () => {
      state.compareFocusSubset = !state.compareFocusSubset;
      const models = state.compareFocusSubset
        ? item.models.filter((m) => item.focusSubset.includes(m.key))
        : item.models;
      scene3d.loadComparison(models, {
        revealAnswers: state.revealed.has(item.id),
        highlightIds: item.highlightIds || [],
      });
      renderBottomDock();
      renderRightPanel();
      if (state.viewMode === '2d') renderStage2D();
    };
  }

  const revBtn = document.getElementById('btn-cmp-reveal');
  if (revBtn) {
    revBtn.onclick = toggleCurrentAnswer;
  }
}

function renderBuilderPanel(item) {
  const mode = state.builderMode;
  const count = state.builderCubes.length;
  const targetCubes = mode === '1a' ? 3 : mode === '1b' ? 4 : null;
  const targetGoal = mode === '1a' ? 2 : mode === '1b' ? 4 : null;
  const savedList = mode === '1a' || mode === '1b' ? state.builderSaved[mode] : [];

  let html = `<h2 class="card-title">${item.title}</h2>`;

  // Sub-challenge switcher: 1a / 1b / Free
  html += `
    <div class="seg-tabs">
      <button class="seg-tab ${mode === '1a' ? 'active' : ''}" data-bmode="1a">1a) 3 куба (${state.builderSaved['1a'].length}/2)</button>
      <button class="seg-tab ${mode === '1b' ? 'active' : ''}" data-bmode="1b">1b) 4 куба (${state.builderSaved['1b'].length}/4)</button>
      <button class="seg-tab ${mode === 'free' ? 'active' : ''}" data-bmode="free">Свободно</button>
    </div>
  `;

  // Add / Remove / Clear tools (touch-board friendly!)
  html += `
    <div class="builder-tools-row">
      <button id="b-tool-add" class="btn-action ${state.builderTool === 'add' ? 'primary' : ''}">＋ Добавить</button>
      <button id="b-tool-rem" class="btn-action ${state.builderTool === 'remove' ? 'primary' : ''}">− Удалить</button>
      <button id="b-tool-clear" class="btn-action" title="Оставить 1 куб">🗑</button>
    </div>
  `;

  // Live volume counter
  const countMatch = targetCubes !== null && count === targetCubes;
  html += `
    <div class="volume-showcase">
      <div class="vol-label">${
        targetCubes
          ? `Задание ${mode}: собери фигуру из ${targetCubes} кубов`
          : 'Текущий объём твоей фигуры'
      }</div>
      <div class="vol-big">${pluralCubes(count)}</div>
      <div style="font-size:13px;font-weight:700;color:${countMatch ? 'var(--success)' : 'var(--text-muted)'}">
        ${
          targetCubes
            ? countMatch
              ? `✓ Ровно ${targetCubes} куба! Можно сохранить фигуру.`
              : `Поставлено кубов: ${count} из ${targetCubes}`
            : 'Нажимай на грань куба или сетку пола, чтобы строить!'
        }
      </div>
    </div>
  `;

  // Save figure button for 1a & 1b
  if (targetCubes) {
    html += `<button id="b-save-shape" class="btn-action success full">✓ Проверить и сохранить фигуру</button>`;

    if (savedList.length > 0) {
      html += `
        <div class="vol-label">Найденные разные фигуры (${savedList.length} из ${targetGoal})</div>
        <div class="saved-gallery">
          ${savedList
            .map(
              (s, i) => `<button class="saved-card" data-saved-idx="${i}" title="Показать эту фигуру на доске">
                ${renderCubesSvg(s.cubes, 'emerald', 48)}
                <span>Фигура ${i + 1} · ${s.cubes.length} куб.</span>
              </button>`
            )
            .join('')}
        </div>
      `;
    }
  }

  // Presets helper for teacher
  const presets = mode === '1a' ? BUILDER_PRESETS.n3 : BUILDER_PRESETS.n4;
  html += `
    <div class="vol-label" style="margin-top:2px">Быстрые примеры для показа</div>
    <div class="preset-chips">
      ${presets
        .map((p, i) => `<button class="preset-chip" data-preset-idx="${i}">${p.name}</button>`)
        .join('')}
    </div>
  `;

  html += `<div class="callout-box">💡 Подсказка: на электронной доске нажми на грань куба пальцем, чтобы приставить новый куб. Программа учитывает все 24 поворота в 3D!</div>`;

  rightBodyEl.innerHTML = html;

  // Bind builder events
  rightBodyEl.querySelectorAll('[data-bmode]').forEach((b) => {
    b.onclick = () => {
      state.builderMode = b.dataset.bmode;
      renderRightPanel();
    };
  });

  document.getElementById('b-tool-add').onclick = () => {
    state.builderTool = 'add';
    scene3d.setBuilderTool('add');
    renderRightPanel();
  };
  document.getElementById('b-tool-rem').onclick = () => {
    state.builderTool = 'remove';
    scene3d.setBuilderTool('remove');
    renderRightPanel();
  };
  document.getElementById('b-tool-clear').onclick = () => {
    scene3d.setBuilderCubes([[0, 0, 0]]);
    showToast('Поле очищено — остался 1 единичный куб');
  };

  const saveBtn = document.getElementById('b-save-shape');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const cubes = state.builderCubes;
      if (cubes.length !== targetCubes) {
        showToast(`Нужно ровно ${targetCubes} куба, а сейчас ${cubes.length}!`, 'warn');
        return;
      }
      if (!isShapeConnected(cubes)) {
        showToast('Все кубы должны соприкасаться гранями в одну целую фигуру!', 'warn');
        return;
      }
      const key = canonicalShapeKey(cubes);
      if (savedList.some((s) => s.key === key)) {
        showToast('Эта фигура такая же (просто повёрнута) — попробуй другую форму!', 'warn');
        return;
      }
      savedList.push({ key, cubes: cubes.map((c) => [...c]) });
      renderLeftRail();
      renderRightPanel();
      if (savedList.length >= targetGoal) {
        showToast(
          `🎉 Супер! Все ${targetGoal} разные фигуры из ${targetCubes} кубов собраны! Объём каждой = ${targetCubes} куб. ед.!`,
          'ok'
        );
      } else {
        showToast(`✓ Новая фигура #${savedList.length} сохранена! Придумай ещё одну!`, 'ok');
      }
    };
  }

  rightBodyEl.querySelectorAll('[data-saved-idx]').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.savedIdx);
      const entry = savedList[idx];
      if (entry) {
        scene3d.setBuilderCubes(entry.cubes);
        showToast(`Показана сохранённая фигура #${idx + 1}`);
      }
    };
  });

  rightBodyEl.querySelectorAll('[data-preset-idx]').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.presetIdx);
      const p = presets[idx];
      if (p) {
        scene3d.setBuilderCubes(p.cubes);
      }
    };
  });
}

// ==================== 3D GLASS RESERVOIR FILLING DEMO ====================
function renderReservoirPanel(item) {
  const p = getActiveReservoirPreset();
  const total = p.nx * p.ny * p.nz;
  const perLayer = p.nx * p.nz;
  const filled = state.reservoirFilled;
  const isFull = filled >= total;
  const pct = Math.round((filled / total) * 100);
  const completedLayers = Math.floor(filled / perLayer);

  let html = `<h2 class="card-title">${item.title}</h2>`;
  html += `<p class="card-desc">${item.description}</p>`;

  // Container size picker (2x2x2, 3x2x2, 4x3x2)
  html += `
    <div>
      <div class="vol-label" style="margin-bottom:6px">Выберите размер резервуара</div>
      <div class="seg-tabs">
        ${RESERVOIR_PRESETS.map(
          (pr) =>
            `<button class="seg-tab ${pr.id === p.id ? 'active' : ''}" data-res-preset="${pr.id}">${pr.label}</button>`
        ).join('')}
      </div>
    </div>
  `;

  const isRev = state.revealed.has(item.id);
  const showCountInCard = isRev || state.reservoirShowNums;

  // Live fill progress card (doesn't spoil cube total unless teacher turns on «Номера» or «Показать ответ»!)
  html += `
    <div class="res-progress-wrap ${isFull ? 'is-full' : ''}">
      <div class="res-progress-head">
        <span class="vol-label">${isFull ? 'Заполнено до краёв!' : 'Наполнение ёмкости'}</span>
        <span class="res-progress-count">${showCountInCard ? `${filled} куб. ед.` : `${pct}%`}</span>
      </div>
      <div class="res-bar-track">
        <div class="res-bar-fill" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;color:var(--text-muted)">
        <span>Заполнено слоёв: ${completedLayers} из ${p.ny}</span>
        <span>${showCountInCard ? `${pct}%` : 'Посчитай кубы!'}</span>
      </div>
    </div>
  `;

  // Grand conclusion card — revealed ONLY when teacher clicks «👁 Показать ответ»!
  if (isRev) {
    const layerSum = Array.from({ length: p.ny }, () => perLayer).join(' + ');
    html += `
      <div class="res-full-summary">
        <div class="res-full-title">✅ Ответ · Вместимость ёмкости</div>
        <div class="res-full-main">
          Эта ёмкость вмещает ровно ${pluralCubes(total)}!
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-muted)">
          Внутри помещается ${pluralUnitCubes(total)} без пустот: ${p.ny} ${
            p.ny === 1 ? 'слой' : p.ny < 5 ? 'слоя' : 'слоёв'
          } по ${perLayer} кубов (${layerSum} = ${total}).
        </div>
        <div class="vol-formula">${p.nx} × ${p.ny} × ${p.nz} = ${total} куб. ед.</div>
      </div>
      <button id="res-panel-reveal" class="btn-action full">🙈 Скрыть ответ</button>
    `;
  } else {
    html += `
      <div class="callout-box">💬 ${
        isFull
          ? 'Ёмкость заполнена до самых краёв! Спросите класс: сколько кубических единиц в неё поместилось?'
          : item.callout
      }</div>
      <button id="res-panel-reveal" class="btn-action success full">👁 Показать ответ вместимости</button>
    `;
  }

  // Primary filling controls inside right panel
  const playLabel = state.reservoirPlaying
    ? '⏸ Пауза'
    : isFull
      ? '↺ Наполнить заново'
      : filled > 0
        ? '▶ Продолжить наполнение'
        : '▶ Наполнить до краёв';

  html += `
    <button id="res-panel-play" class="btn-action primary full" style="height:44px;font-size:14.5px">${playLabel}</button>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      <button id="res-panel-step1" class="btn-action">+1 куб</button>
      <button id="res-panel-layer" class="btn-action">+1 слой</button>
      <button id="res-panel-reset" class="btn-action">↺ Пусто</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px">
      <span class="vol-label">Скорость</span>
      <div class="seg-tabs" style="grid-template-columns:1fr 1fr;width:168px">
        <button class="seg-tab ${state.reservoirSpeed === 'calm' ? 'active' : ''}" data-res-speed="calm">Плавно</button>
        <button class="seg-tab ${state.reservoirSpeed === 'fast' ? 'active' : ''}" data-res-speed="fast">Быстро</button>
      </div>
    </div>
  `;

  rightBodyEl.innerHTML = html;

  // Bind reservoir panel controls
  document.getElementById('res-panel-reveal').onclick = toggleCurrentAnswer;
  rightBodyEl.querySelectorAll('[data-res-preset]').forEach((btn) => {
    btn.onclick = () => selectReservoirPreset(btn.dataset.resPreset);
  });
  rightBodyEl.querySelectorAll('[data-res-speed]').forEach((btn) => {
    btn.onclick = () => {
      state.reservoirSpeed = btn.dataset.resSpeed;
      if (state.reservoirPlaying) {
        stopReservoirTimer();
        startReservoirStream();
      }
      renderRightPanel();
    };
  });

  document.getElementById('res-panel-play').onclick = () => {
    if (isMobileViewport()) closeMobileDrawers();
    toggleReservoirPlay();
  };
  document.getElementById('res-panel-step1').onclick = () => {
    if (isMobileViewport()) closeMobileDrawers();
    stepReservoirCube(1);
  };
  document.getElementById('res-panel-layer').onclick = () => {
    if (isMobileViewport()) closeMobileDrawers();
    stepReservoirLayer();
  };
  document.getElementById('res-panel-reset').onclick = resetReservoir;
}

function selectReservoirPreset(presetId) {
  stopReservoirTimer();
  state.reservoirPresetId = presetId;
  state.reservoirFilled = 0;
  state.revealed.delete('unit-reservoir');
  const p = getActiveReservoirPreset();
  scene3d.loadReservoir(p.nx, p.ny, p.nz, {
    palette: 'pink',
    showDimensions: state.showDimensions,
  });
  scene3d.setShowNumbers(state.reservoirShowNums);
  scene3d.setReservoirCount(0, true);
  renderAll();
}

function updateReservoirUI() {
  renderBottomDock();
  renderAnswerControls();
  renderLiveHud();
  renderRightPanel();
}

function startReservoirStream(stopAtTarget = null, customDelay = null) {
  stopReservoirTimer();
  const p = getActiveReservoirPreset();
  const total = p.nx * p.ny * p.nz;
  const goal = stopAtTarget !== null ? Math.min(total, stopAtTarget) : total;
  if (state.reservoirFilled >= goal) return;

  state.reservoirPlaying = true;
  const delay =
    customDelay !== null ? customDelay : state.reservoirSpeed === 'calm' ? 340 : 165;

  const dropOne = () => {
    if (state.reservoirFilled >= goal) {
      stopReservoirTimer();
      updateReservoirUI();
      return;
    }
    state.reservoirFilled += 1;
    scene3d.setReservoirCount(state.reservoirFilled, false);
    if (state.reservoirFilled >= total) {
      stopReservoirTimer();
    } else if (state.reservoirFilled >= goal) {
      stopReservoirTimer();
    }
    updateReservoirUI();
  };

  // Drop first cube right away so click feels instant & responsive!
  dropOne();
  if (state.reservoirPlaying) {
    state.reservoirTimer = setInterval(dropOne, delay);
  }
}

function toggleReservoirPlay() {
  if (state.reservoirPlaying) {
    stopReservoirTimer();
    updateReservoirUI();
    return;
  }
  const p = getActiveReservoirPreset();
  const total = p.nx * p.ny * p.nz;
  if (state.reservoirFilled >= total) {
    state.reservoirFilled = 0;
    scene3d.setReservoirCount(0, true);
  }
  startReservoirStream(total);
}

function stepReservoirCube(delta) {
  stopReservoirTimer();
  const p = getActiveReservoirPreset();
  const total = p.nx * p.ny * p.nz;
  const next = Math.max(0, Math.min(total, state.reservoirFilled + delta));
  state.reservoirFilled = next;
  scene3d.setReservoirCount(next, false);
  updateReservoirUI();
}

function stepReservoirLayer() {
  stopReservoirTimer();
  const p = getActiveReservoirPreset();
  const total = p.nx * p.ny * p.nz;
  const perLayer = p.nx * p.nz;
  if (state.reservoirFilled >= total) {
    state.reservoirFilled = 0;
    scene3d.setReservoirCount(0, true);
  }
  const nextLayerEnd = Math.min(
    total,
    (Math.floor(state.reservoirFilled / perLayer) + 1) * perLayer
  );
  startReservoirStream(nextLayerEnd, 145);
}

function resetReservoir() {
  stopReservoirTimer();
  state.reservoirFilled = 0;
  state.revealed.delete('unit-reservoir');
  scene3d.setReservoirCount(0, true);
  updateReservoirUI();
}

// ==================== COUNT-UP ANIMATION LOGIC ====================
function enterCountUpMode() {
  if (state.countUpActive) {
    exitCountUpMode();
    return;
  }
  setInteractionMode('orbit');
  state.countUpActive = true;
  state.countUpStep = 1;
  scene3d.setCountVisible(1);
  renderBottomDock();
  renderLiveHud();
  toggleCountUpPlay();
}

function exitCountUpMode() {
  stopCountUpTimer();
  state.countUpActive = false;
  state.countUpStep = 0;
  scene3d.setCountVisible(null);
  renderBottomDock();
  renderLiveHud();
}

function stepCountUp(delta) {
  const total = scene3d.getCubeCount();
  const next = Math.max(0, Math.min(total, state.countUpStep + delta));
  state.countUpStep = next;
  scene3d.setCountVisible(next);
  if (next >= total) {
    stopCountUpTimer();
    showToast(`✓ Посчитано все ${pluralUnitCubes(total)}!`, 'ok');
  }
  renderLiveHud();
}

function toggleCountUpPlay() {
  if (state.countUpPlaying) {
    stopCountUpTimer();
    renderLiveHud();
    return;
  }
  const total = scene3d.getCubeCount();
  if (state.countUpStep >= total) {
    state.countUpStep = 0;
    scene3d.setCountVisible(0);
  }
  state.countUpPlaying = true;
  renderLiveHud();
  state.countUpTimer = setInterval(() => {
    stepCountUp(1);
  }, 540);
}

// ==================== INTERACTIVE MODES ====================
function setInteractionMode(mode) {
  if (state.countUpActive && mode !== 'orbit') {
    stopCountUpTimer();
    state.countUpActive = false;
    scene3d.setCountVisible(null);
  }
  state.interactionMode = state.interactionMode === mode && mode !== 'orbit' ? 'orbit' : mode;
  scene3d.setInteractionMode(state.interactionMode);
  renderBottomDock();
  renderLiveHud();
}

// ==================== GLOBAL CONTROLS BINDING ====================
// Camera presets
document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view =
      btn.dataset.view === 'textbook' && isGridItem(getActiveEntry().item)
        ? 'iso'
        : btn.dataset.view;
    scene3d.frameCamera(view, true);
  });
});

btnAutoRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  scene3d.setAutoRotate(state.autoRotate);
  renderBottomDock();
});

btnProjection.addEventListener('click', () => {
  state.projection = state.projection === 'perspective' ? 'ortho' : 'perspective';
  scene3d.setProjection(state.projection);
  renderBottomDock();
  showToast(
    state.projection === 'ortho'
      ? '📐 Изометрическая проекция (как чертёж в учебнике)'
      : '🧊 Перспективная 3D-проекция'
  );
});

explodeSlider.addEventListener('input', () => {
  const pct = Number(explodeSlider.value);
  state.explode = pct / 100;
  explodePctEl.textContent = `${pct}%`;
  scene3d.setExplode(state.explode);
});

btnCountUp.addEventListener('click', enterCountUpMode);
btnTapCount.addEventListener('click', () => setInteractionMode('count'));
btnPeel.addEventListener('click', () => setInteractionMode('peel'));

btnXRay.addEventListener('click', () => {
  state.xray = !state.xray;
  scene3d.setXRay(state.xray);
  renderBottomDock();
});

btnDims.addEventListener('click', () => {
  state.showDimensions = !state.showDimensions;
  scene3d.setShowDimensions(state.showDimensions);
  renderBottomDock();
});

// Slide navigation
document.getElementById('btn-prev-item').addEventListener('click', () => stepSlide(-1));
document.getElementById('btn-next-item').addEventListener('click', () => stepSlide(1));

// ==================== MOBILE DRAWERS & SAFE-AREA FRAMING ====================
function isMobileViewport() {
  return window.innerWidth <= 820;
}

function closeMobileDrawers() {
  leftRailEl.classList.remove('mobile-open');
  rightPanelEl.classList.remove('mobile-open');
  mobileBackdropEl.classList.add('hidden');
  btnMobileMenu?.classList.remove('active');
  btnMobileInfo?.classList.remove('active');
}

function openMobileDrawer(side) {
  const isLeft = side === 'left';
  const target = isLeft ? leftRailEl : rightPanelEl;
  const alreadyOpen = target.classList.contains('mobile-open');
  closeMobileDrawers();
  if (!alreadyOpen) {
    target.classList.add('mobile-open');
    mobileBackdropEl.classList.remove('hidden');
    if (isLeft) btnMobileMenu?.classList.add('active');
    else btnMobileInfo?.classList.add('active');
  }
}

btnMobileMenu?.addEventListener('click', () => openMobileDrawer('left'));
btnMobileInfo?.addEventListener('click', () => openMobileDrawer('right'));
mobileBackdropEl?.addEventListener('click', closeMobileDrawers);

function updateSafeInsets(reframe = true) {
  let insets;
  if (isMobileViewport()) {
    // Dynamically measure exact multi-row mobile top bar height so HUD, banners & 2D sheet NEVER overlap it!
    const topBarRect = topBarEl?.getBoundingClientRect();
    const topH = Math.ceil((topBarRect ? topBarRect.bottom : 120) + 10);
    document.documentElement.style.setProperty('--mobile-top-offset', `${topH}px`);
    insets = { left: 8, right: 8, top: topH, bottom: 76 };
  } else if (state.zen) {
    insets = { left: 24, right: 24, top: 62, bottom: 84 };
  } else {
    const leftW = state.leftCollapsed ? 24 : (leftRailEl.offsetWidth || 238) + 28;
    const rightW = state.rightCollapsed ? 24 : (rightPanelEl.offsetWidth || 326) + 28;
    insets = { left: leftW, right: rightW, top: 76, bottom: 86 };
  }
  stage2dEl.style.setProperty('--safe-left', `${insets.left}px`);
  stage2dEl.style.setProperty('--safe-right', `${insets.right}px`);
  stage2dEl.style.setProperty('--safe-top', `${insets.top}px`);
  stage2dEl.style.setProperty('--safe-bottom', `${insets.bottom}px`);
  scene3d.setSafeInsets(insets, reframe);
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (!isMobileViewport()) closeMobileDrawers();
  updateSafeInsets(false);
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    updateSafeInsets(true);
    renderAnswerControls();
    requestAnimationFrame(() => updateSafeInsets(false));
  }, 110);
});

// 2D <-> 3D Toggle Buttons & Dedicated Teacher Answer Buttons
btnMode2d.addEventListener('click', () => setViewMode('2d'));
btnMode3d.addEventListener('click', () => setViewMode('3d', true));
zenMode2dBtn.addEventListener('click', () => setViewMode('2d'));
zenMode3dBtn.addEventListener('click', () => setViewMode('3d', true));
zenAnswerBtn.addEventListener('click', toggleCurrentAnswer);
btnAnswer2d.addEventListener('click', toggleCurrentAnswer);
btnAnswer3d.addEventListener('click', toggleCurrentAnswer);
resDockAnswerBtn.addEventListener('click', toggleCurrentAnswer);
btnReveal3d.addEventListener('click', () => setViewMode('3d', true));
btnBack2d.addEventListener('click', () => setViewMode('2d'));
zenPrevBtn.addEventListener('click', () => stepSlide(-1));
zenNextBtn.addEventListener('click', () => stepSlide(1));

// Collapse / Restore Left & Right Panels (on mobile, closes the slide-over drawer!)
document.getElementById('btn-toggle-left').addEventListener('click', () => {
  if (isMobileViewport()) {
    closeMobileDrawers();
    return;
  }
  state.leftCollapsed = true;
  leftRailEl.classList.add('collapsed');
  btnOpenLeft.classList.remove('hidden');
  updateSafeInsets(true);
});
btnOpenLeft.addEventListener('click', () => {
  state.leftCollapsed = false;
  leftRailEl.classList.remove('collapsed');
  btnOpenLeft.classList.add('hidden');
  updateSafeInsets(true);
});

document.getElementById('btn-toggle-right').addEventListener('click', () => {
  if (isMobileViewport()) {
    closeMobileDrawers();
    return;
  }
  state.rightCollapsed = true;
  rightPanelEl.classList.add('collapsed');
  btnOpenRight.classList.remove('hidden');
  updateSafeInsets(true);
  renderAnswerControls();
});
btnOpenRight.addEventListener('click', () => {
  state.rightCollapsed = false;
  rightPanelEl.classList.remove('collapsed');
  btnOpenRight.classList.add('hidden');
  updateSafeInsets(true);
  renderAnswerControls();
});

// Theme Toggle (Light Studio Whiteboard <-> Deep Blueprint Dark)
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = state.theme;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', state.theme === 'dark' ? '#08162d' : '#f5f8fd');
  scene3d.setTheme(state.theme);
  themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  themeLabel.textContent = state.theme === 'dark' ? 'Светлая' : 'Чертёж';
  if (state.viewMode === '2d') renderStage2D();
}
btnTheme.addEventListener('click', toggleTheme);

// Zen / Clean Electronic Board Mode
function toggleZen(force) {
  state.zen = typeof force === 'boolean' ? force : !state.zen;
  document.body.classList.toggle('zen-mode', state.zen);
  zenBarEl.classList.toggle('hidden', !state.zen);
  btnZen.classList.toggle('active', state.zen);
  updateSafeInsets(true);
  renderAnswerControls();
}
btnZen.addEventListener('click', () => toggleZen());
btnExitZen.addEventListener('click', () => toggleZen(false));

// Fullscreen toggle
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

// Whiteboard Marker Controls
function setMarkerActive(active) {
  state.markerActive = active;
  whiteboard.setActive(active);
  markerBarEl.classList.toggle('hidden', !active);
  btnMarker.classList.toggle('active', active);
}
btnMarker.addEventListener('click', () => setMarkerActive(!state.markerActive));
document.getElementById('btn-draw-done').addEventListener('click', () => setMarkerActive(false));
document.getElementById('btn-draw-undo').addEventListener('click', () => whiteboard.undo());
document.getElementById('btn-draw-clear').addEventListener('click', () => whiteboard.clear());

const btnDrawEraser = document.getElementById('btn-draw-eraser');
btnDrawEraser.addEventListener('click', () => {
  whiteboard.setMode('eraser');
  markerBarEl.querySelectorAll('.color-dot').forEach((d) => d.classList.remove('active'));
  btnDrawEraser.classList.add('active');
});

markerBarEl.querySelectorAll('.color-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    whiteboard.setColor(dot.dataset.color);
    markerBarEl.querySelectorAll('.color-dot').forEach((d) => d.classList.remove('active'));
    btnDrawEraser.classList.remove('active');
    dot.classList.add('active');
  });
});

// Topic Switcher (Тема 1: Объём <-> Тема 2: 3D-сетка)
btnTopicVolume?.addEventListener('click', () => selectTopic('volume'));
btnTopicGrid?.addEventListener('click', () => selectTopic('grid'));

// Minecraft Block Mode toggles
btnMinecraft?.addEventListener('click', () => toggleMinecraftMode());
zenMcBtn?.addEventListener('click', () => toggleMinecraftMode());

// Topic 2 Isometric Dot-Grid bottom dock controls
isoPlayBtn?.addEventListener('click', toggleIsoPlay);
bottomDockIsoEl?.querySelectorAll('.iso-step-btn').forEach((btn) => {
  btn.addEventListener('click', () => setIsoStep(Number(btn.dataset.isoStep)));
});
isoDrawBtn?.addEventListener('click', toggleIsoDrawMode);
isoUndoBtn?.addEventListener('click', () => {
  if (isoGrid.undoLastLine()) {
    renderStage2D();
    renderIsoDock();
  }
});
isoClearBtn?.addEventListener('click', () => {
  isoGrid.clearDrawings();
  renderStage2D();
  renderIsoDock();
});
isoDimNamesBtn?.addEventListener('click', () => {
  state.isoShowDimNames = !state.isoShowDimNames;
  if (!state.isoShowDimNames) {
    state.highlightDim = null;
    scene3d.setHighlightDim(null);
  }
  renderStage2D();
  renderIsoDock();
  renderRightPanel();
});
isoUnitsBtn?.addEventListener('click', () => {
  state.isoShowUnits = !state.isoShowUnits;
  renderStage2D();
  renderIsoDock();
});
isoHiddenBtn?.addEventListener('click', () => {
  state.isoShowHidden = !state.isoShowHidden;
  renderStage2D();
  renderIsoDock();
});
isoTo3dBtn?.addEventListener('click', () => setViewMode('3d', true));
isoAnswerBtn?.addEventListener('click', toggleCurrentAnswer);

// Reservoir bottom dock controls
resDockPlayBtn.addEventListener('click', toggleReservoirPlay);
resDockStep1Btn.addEventListener('click', () => stepReservoirCube(1));
resDockLayerBtn.addEventListener('click', stepReservoirLayer);
resDockResetBtn.addEventListener('click', resetReservoir);
resDockNumsBtn.addEventListener('click', () => {
  state.reservoirShowNums = !state.reservoirShowNums;
  scene3d.setShowNumbers(state.reservoirShowNums);
  updateReservoirUI();
});
resDockRotateBtn.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  scene3d.setAutoRotate(state.autoRotate);
  renderBottomDock();
});
resDockDimsBtn.addEventListener('click', () => {
  state.showDimensions = !state.showDimensions;
  scene3d.setShowDimensions(state.showDimensions);
  renderBottomDock();
});

// Keyboard shortcuts for teacher clicker / keyboard
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  const { item } = getActiveEntry();
  if (e.code === 'Space') {
    e.preventDefault();
    if (item.type === 'reservoir' && state.viewMode === '3d') {
      toggleReservoirPlay();
    } else {
      setViewMode(state.viewMode === '2d' ? '3d' : '2d', true);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    toggleCurrentAnswer();
  } else if (e.key === 'ArrowRight') stepSlide(1);
  else if (e.key === 'ArrowLeft') stepSlide(-1);
  else if (k === '1') scene3d.frameCamera(isGridItem(item) ? 'iso' : 'textbook', true);
  else if (k === '2') scene3d.frameCamera('top', true);
  else if (k === '3') scene3d.frameCamera('front', true);
  else if (k === '4') scene3d.frameCamera('side', true);
  else if (k === '5') scene3d.frameCamera('back', true);
  else if (k === 'c') toggleMinecraftMode();
  else if (k === 'r') btnAutoRotate.click();
  else if (k === 'x') btnXRay.click();
  else if (k === 'd') btnDims.click();
  else if (k === 'p') btnProjection.click();
  else if (k === 'm') setMarkerActive(!state.markerActive);
  else if (k === 'z') toggleZen();
  else if (k === 'f') btnFullscreen.click();
  else if (e.key === 'Escape') {
    if (state.markerActive) setMarkerActive(false);
    else if (state.isoDrawMode) toggleIsoDrawMode();
    else if (state.zen) toggleZen(false);
  }
});

// ==================== BOOT ====================
selectItem(getTopicSections()[0].items[0].id);
requestAnimationFrame(() => updateSafeInsets(false));
