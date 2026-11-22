// Interactive Isometric Dot-Grid Renderer & Step-by-Step Drawing Studio (Pages 115–117)
// Exact 30-degree triangular isometric dot lattice matching the 5th-grade textbook!
import { GRID_PALETTES } from '../data/gridLessons.js';

const COS30 = Math.sqrt(3) / 2; // 0.8660254
const SIN30 = 0.5;

const STEP_DESCRIPTIONS = [
  'Пустая трёхмерная сетка. 🔵 Длина идёт ↗, 🟠 Ширина идёт ↘, 🟢 Высота идёт ↓. Рисуй по точкам или жми «▶ Пошагово»!',
  'Шаг 1 из 4: Рисуем верхнюю грань — отсчитываем отрезки по 🔵 Длине (↗) и 🟠 Ширине (↘).',
  'Шаг 2 из 4: Опускаем 3 вертикальных ребра вниз — отсчитываем отрезки по 🟢 Высоте (↓).',
  'Шаг 3 из 4: Замыкаем нижние рёбра параллельно 🟠 Ширине и 🔵 Длине — каркас готов!',
  'Шаг 4 из 4: Фигура готова! Нажми на 🔵 Длина / 🟠 Ширина / 🟢 Высота справа, чтобы подсветить нужные рёбра, или открой 3D.',
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

function getDimPalette(isDark) {
  return {
    length: {
      stroke: isDark ? '#38bdf8' : '#2563eb',
      bg: isDark ? '#0c2440' : '#eff6ff',
      text: isDark ? '#bae6fd' : '#1d4ed8',
      label: 'Длина',
    },
    width: {
      stroke: isDark ? '#fb923c' : '#ea580c',
      bg: isDark ? '#3b1d0a' : '#fff7ed',
      text: isDark ? '#fed7aa' : '#c2410c',
      label: 'Ширина',
    },
    height: {
      stroke: isDark ? '#4ade80' : '#16a34a',
      bg: isDark ? '#0a2e1a' : '#f0fdf4',
      text: isDark ? '#bbf7d0' : '#15803d',
      label: 'Высота',
    },
  };
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
    showDimNames = true, // Shows explicit color-coded "Длина / Ширина / Высота" arrows & pills!
    highlightDim = null, // 'length' | 'width' | 'height' | null
    drawEnabled = false,
    userLines = [], // [{ x1, y1, x2, y2 }]
    svgId = 'iso-svg-main',
    compact = false,
  } = options;

  const { a, b, h } = box;
  const pal = GRID_PALETTES[paletteKey] || GRID_PALETTES.purple;
  const isDark = theme === 'dark';
  const dimPal = getDimPalette(isDark);

  const S = 44;
  const padCols = compact ? 1 : 2;
  const padRows = compact ? 1 : 1.5;

  // Extra clean viewBox margin around dot lattice so color-coded "Длина / Ширина / Высота" badges NEVER clip!
  const extraLeft = showDimNames ? (compact ? 68 : 88) : 18;
  const extraRight = showDimNames ? (compact ? 74 : 96) : 22;
  const extraTop = showDimNames ? 28 : 12;
  const extraBottom = showDimNames ? 30 : 12;

  // Box spans cols [0 .. a+b], rows [-b*0.5 .. a*0.5 + h]
  const minCol = -padCols;
  const maxCol = a + b + padCols;
  const minRow = -b * 0.5 - padRows;
  const maxRow = a * 0.5 + h + padRows;

  const ox = -minCol * COS30 * S + S * 0.65 + extraLeft;
  const oy = -minRow * S + S * 0.65 + extraTop;

  const width = (maxCol - minCol) * COS30 * S + S * 1.3 + extraLeft + extraRight;
  const height = (maxRow - minRow) * S + S * 1.3 + extraTop + extraBottom;

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

  // 5) Main step-by-step edges (color-coded by Длина / Ширина / Высота on active step!)
  const sw = step >= 4 ? 2.8 : 3.2;
  const activeColor = step >= 4 ? strokeColor : wireColor;
  const edgeAttrs = (isNewest, customColor = null) =>
    `stroke="${isNewest ? (customColor || dimPal.length.stroke) : activeColor}" stroke-width="${isNewest ? 4 : sw}" stroke-linecap="round" stroke-linejoin="round"`;

  let stepEdgesSvg = '';
  let stepHopsSvg = '';

  // Helper to draw clear numbered segment-counting hops (color-coded to Length / Width / Height!)
  const drawHopCounter = (startCoord, stepVec, count, offsetX, offsetY, badgeColor) => {
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
        <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="10.5" fill="${badgeColor}" opacity="0.95"/>
        <text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="11.5" font-weight="800" font-family="JetBrains Mono, monospace">${k + 1}</text>
      `;
    }
    return out;
  };

  if (step >= 1) {
    const isNew = step === 1;
    stepEdgesSvg += `
      ${lineEl(L, T, 'iso-anim', edgeAttrs(isNew, dimPal.length.stroke))}
      ${lineEl(T, R, 'iso-anim', edgeAttrs(isNew, dimPal.width.stroke))}
      ${lineEl(R, F, 'iso-anim', edgeAttrs(isNew, dimPal.length.stroke))}
      ${lineEl(F, L, 'iso-anim', edgeAttrs(isNew, dimPal.width.stroke))}
    `;
    if (isNew) {
      stepHopsSvg += drawHopCounter([0, 0, 0], [0, 1, 0], b, -14, -12, dimPal.length.stroke);
      stepHopsSvg += drawHopCounter([0, 0, 0], [1, 0, 0], a, -12, 14, dimPal.width.stroke);
      [L, T, R, F].forEach((p) => {
        stepHopsSvg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.8" fill="${strokeColor}"/>`;
      });
    }
  }

  if (step >= 2) {
    const isNew = step === 2;
    stepEdgesSvg += `
      ${lineEl(L, Lb, 'iso-anim', edgeAttrs(isNew, dimPal.height.stroke))}
      ${lineEl(F, Fb, 'iso-anim', edgeAttrs(isNew, dimPal.height.stroke))}
      ${lineEl(R, Rb, 'iso-anim', edgeAttrs(isNew, dimPal.height.stroke))}
    `;
    if (isNew) {
      stepHopsSvg += drawHopCounter([0, 0, 0], [0, 0, 1], h, -18, 0, dimPal.height.stroke);
      [Lb, Fb, Rb].forEach((p) => {
        stepHopsSvg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.8" fill="${dimPal.height.stroke}"/>`;
      });
    }
  }

  if (step >= 3) {
    const isNew = step === 3;
    stepEdgesSvg += `
      ${lineEl(Lb, Fb, 'iso-anim', edgeAttrs(isNew, dimPal.width.stroke))}
      ${lineEl(Fb, Rb, 'iso-anim', edgeAttrs(isNew, dimPal.length.stroke))}
    `;
    if (isNew) {
      stepHopsSvg += drawHopCounter([0, 0, h], [1, 0, 0], a, -12, 16, dimPal.width.stroke);
      stepHopsSvg += drawHopCounter([a, 0, h], [0, 1, 0], b, 14, 14, dimPal.length.stroke);
    }
  }

  // 5b) Interactive teacher highlight: glow ALL parallel edges of Длина / Ширина / Высота!
  let highlightSvg = '';
  if (highlightDim && step >= 1) {
    const c = dimPal[highlightDim]?.stroke || dimPal.length.stroke;
    const pairs = [];
    if (highlightDim === 'length') {
      pairs.push([L, T], [F, R]);
      if (step >= 3) pairs.push([Fb, Rb]);
    } else if (highlightDim === 'width') {
      pairs.push([L, F], [T, R]);
      if (step >= 3) pairs.push([Lb, Fb]);
    } else if (highlightDim === 'height' && step >= 2) {
      pairs.push([L, Lb], [F, Fb], [R, Rb]);
    }
    highlightSvg = `<g class="iso-dim-highlight">${pairs
      .map(
        ([p1, p2]) => `
        <line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="${c}" stroke-width="11" stroke-opacity="0.26" stroke-linecap="round"/>
        <line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="${c}" stroke-width="5.2" stroke-linecap="round"/>`
      )
      .join('')}</g>`;
  }

  // 6) Crystal-clear color-coded Dimension Arrows + Pill Labels ("Длина", "Ширина", "Высота")
  let dimsSvg = '';

  const drawIsoDimArrow = (p1, p2, normalX, normalY, offsetDist, dimKey, valueNum, anchor) => {
    const dp = dimPal[dimKey];
    const isHl = highlightDim === dimKey;
    const isDimmed = highlightDim && highlightDim !== dimKey;
    const op = isDimmed ? 0.35 : 1;

    const a1 = [p1[0] + normalX * offsetDist, p1[1] + normalY * offsetDist];
    const a2 = [p2[0] + normalX * offsetDist, p2[1] + normalY * offsetDist];

    // Unit vector along arrow for crisp arrowheads
    const dx = a2[0] - a1[0];
    const dy = a2[1] - a1[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const ah = 7.5;
    const aw = 4.2;

    const h1a = [a1[0] + ux * ah + px * aw, a1[1] + uy * ah + py * aw];
    const h1b = [a1[0] + ux * ah - px * aw, a1[1] + uy * ah - py * aw];
    const h2a = [a2[0] - ux * ah + px * aw, a2[1] - uy * ah + py * aw];
    const h2b = [a2[0] - ux * ah - px * aw, a2[1] - uy * ah - py * aw];

    // Subtle dashed extension guides from cuboid corner to dimension line
    const g1Start = [p1[0] + normalX * 4, p1[1] + normalY * 4];
    const g2Start = [p2[0] + normalX * 4, p2[1] + normalY * 4];

    const labelText = showDimNames ? `${dp.label}: ${valueNum} ед.` : `${valueNum} ед.`;
    const fs = compact ? (showDimNames ? 12 : 14) : showDimNames ? 13.5 : 16;
    const pillPadX = showDimNames ? 9 : 6;
    const pillW = labelText.length * fs * 0.61 + pillPadX * 2;
    const pillH = fs + 10;

    const mx = (a1[0] + a2[0]) / 2 + normalX * (showDimNames ? 15 : 12);
    const my = (a1[1] + a2[1]) / 2 + normalY * (showDimNames ? 15 : 12);

    let rx = mx - pillW / 2;
    if (anchor === 'end') rx = mx - pillW;
    else if (anchor === 'start') rx = mx;
    const ry = my - pillH / 2;
    const tx = rx + pillW / 2;
    const ty = my + fs * 0.36;

    const strokeW = isHl ? 3.2 : 2.2;

    return `
      <g class="iso-dim-callout" opacity="${op}">
        <line x1="${g1Start[0].toFixed(1)}" y1="${g1Start[1].toFixed(1)}" x2="${a1[0].toFixed(1)}" y2="${a1[1].toFixed(1)}" stroke="${dp.stroke}" stroke-width="1.3" stroke-dasharray="3 3" stroke-opacity="0.65"/>
        <line x1="${g2Start[0].toFixed(1)}" y1="${g2Start[1].toFixed(1)}" x2="${a2[0].toFixed(1)}" y2="${a2[1].toFixed(1)}" stroke="${dp.stroke}" stroke-width="1.3" stroke-dasharray="3 3" stroke-opacity="0.65"/>
        <line x1="${a1[0].toFixed(1)}" y1="${a1[1].toFixed(1)}" x2="${a2[0].toFixed(1)}" y2="${a2[1].toFixed(1)}" stroke="${dp.stroke}" stroke-width="${strokeW}" stroke-linecap="round"/>
        <polyline points="${h1a[0].toFixed(1)},${h1a[1].toFixed(1)} ${a1[0].toFixed(1)},${a1[1].toFixed(1)} ${h1b[0].toFixed(1)},${h1b[1].toFixed(1)}" fill="none" stroke="${dp.stroke}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="${h2a[0].toFixed(1)},${h2a[1].toFixed(1)} ${a2[0].toFixed(1)},${a2[1].toFixed(1)} ${h2b[0].toFixed(1)},${h2b[1].toFixed(1)}" fill="none" stroke="${dp.stroke}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${pillW.toFixed(1)}" height="${pillH.toFixed(1)}" rx="${(pillH / 2).toFixed(1)}" fill="${isHl ? dp.stroke : dp.bg}" stroke="${dp.stroke}" stroke-width="${isHl ? 2.2 : 1.5}"/>
        <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" fill="${isHl ? '#ffffff' : dp.text}" font-family="Manrope, Segoe UI, sans-serif" font-size="${fs}" font-weight="800">${labelText}</text>
      </g>
    `;
  };

  if (showDims && step >= 1) {
    if (showDimNames) {
      // Show each dimension arrow as soon as that edge appears in the step-by-step animation!
      if (step >= 1) {
        // Длина (b) along top-left edge L -> T (normal up-left: -0.5, -0.866)
        dimsSvg += drawIsoDimArrow(L, T, -0.5, -COS30, 18, 'length', b, 'end');
      }
      if (step >= 3) {
        // Ширина (a) along bottom-left edge Lb -> Fb (normal down-left: -0.5, +0.866)
        dimsSvg += drawIsoDimArrow(Lb, Fb, -0.5, COS30, 18, 'width', a, 'end');
      } else if (step >= 1) {
        // On Step 1–2 before bottom exists, show Ширина along L -> F!
        dimsSvg += drawIsoDimArrow(L, F, -0.5, COS30, 18, 'width', a, 'end');
      }
      if (step >= 2) {
        // Высота (h) along right vertical edge R -> Rb (normal right: +1, 0)
        dimsSvg += drawIsoDimArrow(R, Rb, 1, 0, 18, 'height', h, 'start');
      }
    } else if (step >= 3) {
      // Classic minimal textbook numbers ("3 ед.", "4 ед.", "2 ед.") when teacher toggles off Д·Ш·В names
      const midLT = [(L[0] + T[0]) / 2 - 18, (L[1] + T[1]) / 2 - 12];
      const midRRb = [R[0] + 18, (R[1] + Rb[1]) / 2 + 5];
      const midLbFb = [(Lb[0] + Fb[0]) / 2 - 14, (Lb[1] + Fb[1]) / 2 + 22];
      const fs = compact ? 15 : 16.5;

      dimsSvg = `
        <g class="iso-dim-labels" font-family="Manrope, Segoe UI, sans-serif" font-size="${fs}" font-weight="800" fill="${dimTextColor}">
          <text x="${midLT[0].toFixed(1)}" y="${midLT[1].toFixed(1)}" text-anchor="end">${b} ед.</text>
          <text x="${midRRb[0].toFixed(1)}" y="${midRRb[1].toFixed(1)}" text-anchor="start">${h} ед.</text>
          <text x="${midLbFb[0].toFixed(1)}" y="${midLbFb[1].toFixed(1)}" text-anchor="end">${a} ед.</text>
        </g>
      `;
    }
  } else if (step === 0 && showDimNames) {
    // Non-spoilery 3-direction compass on blank dot grid so students know which diagonal is Длина / Ширина / Высота!
    const cx = compact ? 64 : 84;
    const cy = height - (compact ? 42 : 48);
    const rLen = compact ? 24 : 30;
    const pLen = [cx + COS30 * rLen, cy - SIN30 * rLen];
    const pWid = [cx + COS30 * rLen, cy + SIN30 * rLen];
    const pHgt = [cx, cy + rLen];
    const fsC = compact ? 10.5 : 11.5;
    const cardBg = isDark ? 'rgba(11, 25, 48, 0.92)' : 'rgba(255, 255, 255, 0.94)';
    const cardStroke = isDark ? 'rgba(148, 197, 255, 0.35)' : 'rgba(148, 163, 184, 0.45)';

    dimsSvg = `
      <g class="iso-compass">
        <rect x="${(cx - 48).toFixed(1)}" y="${(cy - 34).toFixed(1)}" width="${compact ? 146 : 164}" height="${compact ? 72 : 80}" rx="12" fill="${cardBg}" stroke="${cardStroke}" stroke-width="1.2"/>
        <circle cx="${cx}" cy="${cy}" r="3.5" fill="${dimTextColor}"/>
        <line x1="${cx}" y1="${cy}" x2="${pLen[0].toFixed(1)}" y2="${pLen[1].toFixed(1)}" stroke="${dimPal.length.stroke}" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="${cx}" y1="${cy}" x2="${pWid[0].toFixed(1)}" y2="${pWid[1].toFixed(1)}" stroke="${dimPal.width.stroke}" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="${cx}" y1="${cy}" x2="${pHgt[0].toFixed(1)}" y2="${pHgt[1].toFixed(1)}" stroke="${dimPal.height.stroke}" stroke-width="2.6" stroke-linecap="round"/>
        <text x="${(pLen[0] + 6).toFixed(1)}" y="${(pLen[1] + 2).toFixed(1)}" fill="${dimPal.length.text}" font-size="${fsC}" font-weight="800" font-family="Manrope, sans-serif">↗ Длина</text>
        <text x="${(pWid[0] + 6).toFixed(1)}" y="${(pWid[1] + 5).toFixed(1)}" fill="${dimPal.width.text}" font-size="${fsC}" font-weight="800" font-family="Manrope, sans-serif">↘ Ширина</text>
        <text x="${(cx - 8).toFixed(1)}" y="${(pHgt[1] + 4).toFixed(1)}" text-anchor="end" fill="${dimPal.height.text}" font-size="${fsC}" font-weight="800" font-family="Manrope, sans-serif">↓ Выс.</text>
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
        ${highlightSvg}
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
      showDimNames = true,
      highlightDim = null,
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
        showDimNames,
        highlightDim,
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
        showDimNames,
        highlightDim,
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
      showDimNames,
      highlightDim,
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
