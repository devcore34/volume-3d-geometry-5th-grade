// Crisp textbook-style cabinet SVG mini-thumbnails for figure cards and builder gallery
import { PALETTES } from '../data/lessons.js';

export function renderCubesSvg(cubes, paletteKey = 'cyan', size = 54) {
  if (!cubes || cubes.length === 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" aria-hidden="true">
      <rect x="8" y="8" width="44" height="44" rx="10" fill="none" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/>
    </svg>`;
  }

  const pal = PALETTES[paletteKey] || PALETTES.cyan;
  const dx = 1;
  const dy = -1;
  const dzx = -0.38;
  const dzy = 0.35;

  const pt = (x, y, z) => [x * dx + z * dzx, y * dy + z * dzy];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const sorted = [...cubes].sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);

  const polys = [];
  for (const [x, y, z] of sorted) {
    const corners = [
      pt(x, y, z + 1),
      pt(x + 1, y, z + 1),
      pt(x + 1, y + 1, z + 1),
      pt(x, y + 1, z + 1),
      pt(x, y + 1, z),
      pt(x + 1, y + 1, z),
      pt(x + 1, y, z),
    ];
    for (const [px, py] of corners) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const top = [corners[4], corners[5], corners[2], corners[3]];
    const right = [corners[1], corners[6], corners[5], corners[2]];
    const front = [corners[0], corners[1], corners[2], corners[3]];
    polys.push({ top, right, front });
  }

  const pad = 0.25;
  const w = Math.max(maxX - minX, 1) + pad * 2;
  const h = Math.max(maxY - minY, 1) + pad * 2;
  const span = Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const vx = cx - span / 2;
  const vy = cy - span / 2;
  const sw = Math.max(span * 0.025, 0.045);

  const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

  const paths = polys
    .map(
      ({ top, right, front }) => `
      <polygon points="${fmt(top)}" fill="${pal.light}" stroke="${pal.edgeLight}" stroke-width="${sw}" stroke-linejoin="round"/>
      <polygon points="${fmt(right)}" fill="${pal.accent}" stroke="${pal.edgeLight}" stroke-width="${sw}" stroke-linejoin="round"/>
      <polygon points="${fmt(front)}" fill="${pal.fill}" stroke="${pal.edgeLight}" stroke-width="${sw}" stroke-linejoin="round"/>`
    )
    .join('');

  return `<svg width="${size}" height="${size}" viewBox="${vx.toFixed(2)} ${vy.toFixed(2)} ${span.toFixed(2)} ${span.toFixed(2)}" aria-hidden="true">${paths}</svg>`;
}
