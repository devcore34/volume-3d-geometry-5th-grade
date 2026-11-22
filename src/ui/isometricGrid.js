// Interactive Isometric Dot-Grid Renderer & Step-by-Step Drawing Studio (Pages 115–117)
// Exact 30-degree triangular isometric dot lattice matching the 5th-grade textbook!
import { GRID_PALETTES } from '../data/gridLessons.js';

const COS30 = Math.sqrt(3) / 2; // 0.8660254
const SIN30 = 0.5;

const STEP_DESCRIPTIONS = [
  'Пустая трёхмерная сетка. Нажми «▶ Пошагово», «👁 Ответ» или включи «✍️ Рисовать», чтобы чертить по точкам!',
  'Шаг 1 из 4: Рисуем верхнюю грань — отсчитываем ОТРЕЗКИ между точками (не сами точки!).',
  'Шаг 2 из 4: Опускаем 3 вертикальных ребра вниз — отсчитываем высоту по вертикальным точкам.',
  'Шаг 3 из 4: Соединяем нижние концы параллельно верхним рёбрам — каркас фигуры готов!',
  'Шаг 4 из 4: Фигура готова на трёхмерной сетке! Теперь можно нажать «🧊 Показать в 3D» и покрутить её.',
];

export function getIsoStepCaption(step) {
  return STEP_DESCRIPTIONS[Math.max(0, Math.min(4, step))] || STEP_DESCRIPTIONS[4];
}

// Compute exact isometric screen coords from integer grid steps (ia along front-left, ib along front-right, ih down)
function makeIsoProjector(S, ox = 0, oy = 0) {
  return (ia, ib, ih) => [
    ox + (ia + ib) * COS30 * S,
    oy + (ia - ib) * SIN30 * S + ih * S,
  ];
}

// Generate all isometric dot-grid coordinates covering the bounding box with comfortable margin
function generateDotLattice(S, minCol, maxCol, minRow, maxRow, ox, oy) {
  const dots = [];
  for (let col = minCol; col <= maxCol; col++) {
    const x = ox + col * COS30 * S;
    const isOdd = Math.abs(col) % 2 === 1;
    const startR = isOdd ? Math.floor(minRow) + 0.5 : Math.ceil(minRow);
    for (let row = startR; row <= maxRow + 0.01; row += 1) {
      const y = oy + row * S;
      dots.push({ x, y, col, row });
    }
  }
  return dots;
}

function buildSingleIsoSvg(box, options = {}) {
  const {
    paletteKey = 'purple',
    theme = 'light',
    step = 4, // 0 = empty dots, 1 = top face, 2 = verticals, 3 = bottom edges, 4 = shaded + dims
    showUnitGrid = false,
    showHiddenEdges = false,
    faceOverride = null, // { top, left, right } for Page 117 color-coded faces
    showDims = true,
    labelBelow = '',
    drawEnabled = false,
    userLines = [], // [{ x1, y1, x2, y2 }]
    svgId = 'iso-svg-main',
    compact = false,
  } = options;

  const { a, b, h } = box;
  const pal = GRID_PALETTES[paletteKey] || GRID_PALETTES.purple;
  const isDark = theme === 'dark';

  const S = 44;
  const padCols = compact ? 1 : 2;
  const padRows = compact ? 1 : 1.5;

  // Box spans cols [0 .. a+b], rows [-b*0.5 .. a*0.5 + h]
  const minCol = -padCols;
  const maxCol = a + b + padCols;
  const minRow = -b * 0.5 - padRows;
  const maxRow = a * 0.5 + h + padRows;

  const ox = -minCol * COS30 * S + S * 0.65;
  const oy = -minRow * S + S * 0.65;

  const width = (maxCol - minCol) * COS30 * S + S * 1.3;
  const height = (maxRow - minRow) * S + S * 1.3;

  const pt = makeIsoProjector(S, ox, oy);
  const dots = generateDotLattice(S, minCol, maxCol, minRow, maxRow, ox, oy);

  // 8 vertices of the cuboid
  const L = pt(0, 0, 0);
  const T = pt(0, b, 0);
  const F = pt(a, 0, 0);
  const R = pt(a, b, 0);
  const Lb = pt(0, 0, h);
  const Fb = pt(a, 0, h);
  const Rb = pt(a, b, h);
  const Tb = pt(0, b, h);

  const dotColor = isDark ? 'rgba(148, 197, 255, 0.52)' : 'rgba(71, 85, 105, 0.58)';
  const wireColor = isDark ? pal.wireDark : pal.wire;
  const strokeColor = isDark ? pal.strokeDark : pal.stroke;
  const dimTextColor = isDark ? '#e2e8f0' : '#1e293b';

  const topFill = faceOverride ? faceOverride.top : pal.top;
  const leftFill = faceOverride ? faceOverride.left : pal.left;
  const rightFill = faceOverride ? faceOverride.right : pal.right;

  const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const lineEl = (p1, p2, cls = '', extra = '') =>
    `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" class="iso-edge ${cls}" ${extra}/>`;

  // 1) Dot lattice
  const dotR = Math.max(2.1, Math.min(3.1, S * 0.062));
  const dotsSvg = dots
    .map(
      (d) =>
        `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${dotColor}" class="iso-dot" data-x="${d.x.toFixed(1)}" data-y="${d.y.toFixed(1)}"/>`
    )
    .join('');

  // 2) Shaded faces (step >= 4)
  let facesSvg = '';
  if (step >= 4) {
    const fillOpacity = isDark ? 0.58 : 0.72;
    facesSvg = `
      <g class="iso-faces" opacity="${fillOpacity}">
        <polygon points="${fmt([L, T, R, F])}" fill="${topFill}"/>
        <polygon points="${fmt([L, F, Fb, Lb])}" fill="${leftFill}"/>
        <polygon points="${fmt([F, R, Rb, Fb])}" fill="${rightFill}"/>
      </g>
    `;
  }

  // 3) Optional internal 1x1 unit cube subdivisions (helps 5th graders see unit cubes inside!)
  let unitGridSvg = '';
  if (showUnitGrid && step >= 3) {
    const lines = [];
    const gStyle = `stroke="${strokeColor}" stroke-width="1.2" stroke-opacity="0.42"`;
    // Top face grid
    for (let i = 1; i < a; i++) lines.push(lineEl(pt(i, 0, 0), pt(i, b, 0), 'iso-unit-line', gStyle));
    for (let j = 1; j < b; j++) lines.push(lineEl(pt(0, j, 0), pt(a, j, 0), 'iso-unit-line', gStyle));
    // Front-left face grid
    for (let i = 1; i < a; i++) lines.push(lineEl(pt(i, 0, 0), pt(i, 0, h), 'iso-unit-line', gStyle));
    for (let k = 1; k < h; k++) lines.push(lineEl(pt(0, 0, k), pt(a, 0, k), 'iso-unit-line', gStyle));
    // Front-right face grid
    for (let j = 1; j < b; j++) lines.push(lineEl(pt(a, j, 0), pt(a, j, h), 'iso-unit-line', gStyle));
    for (let k = 1; k < h; k++) lines.push(lineEl(pt(a, 0, k), pt(a, b, k), 'iso-unit-line', gStyle));
    unitGridSvg = `<g class="iso-unit-grid">${lines.join('')}</g>`;
  }

  // 4) Optional hidden back edges (dashed 3D skeleton)
  let hiddenSvg = '';
  if (showHiddenEdges && step >= 3) {
    const hStyle = `stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.48"`;
    hiddenSvg = `
      <g class="iso-hidden-edges">
        ${lineEl(T, Tb, '', hStyle)}
        ${lineEl(Lb, Tb, '', hStyle)}
        ${lineEl(Rb, Tb, '', hStyle)}
      </g>
    `;
  }

  // 5) Main step-by-step edges
  const sw = step >= 4 ? 2.8 : 3.2;
  const activeColor = step >= 4 ? strokeColor : wireColor;
  const stepHighlight = isDark ? '#38bdf8' : '#2563eb';
  const edgeAttrs = (isNewest) =>
    `stroke="${isNewest ? stepHighlight : activeColor}" stroke-width="${isNewest ? 3.8 : sw}" stroke-linecap="round" stroke-linejoin="round"`;

  let stepEdgesSvg = '';
  let stepHopsSvg = '';

  // Helper to draw clear numbered segment-counting hops (teaching kids to count INTERVALS, not dots!)
  const drawHopCounter = (startCoord, stepVec, count, offsetX, offsetY) => {
    let out = '';
    for (let k = 0; k < count; k++) {
      const p0 = pt(
        startCoord[0] + stepVec[0] * k,
        startCoord[1] + stepVec[1] * k,
        startCoord[2] + stepVec[2] * k
      );
      const p1 = pt(
        startCoord[0] + stepVec[0] * (k + 1),
        startCoord[1] + stepVec[1] * (k + 1),
        startCoord[2] + stepVec[2] * (k + 1)
      );
      const mx = (p0[0] + p1[0]) / 2 + offsetX;
      const my = (p0[1] + p1[1]) / 2 + offsetY;
      out += `
        <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="10.5" fill="${stepHighlight}" opacity="0.94"/>
        <text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="11.5" font-weight="800" font-family="JetBrains Mono, monospace">${k + 1}</text>
      `;
    }
    return out;
  };

  if (step >= 1) {
    const isNew = step === 1;
    stepEdgesSvg += `
      ${lineEl(L, T, 'iso-anim', edgeAttrs(isNew))}
      ${lineEl(T, R, 'iso-anim', edgeAttrs(isNew))}
      ${lineEl(R, F, 'iso-anim', edgeAttrs(isNew))}
      ${lineEl(F, L, 'iso-anim', edgeAttrs(isNew))}
    `;
    if (isNew) {
      stepHopsSvg += drawHopCounter([0, 0, 0], [0, 1, 0], b, -14, -12);
      stepHopsSvg += drawHopCounter([0, 0, 0], [1, 0, 0], a, -12, 14);
      // Highlight key top corners
      [L, T, R, F].forEach((p) => {
        stepHopsSvg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" fill="${stepHighlight}"/>`;
      });
    }
  }

  if (step >= 2) {
    const isNew = step === 2;
    stepEdgesSvg += `
      ${lineEl(L, Lb, 'iso-anim', edgeAttrs(isNew))}
      ${lineEl(F, Fb, 'iso-anim', edgeAttrs(isNew))}
      ${lineEl(R, Rb, 'iso-anim', edgeAttrs(isNew))}
    `;
    if (isNew) {
      stepHopsSvg += drawHopCounter([0, 0, 0], [0, 0, 1], h, -18, 0);
      [Lb, Fb, Rb].forEach((p) => {
        stepHopsSvg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" fill="${stepHighlight}"/>`;
      });
    }
  }

  if (step >= 3) {
    const isNew = step === 3;
    stepEdgesSvg += `
      ${lineEl(Lb, Fb, 'iso-anim', edgeAttrs(isNew))}
      ${lineEl(Fb, Rb, 'iso-anim', edgeAttrs(isNew))}
    `;
    if (isNew) {
      stepHopsSvg += drawHopCounter([0, 0, h], [1, 0, 0], a, -12, 16);
      stepHopsSvg += drawHopCounter([a, 0, h], [0, 1, 0], b, 14, 14);
    }
  }

  // 6) Dimension labels (exact textbook style: "3 ед.", "4 ед.", "2 ед.")
  let dimsSvg = '';
  if (showDims && step >= 3) {
    const midLT = [(L[0] + T[0]) / 2 - 18, (L[1] + T[1]) / 2 - 12];
    const midLLb = [L[0] - 26, (L[1] + Lb[1]) / 2 + 5];
    const midLbFb = [(Lb[0] + Fb[0]) / 2 - 14, (Lb[1] + Fb[1]) / 2 + 22];
    const fs = compact ? 15 : 16.5;

    dimsSvg = `
      <g class="iso-dim-labels" font-family="Manrope, Segoe UI, sans-serif" font-size="${fs}" font-weight="800" fill="${dimTextColor}">
        <text x="${midLT[0].toFixed(1)}" y="${midLT[1].toFixed(1)}" text-anchor="end">${b} ед.</text>
        <text x="${midLLb[0].toFixed(1)}" y="${midLLb[1].toFixed(1)}" text-anchor="end">${h} ед.</text>
        <text x="${midLbFb[0].toFixed(1)}" y="${midLbFb[1].toFixed(1)}" text-anchor="end">${a} ед.</text>
      </g>
    `;
  }

  // 7) User-drawn snapped lines on the dot grid
  const userLinesSvg = userLines
    .map(
      (ln) =>
        `<line x1="${ln.x1.toFixed(1)}" y1="${ln.y1.toFixed(1)}" x2="${ln.x2.toFixed(1)}" y2="${ln.y2.toFixed(1)}" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>`
    )
    .join('');

  return {
    dots,
    svgHtml: `
      <svg id="${svgId}" class="iso-svg ${drawEnabled ? 'is-draw-mode' : ''}" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" preserveAspectRatio="xMidYMid meet">
        ${facesSvg}
        ${dotsSvg}
        ${hiddenSvg}
        ${unitGridSvg}
        ${stepEdgesSvg}
        ${stepHopsSvg}
        ${dimsSvg}
        <g class="iso-user-lines">${userLinesSvg}</g>
        <g class="iso-preview-layer"></g>
      </svg>
    `,
  };
}

export class IsometricGridController {
  constructor(containerEl, onChange) {
    this.container = containerEl;
    this.onChange = onChange;
    this.drawMode = false;
    this.userLinesBySlot = { main: [], pos1: [], pos2: [] };
    this._activeDrag = null;
  }

  clearDrawings() {
    this.userLinesBySlot = { main: [], pos1: [], pos2: [] };
  }

  undoLastLine() {
    for (const slot of ['pos2', 'pos1', 'main']) {
      if (this.userLinesBySlot[slot].length > 0) {
        this.userLinesBySlot[slot].pop();
        return true;
      }
    }
    return false;
  }

  hasUserLines() {
    return (
      this.userLinesBySlot.main.length > 0 ||
      this.userLinesBySlot.pos1.length > 0 ||
      this.userLinesBySlot.pos2.length > 0
    );
  }

  setDrawMode(enabled) {
    this.drawMode = Boolean(enabled);
  }

  render(item, options = {}) {
    const {
      theme = 'light',
      step = 4,
      revealed = true,
      showUnitGrid = false,
      showHiddenEdges = false,
    } = options;

    // If answer is hidden by teacher shield and user hasn't started stepping, show clean step 0 (empty dot grid!)
    const effectiveStep = revealed ? step : Math.min(step, 0);
    const isDouble =
      item.type === 'grid-double' ||
      (item.type === 'grid-random' && item.randomKind === 'double');

    const pal = GRID_PALETTES[item.palette] || GRID_PALETTES.purple;

    if (isDouble) {
      const p1 = item.pos1;
      const p2 = item.pos2;
      const cap1 = revealed ? p1.label : 'Положение 1 (нарисуй по точкам)';
      const cap2 = revealed ? p2.label : 'Положение 2 (повернули на 90°)';
      const b1 = buildSingleIsoSvg(p1, {
        paletteKey: item.palette,
        theme,
        step: effectiveStep,
        showUnitGrid,
        showHiddenEdges,
        faceOverride: item.colorCodedFaces ? pal.faceColorsPos1 : null,
        showDims: true,
        drawEnabled: this.drawMode,
        userLines: this.userLinesBySlot.pos1,
        svgId: 'iso-svg-pos1',
        compact: true,
      });
      const b2 = buildSingleIsoSvg(p2, {
        paletteKey: item.palette,
        theme,
        step: effectiveStep,
        showUnitGrid,
        showHiddenEdges,
        faceOverride: item.colorCodedFaces ? pal.faceColorsPos2 : null,
        showDims: true,
        drawEnabled: this.drawMode,
        userLines: this.userLinesBySlot.pos2,
        svgId: 'iso-svg-pos2',
        compact: true,
      });

      this.container.innerHTML = `
        <div class="tb2d-sheet iso-sheet">
          <div class="tb2d-sheet-header">
            <span class="tb2d-book-badge">📐 Трёхмерная сетка · ${item.page}</span>
            <span class="tb2d-sheet-title">${item.title}</span>
          </div>
          <div class="iso-step-banner">${
            this.drawMode
              ? '✍️ Режим рисования: веди линию от точки к точке — она сама примагнитится к сетке!'
              : getIsoStepCaption(effectiveStep)
          }</div>
          <div class="iso-double-grid">
            <div class="iso-panel-cell">
              <div class="iso-panel-svg-wrap">${b1.svgHtml}</div>
              <div class="iso-panel-caption">${cap1}</div>
            </div>
            <div class="iso-panel-cell">
              <div class="iso-panel-svg-wrap">${b2.svgHtml}</div>
              <div class="iso-panel-caption">${cap2}</div>
            </div>
          </div>
        </div>
      `;

      this._attachSvgDraw('iso-svg-pos1', 'pos1', b1.dots);
      this._attachSvgDraw('iso-svg-pos2', 'pos2', b2.dots);
      return;
    }

    // Single figure on huge full-board isometric dot grid!
    const single = buildSingleIsoSvg(item.box, {
      paletteKey: item.palette,
      theme,
      step: effectiveStep,
      showUnitGrid,
      showHiddenEdges,
      showDims: true,
      labelBelow: '',
      drawEnabled: this.drawMode,
      userLines: this.userLinesBySlot.main,
      svgId: 'iso-svg-main',
      compact: false,
    });

    this.container.innerHTML = `
      <div class="tb2d-sheet iso-sheet">
        <div class="tb2d-sheet-header">
          <span class="tb2d-book-badge">📐 Трёхмерная сетка · ${item.page}</span>
          <span class="tb2d-sheet-title">${item.title}</span>
        </div>
        <div class="iso-step-banner">${
          this.drawMode
            ? '✍️ Режим рисования по точкам: нажми на точку и проведи линию к другой точке!'
            : getIsoStepCaption(effectiveStep)
        }</div>
        <div class="iso-single-wrap">
          ${single.svgHtml}
        </div>
      </div>
    `;

    this._attachSvgDraw('iso-svg-main', 'main', single.dots);
  }

  _attachSvgDraw(svgId, slot, dots) {
    if (!this.drawMode) return;
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const previewLayer = svg.querySelector('.iso-preview-layer');

    const toSvgPoint = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    };

    const nearestDot = (p) => {
      let best = null;
      let bestDist = Infinity;
      for (const d of dots) {
        const dist = (d.x - p.x) ** 2 + (d.y - p.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = d;
        }
      }
      return bestDist < 700 ? best : null;
    };

    const renderPreview = (startDot, curDot) => {
      if (!previewLayer) return;
      let html = '';
      if (curDot) {
        html += `<circle cx="${curDot.x.toFixed(1)}" cy="${curDot.y.toFixed(1)}" r="7.5" fill="none" stroke="#e11d48" stroke-width="2.5"/>`;
      }
      if (startDot && curDot && (startDot.x !== curDot.x || startDot.y !== curDot.y)) {
        html += `<line x1="${startDot.x.toFixed(1)}" y1="${startDot.y.toFixed(1)}" x2="${curDot.x.toFixed(1)}" y2="${curDot.y.toFixed(1)}" stroke="#e11d48" stroke-width="4" stroke-dasharray="6 4" stroke-linecap="round"/>`;
      }
      if (startDot) {
        html += `<circle cx="${startDot.x.toFixed(1)}" cy="${startDot.y.toFixed(1)}" r="5.5" fill="#e11d48"/>`;
      }
      previewLayer.innerHTML = html;
    };

    svg.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      svg.setPointerCapture?.(e.pointerId);
      const d = nearestDot(toSvgPoint(e));
      if (!d) return;
      this._activeDrag = { slot, startDot: d, curDot: d };
      renderPreview(d, d);
    });

    svg.addEventListener('pointermove', (e) => {
      const d = nearestDot(toSvgPoint(e));
      if (this._activeDrag && this._activeDrag.slot === slot) {
        this._activeDrag.curDot = d || this._activeDrag.curDot;
        renderPreview(this._activeDrag.startDot, this._activeDrag.curDot);
      } else {
        renderPreview(null, d);
      }
    });

    svg.addEventListener('pointerup', () => {
      if (!this._activeDrag || this._activeDrag.slot !== slot) return;
      const { startDot, curDot } = this._activeDrag;
      this._activeDrag = null;
      renderPreview(null, null);
      if (startDot && curDot && (startDot.x !== curDot.x || startDot.y !== curDot.y)) {
        this.userLinesBySlot[slot].push({
          x1: startDot.x,
          y1: startDot.y,
          x2: curDot.x,
          y2: curDot.y,
        });
        this.onChange?.();
      }
    });

    svg.addEventListener('pointerleave', () => {
      if (!this._activeDrag) renderPreview(null, null);
    });
  }
}
