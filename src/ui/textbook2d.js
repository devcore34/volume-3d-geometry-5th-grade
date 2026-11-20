// High-resolution vector 2D textbook blueprint renderer
// Matches the exact cabinet projection, axes, face shading, and dimension arrows of the 5th-grade textbook (pp. 111-114)
import { getBounds } from '../data/lessons.js';

const TEXTBOOK_COLORS = {
  pink: {
    front: '#f485a5',
    top: '#fbb4c9',
    right: '#dd5d83',
    strokeLight: '#4e162b',
    strokeDark: '#ffe0eb',
    dimLight: '#1e293b',
    dimDark: '#e2e8f0',
  },
  terracotta: {
    front: '#d98855',
    top: '#ebb289',
    right: '#be6a37',
    strokeLight: '#4d220b',
    strokeDark: '#ffe5cf',
    dimLight: '#1e293b',
    dimDark: '#e2e8f0',
  },
  emerald: {
    front: '#7ec778',
    top: '#a9e1a2',
    right: '#59a753',
    strokeLight: '#1a471a',
    strokeDark: '#d8fbd5',
    dimLight: '#1e293b',
    dimDark: '#e2e8f0',
  },
  cyan: {
    front: '#69cdd5',
    top: '#a3e7ec',
    right: '#2da5b1',
    strokeLight: '#104650',
    strokeDark: '#d2f9fc',
    dimLight: '#1e293b',
    dimDark: '#e2e8f0',
  },
  violet: {
    front: '#9585eb',
    top: '#bfb5f7',
    right: '#6f5ad4',
    strokeLight: '#281a66',
    strokeDark: '#e5e0ff',
    dimLight: '#1e293b',
    dimDark: '#e2e8f0',
  },
};

function renderSingleFigureSvg(cubes, options = {}) {
  const {
    palette = 'cyan',
    theme = 'light',
    showAxes = true,
    dimensions = null,
    caption = '',
    cornerLabel = '',
    compact = false,
  } = options;

  const isDark = theme === 'dark';
  const col = TEXTBOOK_COLORS[palette] || TEXTBOOK_COLORS.cyan;
  const strokeColor = isDark ? col.strokeDark : col.strokeLight;
  const axisColor = isDark ? 'rgba(148, 197, 255, 0.55)' : 'rgba(100, 116, 139, 0.65)';
  const dimColor = isDark ? col.dimDark : col.dimLight;

  if (!cubes || cubes.length === 0) {
    return `<svg class="tb2d-svg" viewBox="0 0 200 160"></svg>`;
  }

  // Exact textbook cabinet projection
  const dx = 1.0;
  const dy = -1.0;
  const dzx = -0.38;
  const dzy = 0.35;
  const pt = (x, y, z) => [x * dx + z * dzx, y * dy + z * dzy];

  const b = getBounds(cubes);
  // Shift coordinates so back-left-bottom sits at (0,0,0)
  const norm = cubes.map(([x, y, z]) => [x - b.minX, y - b.minY, z - b.minZ]);
  const sx = b.sx;
  const sy = b.sy;
  const sz = b.sz;

  const sorted = [...norm].sort((a, c) => a[2] - c[2] || a[0] - c[0] || a[1] - c[1]);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  const expand = ([px, py]) => {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  };

  // Axis endpoints (drawn behind cubes, matching textbook pages 112-114)
  const axOrigin = pt(0, 0, 0);
  const axYEnd = pt(0, sy + 0.85, 0);
  const axXEnd = pt(sx + 0.85, 0, 0);
  const axZEnd = pt(0, 0, sz + 0.95);

  if (showAxes) {
    expand(axOrigin);
    expand(axYEnd);
    expand(axXEnd);
    expand(axZEnd);
  }

  // Build cube face polygons
  const cubePolys = [];
  for (const [x, y, z] of sorted) {
    const p001 = pt(x, y, z + 1);
    const p101 = pt(x + 1, y, z + 1);
    const p111 = pt(x + 1, y + 1, z + 1);
    const p011 = pt(x, y + 1, z + 1);
    const p010 = pt(x, y + 1, z);
    const p110 = pt(x + 1, y + 1, z);
    const p100 = pt(x + 1, y, z);

    [p001, p101, p111, p011, p010, p110, p100].forEach(expand);

    cubePolys.push({
      top: [p010, p110, p111, p011],
      right: [p101, p100, p110, p111],
      front: [p001, p101, p111, p011],
    });
  }

  // Dimension callout geometry (for Page 111 theory items)
  const dimElements = [];
  const hasDims = Array.isArray(dimensions) && dimensions.length > 0;
  const spanRaw = Math.max(maxX - minX, maxY - minY, 1.8);
  const fontSize = Math.max(spanRaw * 0.085, 0.24);
  const arrowLen = Math.max(spanRaw * 0.032, 0.085);

  const drawDimArrow = (p1, p2, label, anchor = 'middle', lxOff = 0, lyOff = 0) => {
    expand(p1);
    expand(p2);
    const vx = p2[0] - p1[0];
    const vy = p2[1] - p1[1];
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len;
    const uy = vy / len;
    const nx = -uy;
    const ny = ux;

    const a1a = [p1[0] + ux * arrowLen + nx * arrowLen * 0.55, p1[1] + uy * arrowLen + ny * arrowLen * 0.55];
    const a1b = [p1[0] + ux * arrowLen - nx * arrowLen * 0.55, p1[1] + uy * arrowLen - ny * arrowLen * 0.55];
    const a2a = [p2[0] - ux * arrowLen + nx * arrowLen * 0.55, p2[1] - uy * arrowLen + ny * arrowLen * 0.55];
    const a2b = [p2[0] - ux * arrowLen - nx * arrowLen * 0.55, p2[1] - uy * arrowLen - ny * arrowLen * 0.55];

    const mx = (p1[0] + p2[0]) / 2 + lxOff;
    const my = (p1[1] + p2[1]) / 2 + lyOff;
    const textW = label.length * fontSize * 0.64;
    if (anchor === 'start') {
      expand([mx, my - fontSize]);
      expand([mx + textW, my + fontSize * 0.6]);
    } else if (anchor === 'end') {
      expand([mx - textW, my - fontSize]);
      expand([mx, my + fontSize * 0.6]);
    } else {
      expand([mx - textW * 0.52, my - fontSize]);
      expand([mx + textW * 0.52, my + fontSize * 0.6]);
    }

    dimElements.push(`
      <g class="tb2d-dim">
        <line x1="${p1[0].toFixed(3)}" y1="${p1[1].toFixed(3)}" x2="${p2[0].toFixed(3)}" y2="${p2[1].toFixed(3)}" stroke="${dimColor}" stroke-width="${(spanRaw * 0.0085).toFixed(4)}" />
        <polyline points="${a1a[0].toFixed(3)},${a1a[1].toFixed(3)} ${p1[0].toFixed(3)},${p1[1].toFixed(3)} ${a1b[0].toFixed(3)},${a1b[1].toFixed(3)}" fill="none" stroke="${dimColor}" stroke-width="${(spanRaw * 0.0085).toFixed(4)}" stroke-linejoin="round" stroke-linecap="round"/>
        <polyline points="${a2a[0].toFixed(3)},${a2a[1].toFixed(3)} ${p2[0].toFixed(3)},${p2[1].toFixed(3)} ${a2b[0].toFixed(3)},${a2b[1].toFixed(3)}" fill="none" stroke="${dimColor}" stroke-width="${(spanRaw * 0.0085).toFixed(4)}" stroke-linejoin="round" stroke-linecap="round"/>
        <text x="${mx.toFixed(3)}" y="${my.toFixed(3)}" text-anchor="${anchor}" fill="${dimColor}" font-size="${fontSize.toFixed(3)}" font-weight="700" font-family="Manrope, Segoe UI, sans-serif">${label}</text>
      </g>
    `);
  };

  if (hasDims) {
    const gap = Math.max(spanRaw * 0.075, 0.17);
    for (const d of dimensions) {
      if (d.axis === 'x') {
        const p1 = pt(0, sy, 0);
        const p2 = pt(sx, sy, 0);
        drawDimArrow([p1[0], p1[1] - gap], [p2[0], p2[1] - gap], d.label, 'middle', 0, -gap * 0.65);
      } else if (d.axis === 'y') {
        const p1 = pt(sx, 0, 0);
        const p2 = pt(sx, sy, 0);
        drawDimArrow([p1[0] + gap, p1[1]], [p2[0] + gap, p2[1]], d.label, 'start', gap * 0.75, fontSize * 0.35);
      } else if (d.axis === 'z') {
        const p1 = pt(0, sy, 0);
        const p2 = pt(0, sy, sz);
        drawDimArrow([p1[0] - gap * 0.9, p1[1] - gap * 0.3], [p2[0] - gap * 0.9, p2[1] - gap * 0.3], d.label, 'end', -gap * 0.65, -gap * 0.15);
      }
    }
  }

  // Reserve room for caption below figure if provided (A, B, C, D, X, Y, Z)
  const capSize = Math.max(spanRaw * 0.11, 0.36);
  const capY = maxY + capSize * 1.35;
  if (caption) {
    expand([minX, capY + capSize * 0.45]);
  }

  const pad = Math.max(spanRaw * (compact ? 0.09 : 0.12), 0.32);
  const vx = minX - pad;
  const vy = minY - pad;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  const strokeW = Math.max(Math.max(vw, vh) * 0.0055, 0.018);
  const axisW = strokeW * 0.72;
  const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');

  const axesSvg = showAxes
    ? `
      <g class="tb2d-axes">
        <line x1="${axOrigin[0].toFixed(3)}" y1="${axOrigin[1].toFixed(3)}" x2="${axYEnd[0].toFixed(3)}" y2="${axYEnd[1].toFixed(3)}" stroke="${axisColor}" stroke-width="${axisW.toFixed(4)}" stroke-linecap="round"/>
        <line x1="${axOrigin[0].toFixed(3)}" y1="${axOrigin[1].toFixed(3)}" x2="${axXEnd[0].toFixed(3)}" y2="${axXEnd[1].toFixed(3)}" stroke="${axisColor}" stroke-width="${axisW.toFixed(4)}" stroke-linecap="round"/>
        <line x1="${axOrigin[0].toFixed(3)}" y1="${axOrigin[1].toFixed(3)}" x2="${axZEnd[0].toFixed(3)}" y2="${axZEnd[1].toFixed(3)}" stroke="${axisColor}" stroke-width="${axisW.toFixed(4)}" stroke-linecap="round"/>
      </g>
    `
    : '';

  const cubesSvg = cubePolys
    .map(
      ({ top, right, front }) => `
      <polygon points="${fmt(top)}" fill="${col.top}" stroke="${strokeColor}" stroke-width="${strokeW.toFixed(4)}" stroke-linejoin="round"/>
      <polygon points="${fmt(right)}" fill="${col.right}" stroke="${strokeColor}" stroke-width="${strokeW.toFixed(4)}" stroke-linejoin="round"/>
      <polygon points="${fmt(front)}" fill="${col.front}" stroke="${strokeColor}" stroke-width="${strokeW.toFixed(4)}" stroke-linejoin="round"/>`
    )
    .join('');

  const captionSvg = caption
    ? `<text x="${((minX + maxX) / 2).toFixed(3)}" y="${capY.toFixed(3)}" text-anchor="middle" fill="${dimColor}" font-size="${capSize.toFixed(3)}" font-weight="800" font-family="Manrope, Segoe UI, sans-serif">${caption}</text>`
    : '';

  return `
    <div class="tb2d-figure-wrap">
      ${cornerLabel ? `<span class="tb2d-corner-tag">${cornerLabel}</span>` : ''}
      <svg class="tb2d-svg" viewBox="${vx.toFixed(3)} ${vy.toFixed(3)} ${vw.toFixed(3)} ${vh.toFixed(3)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="2D-чертёж из учебника">
        ${axesSvg}
        ${cubesSvg}
        ${dimElements.join('')}
        ${captionSvg}
      </svg>
    </div>
  `;
}

// Extract clean textbook letter caption & corner letter for any lesson item
function getTextbookLabels(item) {
  const map = {
    ex3a: { corner: 'a)', caption: 'A', axes: true },
    ex3b: { corner: 'b)', caption: 'B', axes: true },
    ex3c: { corner: 'c)', caption: 'C', axes: true },
    ex3d: { corner: 'd)', caption: 'D', axes: true },
    pracX: { corner: '', caption: 'X', axes: true },
    pracY: { corner: '', caption: 'Y', axes: true },
    pracZ: { corner: '', caption: 'Z', axes: true },
    task4a: { corner: 'a)', caption: '', axes: true },
    task4b: { corner: 'b)', caption: '', axes: true },
    task4c: { corner: 'c)', caption: '', axes: true },
    task4d: { corner: 'd)', caption: '', axes: true },
    task4e: { corner: 'e)', caption: '', axes: true },
    task4f: { corner: 'f)', caption: '', axes: true },
    'unit-cube': { corner: '1', caption: '', axes: false },
    ex2a: { corner: '2a)', caption: '', axes: false },
    ex2b: { corner: '2b)', caption: '', axes: false },
    ex2c: { corner: '2c)', caption: '', axes: false },
    'random-puzzle': { corner: '🎲', caption: '', axes: true },
  };
  return map[item.id] || { corner: '', caption: '', axes: true };
}

export function renderTextbook2DStage(item, options = {}) {
  const {
    theme = 'light',
    revealed = false,
    compareFocusSubset = false,
    builderCubes = null,
    reservoirPreset = null,
  } = options;

  // Multi-model comparison (Page 112 A-D grid or Page 113 X, Y, Z row)
  if (item.type === 'compare') {
    const models =
      compareFocusSubset && item.focusSubset
        ? item.models.filter((m) => item.focusSubset.includes(m.key))
        : item.models;
    const hl = item.highlightIds || [];
    const colsClass =
      models.length === 4 ? 'grid-2x2' : models.length === 3 ? 'grid-3' : 'grid-2';

    const cells = models
      .map((m, idx) => {
        const isHl = revealed && hl.includes(m.key);
        const corner = models.length === 4 ? `${String.fromCharCode(97 + idx)})` : '';
        const svgHtml = renderSingleFigureSvg(m.cubes, {
          palette: m.palette || item.palette,
          theme,
          showAxes: true,
          caption: m.key,
          cornerLabel: corner,
          compact: true,
        });
        return `
          <div class="tb2d-cell ${isHl ? 'is-highlight' : ''}">
            ${svgHtml}
            <div class="tb2d-cell-vol">${
              revealed ? `Объём = ${m.cubes.length} куб. ед.` : 'Объём = ? куб. ед.'
            }</div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="tb2d-sheet is-compare">
        <div class="tb2d-sheet-header">
          <span class="tb2d-book-badge">📖 2D-чертёж из учебника · ${item.page}</span>
          <span class="tb2d-sheet-title">${item.title}</span>
        </div>
        <div class="tb2d-compare-grid ${colsClass}">
          ${cells}
        </div>
      </div>
    `;
  }

  // Single figure, reservoir, or builder preview
  let cubes = item.type === 'builder' ? builderCubes : item.cubes;
  const meta = getTextbookLabels(item);

  // Page 111 exact textbook dimension captions
  let dims2d = null;
  if (item.type === 'reservoir' && reservoirPreset) {
    cubes = [];
    for (let y = 0; y < reservoirPreset.ny; y++) {
      for (let z = 0; z < reservoirPreset.nz; z++) {
        for (let x = 0; x < reservoirPreset.nx; x++) {
          cubes.push([x, y, z]);
        }
      }
    }
    dims2d = [
      { axis: 'x', label: `ширина = ${reservoirPreset.nx}` },
      { axis: 'y', label: `высота = ${reservoirPreset.ny}` },
      { axis: 'z', label: `длина = ${reservoirPreset.nz}` },
    ];
  } else if (item.id === 'unit-cube') {
    dims2d = [
      { axis: 'x', label: '1 единица' },
      { axis: 'y', label: '1 единица' },
      { axis: 'z', label: '1 единица' },
    ];
  } else if (item.id === 'ex2a') {
    dims2d = [{ axis: 'x', label: 'ребро' }];
  } else if (item.id === 'ex2b') {
    dims2d = [
      { axis: 'x', label: 'ширина' },
      { axis: 'y', label: 'высота' },
      { axis: 'z', label: 'длина' },
    ];
  }

  const svgHtml = renderSingleFigureSvg(cubes, {
    palette: item.palette || 'cyan',
    theme,
    showAxes: meta.axes,
    dimensions: dims2d,
    caption: meta.caption,
    cornerLabel: meta.corner,
    compact: false,
  });

  return `
    <div class="tb2d-sheet">
      <div class="tb2d-sheet-header">
        <span class="tb2d-book-badge">📖 2D-чертёж из учебника · ${item.page}</span>
        <span class="tb2d-sheet-title">${item.title}</span>
      </div>
      <div class="tb2d-single-canvas">
        ${svgHtml}
      </div>
    </div>
  `;
}
