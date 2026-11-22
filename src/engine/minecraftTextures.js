import * as THREE from 'three';

// Deterministic lightweight PRNG so pixel textures look artisanal & consistent every load
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePixelTexture(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function fillNoise(ctx, colors, seed, x0 = 0, y0 = 0, w = 16, h = 16) {
  const rand = mulberry32(seed);
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export const MINECRAFT_BLOCKS = [
  { id: 'grass', label: 'Трава', icon: '🌿' },
  { id: 'oak', label: 'Доски', icon: '🪵' },
  { id: 'bricks', label: 'Кирпич', icon: '🧱' },
  { id: 'diamond', label: 'Алмаз', icon: '💎' },
  { id: 'gold', label: 'Золото', icon: '🪙' },
  { id: 'emerald', label: 'Изумруд', icon: '🟩' },
];

let cache = null;

function buildTextureSet() {
  const dirtTex = makePixelTexture((ctx) => {
    fillNoise(ctx, ['#866043', '#79553a', '#936a4a', '#6d4c33', '#8b6548'], 101);
    // Tiny stone specks like classic dirt
    const rand = mulberry32(102);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#594230' : '#9c8a7b';
      ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
    }
  });

  const grassTopTex = makePixelTexture((ctx) => {
    fillNoise(ctx, ['#5ea832', '#6ab83b', '#529a2a', '#75c443', '#61af34'], 201);
  });

  const grassSideTex = makePixelTexture((ctx) => {
    // Dirt base
    fillNoise(ctx, ['#866043', '#79553a', '#936a4a', '#6d4c33'], 202);
    // Jagged grass overhang along top 3-5 pixels
    const overhang = [3, 4, 3, 5, 4, 3, 4, 5, 3, 3, 4, 5, 4, 3, 4, 3];
    const greens = ['#5ea832', '#6ab83b', '#529a2a', '#75c443'];
    const rand = mulberry32(203);
    for (let x = 0; x < 16; x++) {
      const depth = overhang[x];
      for (let y = 0; y < depth; y++) {
        ctx.fillStyle = y === depth - 1 ? '#478624' : greens[Math.floor(rand() * greens.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const oakTex = makePixelTexture((ctx) => {
    fillNoise(ctx, ['#b8945f', '#ad8953', '#c29e68', '#a37f4b'], 301);
    // 4 horizontal plank seams
    ctx.fillStyle = '#73552d';
    for (let y = 0; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
    }
    // Staggered vertical plank joints
    const joints = [
      [3, 0],
      [11, 4],
      [6, 8],
      [13, 12],
    ];
    for (const [jx, jy] of joints) {
      ctx.fillStyle = '#73552d';
      ctx.fillRect(jx, jy, 1, 4);
      ctx.fillStyle = '#cfa974';
      ctx.fillRect((jx + 1) % 16, jy + 1, 1, 2);
    }
  });

  const bricksTex = makePixelTexture((ctx) => {
    // Mortar background
    fillNoise(ctx, ['#c9c2b8', '#bdb6ac', '#d1cbc2'], 401);
    const brickCols = ['#9e4c3a', '#ad5642', '#8f4130', '#a6513e'];
    const rand = mulberry32(402);
    const rows = [
      { y: 1, h: 3, off: 0 },
      { y: 5, h: 3, off: 4 },
      { y: 9, h: 3, off: 0 },
      { y: 13, h: 3, off: 4 },
    ];
    for (const r of rows) {
      for (let x = 0; x < 16; x++) {
        const inBrick = (x + r.off) % 8 !== 7;
        if (!inBrick) continue;
        for (let dy = 0; dy < r.h; dy++) {
          ctx.fillStyle = brickCols[Math.floor(rand() * brickCols.length)];
          ctx.fillRect(x, r.y + dy, 1, 1);
        }
      }
    }
  });

  const diamondTex = makePixelTexture((ctx) => {
    fillNoise(ctx, ['#7d7d7d', '#707070', '#8a8a8a', '#686868', '#838383'], 501);
    // Iconic cyan diamond clusters
    const clusters = [
      [3, 3], [4, 3], [4, 4], [2, 4],
      [10, 2], [11, 2], [11, 3],
      [7, 8], [8, 8], [8, 9], [9, 9],
      [3, 11], [4, 11], [4, 12],
      [12, 11], [13, 11], [12, 12],
    ];
    clusters.forEach(([x, y], i) => {
      ctx.fillStyle = i % 3 === 0 ? '#7df9ff' : i % 3 === 1 ? '#29d9e0' : '#18b2bd';
      ctx.fillRect(x, y, 1, 1);
    });
  });

  const goldTex = makePixelTexture((ctx) => {
    fillNoise(ctx, ['#f6d437', '#ecc424', '#fae152', '#e0b31b'], 601);
    // Beveled outer frame
    ctx.fillStyle = '#c49212';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillStyle = '#fff58f';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    // Inner metallic rectangle sheen
    ctx.fillStyle = '#fff9b3';
    ctx.fillRect(2, 2, 11, 1);
    ctx.fillRect(2, 2, 1, 10);
    ctx.fillRect(4, 4, 3, 2);
    ctx.fillStyle = '#d4a318';
    ctx.fillRect(3, 13, 11, 1);
    ctx.fillRect(13, 3, 1, 11);
  });

  const emeraldTex = makePixelTexture((ctx) => {
    fillNoise(ctx, ['#1dd661', '#15bf53', '#2fe372', '#12ad4a'], 701);
    // Outer facet frame
    ctx.fillStyle = '#0a7a33';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillStyle = '#8efdb8';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    // Inner diamond-emerald jewel facets
    ctx.fillStyle = '#6cf7a1';
    ctx.fillRect(3, 3, 10, 1);
    ctx.fillRect(3, 3, 1, 10);
    ctx.fillRect(6, 5, 4, 4);
    ctx.fillStyle = '#b9ffd3';
    ctx.fillRect(6, 5, 2, 2);
    ctx.fillStyle = '#0c8f3d';
    ctx.fillRect(3, 12, 10, 1);
    ctx.fillRect(12, 3, 1, 10);
  });

  return {
    dirtTex,
    grassTopTex,
    grassSideTex,
    oakTex,
    bricksTex,
    diamondTex,
    goldTex,
    emeraldTex,
  };
}

function getTextures() {
  if (!cache) cache = buildTextureSet();
  return cache;
}

// Create a Three.js material (or 6-face material array for Grass block!) for a unit cube
// BoxGeometry / RoundedBoxGeometry face order: +x (right), -x (left), +y (top), -y (bottom), +z (front), -z (back)
export function createMinecraftCubeMaterial(blockType = 'grass', isTopExposed = true) {
  const t = getTextures();

  const makeMat = (map, roughness = 0.72, metalness = 0.04) =>
    new THREE.MeshStandardMaterial({
      map,
      color: 0xffffff,
      roughness,
      metalness,
      transparent: false,
      opacity: 1,
    });

  if (blockType === 'grass') {
    if (!isTopExposed) {
      return makeMat(t.dirtTex, 0.85, 0.02);
    }
    const side = makeMat(t.grassSideTex, 0.8, 0.02);
    const top = makeMat(t.grassTopTex, 0.78, 0.02);
    const bottom = makeMat(t.dirtTex, 0.85, 0.02);
    return [side, side.clone(), top, bottom, side.clone(), side.clone()];
  }

  if (blockType === 'oak') return makeMat(t.oakTex, 0.75, 0.02);
  if (blockType === 'bricks') return makeMat(t.bricksTex, 0.82, 0.02);
  if (blockType === 'diamond') return makeMat(t.diamondTex, 0.52, 0.14);
  if (blockType === 'gold') return makeMat(t.goldTex, 0.34, 0.38);
  if (blockType === 'emerald') return makeMat(t.emeraldTex, 0.36, 0.2);

  return makeMat(t.grassTopTex, 0.78, 0.02);
}

// Helper to apply properties cleanly whether mesh.material is a single Material or Material[]
export function forEachMaterial(mesh, fn) {
  if (!mesh || !mesh.material) return;
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(fn);
  } else {
    fn(mesh.material);
  }
}

export function disposeMeshMaterial(mesh) {
  if (!mesh || !mesh.material) return;
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
