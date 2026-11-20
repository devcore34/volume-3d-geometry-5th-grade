// All verified 5th-grade geometry figures from the textbook
// Coordinate convention:
//   x >= 0 : right (ширина)
//   y >= 0 : up (высота)
//   z >= 0 : front-left toward viewer (длина / глубина, z=0 is back wall)

export const PALETTES = {
  pink: {
    name: 'Розовый',
    fill: '#f16c94',
    accent: '#db2777',
    light: '#ff9ebb',
    dark: '#881337',
    edgeLight: '#3b0d20',
    edgeDark: '#ffd1e0',
  },
  terracotta: {
    name: 'Терракотовый',
    fill: '#dd834c',
    accent: '#c2591b',
    light: '#f5ad7c',
    dark: '#6c2d0b',
    edgeLight: '#3d1906',
    edgeDark: '#ffe0c4',
  },
  emerald: {
    name: 'Зелёный',
    fill: '#6ec06b',
    accent: '#2f9638',
    light: '#9be098',
    dark: '#194d1e',
    edgeLight: '#123815',
    edgeDark: '#c8f7c5',
  },
  cyan: {
    name: 'Бирюзовый',
    fill: '#52c3ce',
    accent: '#0e8f9e',
    light: '#8ce2eb',
    dark: '#0f4c55',
    edgeLight: '#0c3940',
    edgeDark: '#c8f6fa',
  },
  violet: {
    name: 'Фиолетовый',
    fill: '#8b7ae8',
    accent: '#6347d6',
    light: '#b7abff',
    dark: '#312175',
    edgeLight: '#221652',
    edgeDark: '#ded7ff',
  },
};

function makeBox(nx, ny, nz, ox = 0, oy = 0, oz = 0) {
  const out = [];
  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        out.push([ox + x, oy + y, oz + z]);
      }
    }
  }
  return out;
}

function makeStairs(width, steps) {
  const out = [];
  for (let z = 0; z < steps; z++) {
    const height = steps - z;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out.push([x, y, z]);
      }
    }
  }
  return out;
}

export function pluralCubes(n) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} кубическая единица`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} кубические единицы`;
  }
  return `${n} кубических единиц`;
}

export function pluralUnitCubes(n) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} единичный куб`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} единичных куба`;
  }
  return `${n} единичных кубов`;
}

export function getLayerBreakdown(cubes) {
  const map = new Map();
  for (const [, y] of cubes) {
    map.set(y, (map.get(y) || 0) + 1);
  }
  const layers = [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, count]) => ({ level: y + 1, y, count }));
  return layers;
}

export function getBounds(cubes) {
  if (!cubes || cubes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, sx: 1, sy: 1, sz: 1 };
  }
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const [x, y, z] of cubes) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return {
    minX, maxX, minY, maxY, minZ, maxZ,
    sx: maxX - minX + 1,
    sy: maxY - minY + 1,
    sz: maxZ - minZ + 1,
  };
}

// Reusable raw coordinate arrays
const COORDS = {
  unitCube: [[0, 0, 0]],
  ex2a: makeBox(2, 2, 2),
  ex2b: makeBox(3, 1, 1),
  ex2c: makeBox(5, 2, 1),

  ex3a: [
    [0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0], [2, 0, 0],
  ],
  ex3b: [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1],
  ],
  ex3c: [
    [0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1], [0, 0, 2], [1, 0, 2],
    [0, 1, 0], [1, 1, 2],
  ],
  ex3d: makeBox(3, 2, 1),

  pracX: makeStairs(2, 4), // 8 + 6 + 4 + 2 = 20
  pracY: [...makeBox(2, 3, 2), [0, 3, 0]], // 12 + 1 = 13
  pracZ: [...makeBox(6, 1, 2), ...makeBox(6, 1, 1, 0, 1, 0)], // 12 + 6 = 18

  task4a: [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0],
    [1, 1, 0], [4, 1, 0],
  ],
  task4b: [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0],
    [1, 1, 0], [3, 1, 0],
    [1, 0, 1], [2, 0, 1], [3, 0, 1],
  ],
  task4c: [
    [0, 0, 0], [1, 0, 0], [2, 0, 0],
    [1, 0, 1], [2, 0, 1],
    [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2],
    [3, 0, 3], [4, 0, 3],
    [3, 0, 4], [4, 0, 4],
    [4, 0, 5],
  ],
  task4d: makeStairs(2, 3), // 6 + 4 + 2 = 12
  task4e: [
    [0, 0, 0], [0, 0, 1],
    [0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [6, 0, 2], [7, 0, 2],
    [0, 1, 2],
    [2, 0, 3], [3, 0, 3],
    [7, 0, 1], [7, 1, 1], [7, 2, 1],
  ],
  task4f: [
    [0, 0, 0], [1, 0, 0], [2, 0, 0],
    [0, 0, 1], [1, 0, 1],
    [0, 0, 2],
    [0, 1, 0], [1, 1, 0],
    [0, 1, 1],
    [0, 2, 0],
  ],
};

export const RESERVOIR_PRESETS = [
  { id: 'r222', label: '2 × 2 × 2', name: 'Куб-коробка 2×2×2', nx: 2, ny: 2, nz: 2 },
  { id: 'r322', label: '3 × 2 × 2', name: 'Резервуар 3×2×2', nx: 3, ny: 2, nz: 2 },
  { id: 'r432', label: '4 × 3 × 2', name: 'Большой бак 4×3×2', nx: 4, ny: 3, nz: 2 },
];

export const SECTIONS = [
  {
    id: 'theory',
    badge: 'Стр. 111',
    shortTitle: '1. Теория',
    title: 'Смотрите и учитесь',
    subtitle: 'Единичный куб, кубы и кубоиды',
    palette: 'pink',
    items: [
      {
        id: 'unit-cube',
        type: 'figure',
        shortLabel: '1. Единичный куб',
        title: '1. Единичный куб',
        page: 'Стр. 111 · № 1',
        palette: 'pink',
        cubes: COORDS.unitCube,
        hideAnswerByDefault: true,
        showDimensionsDefault: true,
        hasReservoirShortcut: true,
        dimensions: [
          { axis: 'x', label: '1 единица' },
          { axis: 'y', label: '1 единица' },
          { axis: 'z', label: '1 единица' },
        ],
        description:
          'Это единичный куб. Его размеры: 1 единица × 1 единица × 1 единица. Чему равен его объём?',
        callout: 'Объём единичного куба равен объёму занимаемой им части пространства.',
        revealedNote: 'Размеры 1 × 1 × 1 — его объём равен ровно 1 кубической единице.',
        formula: '1 × 1 × 1 = 1 куб. ед.',
        hint: 'Покрути куб на доске! У него 6 одинаковых квадратных граней, 12 рёбер и 8 вершин.',
      },
      {
        id: 'unit-reservoir',
        type: 'reservoir',
        shortLabel: '1б) Резервуар',
        title: 'Что такое объём? Наполняем резервуар!',
        page: 'Стр. 111 · Демо № 1',
        palette: 'pink',
        hideAnswerByDefault: true,
        showDimensionsDefault: true,
        description:
          'Объём показывает, сколько единичных кубов помещается внутри ёмкости без пустот — ровно до самых краёв!',
        callout: 'Нажми «Наполнить до краёв», посчитай с классом и затем нажми «Показать ответ», чтобы проверить вместимость!',
      },
      {
        id: 'ex2a',
        type: 'figure',
        shortLabel: '2a) Куб',
        title: '2a) Определите объём куба',
        page: 'Стр. 111 · № 2a',
        palette: 'pink',
        cubes: COORDS.ex2a,
        hideAnswerByDefault: true,
        showDimensionsDefault: true,
        dimensions: [
          { axis: 'x', label: 'ребро' },
        ],
        description:
          'Этот куб состоит из единичных кубов. Посчитайте, из скольких единичных кубов он состоит и чему равен его объём.',
        callout: 'У куба все рёбра равны! Покрути его в 3D или нажми «Слои», чтобы не забыть спрятанные сзади кубы.',
        revealedNote: 'Этот куб состоит из 8 единичных кубов (два слоя по 4 куба).',
        formula: '2 × 2 × 2 = 8 куб. ед.',
        hint: 'В 2D-рисунке один куб сзади внизу не виден — разверни чертёж на 180°, чтобы показать его классу!',
      },
      {
        id: 'ex2b',
        type: 'figure',
        shortLabel: '2b) Кубоид',
        title: '2b) Определите объём кубоида',
        page: 'Стр. 111 · № 2b',
        palette: 'pink',
        cubes: COORDS.ex2b,
        hideAnswerByDefault: true,
        showDimensionsDefault: true,
        dimensions: [
          { axis: 'x', label: 'ширина' },
          { axis: 'y', label: 'высота' },
          { axis: 'z', label: 'длина' },
        ],
        description:
          'Этот кубоид состоит из единичных кубов. Найдите его объём в кубических единицах.',
        callout: 'Кубоид (прямоугольный параллелепипед) имеет длину, ширину и высоту.',
        revealedNote: 'Этот кубоид состоит из трёх единичных кубов в один ряд.',
        formula: '3 × 1 × 1 = 3 куб. ед.',
        hint: 'Посчитай, сколько единичных кубов выстроено в ряд.',
      },
      {
        id: 'ex2c',
        type: 'figure',
        shortLabel: '2c) Кубоид №2',
        title: '2c) Определите объём кубоида',
        page: 'Стр. 111 · № 2c',
        palette: 'pink',
        cubes: COORDS.ex2c,
        hideAnswerByDefault: true,
        showDimensionsDefault: true,
        dimensions: [
          { axis: 'x', label: 'ширина' },
          { axis: 'y', label: 'высота' },
          { axis: 'z', label: 'длина' },
        ],
        description:
          'Этот кубоид состоит из единичных кубов. Посчитайте, чему равен его объём.',
        callout: 'Разбей кубоид мысленно на ряды или слои — так считать гораздо быстрее!',
        revealedNote: 'Два слоя по 5 кубов: 5 + 5 = 10 единичных кубов.',
        formula: '5 × 2 × 1 = 10 куб. ед.',
        hint: 'Попробуй нажать «Счёт» или «Слои» в 3D — кубы покажутся по одному прямо на доске!',
      },
    ],
  },
  {
    id: 'equal',
    badge: 'Стр. 112',
    shortTitle: '2. Одинаковый объём',
    title: 'Могут ли разные фигуры иметь одинаковый объём?',
    subtitle: 'Задание 3: Фигуры A, B, C, D и их сравнение',
    palette: 'terracotta',
    items: [
      {
        id: 'ex3a',
        type: 'figure',
        shortLabel: '3a) Фигура A',
        title: '3a) Фигура A',
        page: 'Стр. 112 · № 3a',
        palette: 'terracotta',
        cubes: COORDS.ex3a,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре A и определи её объём.',
        callout: 'Будь внимателен: проверь в 3D, нет ли спрятанного куба под верхним!',
        revealedNote: 'Фигура A имеет наименьший объём среди фигур A, B, C, D (5 куб. ед.).',
        hint: 'Внимание! Под верхним кубом стоит невидимый спереди куб — поверни фигуру или включи «Рентген»!',
      },
      {
        id: 'ex3b',
        type: 'figure',
        shortLabel: '3b) Фигура B',
        title: '3b) Фигура B',
        page: 'Стр. 112 · № 3b',
        palette: 'terracotta',
        cubes: COORDS.ex3b,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре B и определи её объём.',
        callout: 'Запомни получившийся объём — пригодится при сравнении фигур A, B, C и D!',
        revealedNote: 'В нижнем слое 4 куба, в верхнем сзади — 2 куба. Итого 6 куб. ед.',
        hint: 'В нижнем слое 4 куба (2×2), а в верхнем слое сзади — ещё 2 куба.',
      },
      {
        id: 'ex3c',
        type: 'figure',
        shortLabel: '3c) Фигура C',
        title: '3c) Фигура C',
        page: 'Стр. 112 · № 3c',
        palette: 'terracotta',
        cubes: COORDS.ex3c,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре C и определи её объём.',
        callout: 'Осмотри фигуру со всех сторон в 3D или раздели её на слои!',
        revealedNote: 'Фигура C имеет наибольший объём среди фигур A, B, C, D (8 куб. ед.).',
        hint: 'Снизу прямоугольная площадка 2 × 3 = 6 кубов, и сверху ещё 2 куба по диагонали!',
      },
      {
        id: 'ex3d',
        type: 'figure',
        shortLabel: '3d) Фигура D',
        title: '3d) Фигура D',
        page: 'Стр. 112 · № 3d',
        palette: 'terracotta',
        cubes: COORDS.ex3d,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре D и определи её объём.',
        callout: 'Сравни получившийся объём с предыдущими фигурами A, B и C!',
        revealedNote: 'Другая форма, но объём ровно 6 куб. ед. — точно такой же, как у фигуры B!',
        formula: '3 × 2 × 1 = 6 куб. ед.',
        hint: 'Два ряда по 3 куба — всего 6 единичных кубов.',
      },
      {
        id: 'ex3-compare',
        type: 'compare',
        shortLabel: 'Сравнить A–D',
        title: 'Сравнение фигур A, B, C, D',
        page: 'Стр. 112 · Вопрос',
        palette: 'terracotta',
        hideAnswerByDefault: true,
        description:
          'Разные фигуры могут иметь одинаковый объём. Какие из фигур A, B, C, D имеют одинаковый объём?',
        callout: 'Покрути все 4 фигуры вместе и нажми «Разнести», чтобы сравнить число единичных кубов в каждой!',
        compareQuestion: 'Какие фигуры имеют одинаковый объём?',
        compareAnswerText: 'Фигуры B и D — обе имеют объём 6 кубических единиц! (Наименьший: A = 5, наибольший: C = 8)',
        highlightIds: ['B', 'D'],
        models: [
          { key: 'A', label: 'Фигура A', cubes: COORDS.ex3a, palette: 'terracotta' },
          { key: 'B', label: 'Фигура B', cubes: COORDS.ex3b, palette: 'terracotta' },
          { key: 'C', label: 'Фигура C', cubes: COORDS.ex3c, palette: 'terracotta' },
          { key: 'D', label: 'Фигура D', cubes: COORDS.ex3d, palette: 'terracotta' },
        ],
        focusSubset: ['B', 'D'],
        focusButtonLabel: 'Только B и D рядом',
      },
    ],
  },
  {
    id: 'practice',
    badge: 'Стр. 113',
    shortTitle: '3. Практика',
    title: 'Практические задания',
    subtitle: 'Конструктор из 3 и 4 кубов · Сравнение X, Y, Z',
    palette: 'emerald',
    items: [
      {
        id: 'prac1-builder',
        type: 'builder',
        shortLabel: '1. Конструктор',
        title: 'Задание 1: Составь фигуры из кубов',
        page: 'Стр. 113 · Практика № 1',
        palette: 'emerald',
        description:
          'a) Составьте 2 разные фигуры из 3 единичных кубов.\nb) Составьте 4 разные фигуры из 4 единичных кубов.\nОпределите объём каждой фигуры.',
        callout: 'Нажимай на грань куба или сетку пола, чтобы поставить новый куб. Программа сама проверит, не повторяется ли фигура даже при повороте!',
      },
      {
        id: 'pracX',
        type: 'figure',
        shortLabel: '2. Фигура X',
        title: 'Задание 2: Фигура X',
        page: 'Стр. 113 · № 2 (X)',
        palette: 'emerald',
        cubes: COORDS.pracX,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре X и определи её объём.',
        callout: 'Сложная лестница! Используй «Слои» или «Разнести», чтобы увидеть все спрятанные под ступеньками кубы.',
        hint: '4 ступеньки шириной по 2 куба: 4×2 + 3×2 + 2×2 + 1×2 = 8 + 6 + 4 + 2 = 20.',
      },
      {
        id: 'pracY',
        type: 'figure',
        shortLabel: '2. Фигура Y',
        title: 'Задание 2: Фигура Y',
        page: 'Стр. 113 · № 2 (Y)',
        palette: 'emerald',
        cubes: COORDS.pracY,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре Y и определи её объём.',
        callout: 'Осмотри башню со всех сторон в 3D — сначала посчитай нижнюю часть, потом верхний куб!',
        hint: 'Кубоид 2 × 3 × 2 = 12 кубов, плюс 1 куб наверху сзади слева = 13.',
      },
      {
        id: 'pracZ',
        type: 'figure',
        shortLabel: '2. Фигура Z',
        title: 'Задание 2: Фигура Z',
        page: 'Стр. 113 · № 2 (Z)',
        palette: 'emerald',
        cubes: COORDS.pracZ,
        hideAnswerByDefault: true,
        description:
          'Посчитай количество единичных кубов в фигуре Z и определи её объём.',
        callout: 'Посмотри на фигуру Z сбоку в 3D или раздели её на слои, чтобы легко посчитать объём!',
        hint: 'Нижний слой: 6 × 2 = 12 кубов. Верхний слой сзади: 6 кубов. Итого 18.',
      },
      {
        id: 'prac-compare',
        type: 'compare',
        shortLabel: 'Таблица X, Y, Z',
        title: 'Сравнение фигур X, Y и Z',
        page: 'Стр. 113 · № 2 (Итог)',
        palette: 'emerald',
        hideAnswerByDefault: true,
        description:
          'Сравните объёмы фигур X, Y и Z. Какая фигура имеет наибольший объём? Какая — наименьший?',
        callout: 'Поверни все три фигуры на доске и заполни таблицу вместе с классом!',
        compareQuestion: 'Наибольший и наименьший объём среди X, Y, Z:',
        compareAnswerText: 'Наибольший объём: фигура X (20 куб. ед.). Наименьший объём: фигура Y (13 куб. ед.). Фигура Z = 18 куб. ед.',
        highlightIds: ['X'],
        models: [
          { key: 'X', label: 'Фигура X', cubes: COORDS.pracX, palette: 'emerald' },
          { key: 'Y', label: 'Фигура Y', cubes: COORDS.pracY, palette: 'emerald' },
          { key: 'Z', label: 'Фигура Z', cubes: COORDS.pracZ, palette: 'emerald' },
        ],
      },
    ],
  },
  {
    id: 'tasks',
    badge: 'Стр. 114',
    shortTitle: '4. Задачи',
    title: 'Выполняйте и изучайте',
    subtitle: 'Найдите объёмы фигур a–f + Генератор задач',
    palette: 'cyan',
    items: [
      {
        id: 'task4a',
        type: 'figure',
        shortLabel: 'Задача a)',
        title: 'Задача a) Найдите объём фигуры',
        page: 'Стр. 114 · a)',
        palette: 'cyan',
        cubes: COORDS.task4a,
        hideAnswerByDefault: true,
        description: 'Найдите объём этой пространственной фигуры в кубических единицах.',
        hint: 'Нижний ряд — 5 кубов, на нём стоят ещё 2 куба. Всего 5 + 2 = 7.',
      },
      {
        id: 'task4b',
        type: 'figure',
        shortLabel: 'Задача b)',
        title: 'Задача b) Найдите объём фигуры',
        page: 'Стр. 114 · b)',
        palette: 'cyan',
        cubes: COORDS.task4b,
        hideAnswerByDefault: true,
        description: 'Найдите объём этой пространственной фигуры в кубических единицах.',
        hint: 'Сзади 5 кубов внизу + 2 наверху (7), а спереди приставлены ещё 3 куба. Всего 10.',
      },
      {
        id: 'task4c',
        type: 'figure',
        shortLabel: 'Задача c)',
        title: 'Задача c) Найдите объём фигуры',
        page: 'Стр. 114 · c)',
        palette: 'cyan',
        cubes: COORDS.task4c,
        hideAnswerByDefault: true,
        description: 'Найдите объём этой плоской ступенчатой фигуры. Совет: нажми ракурс «Сверху»!',
        hint: 'Все кубы в одном слое! По рядам сзади вперёд: 3 + 2 + 4 + 2 + 2 + 1 = 14.',
      },
      {
        id: 'task4d',
        type: 'figure',
        shortLabel: 'Задача d)',
        title: 'Задача d) Найдите объём фигуры',
        page: 'Стр. 114 · d)',
        palette: 'cyan',
        cubes: COORDS.task4d,
        hideAnswerByDefault: true,
        description: 'Найдите объём лестницы. Не забудь посчитать скрытые кубы под ступеньками!',
        hint: 'По слоям снизу вверх: 6 + 4 + 2 = 12 (или 2 одинаковых боковых среза по 6 кубов).',
      },
      {
        id: 'task4e',
        type: 'figure',
        shortLabel: 'Задача e)',
        title: 'Задача e) Найдите объём фигуры',
        page: 'Стр. 114 · e)',
        palette: 'cyan',
        cubes: COORDS.task4e,
        hideAnswerByDefault: true,
        description: 'Хитрая фигура со скрытыми кубами сзади! Обязательно покрути её на доске!',
        hint: 'Длинный ряд — 8 кубов, спереди выступ +2, слева сверху +1, сзади слева +2, справа башня ещё +3 (включая опору сзади). Итого 16!',
      },
      {
        id: 'task4f',
        type: 'figure',
        shortLabel: 'Задача f)',
        title: 'Задача f) Найдите объём фигуры',
        page: 'Стр. 114 · f)',
        palette: 'cyan',
        cubes: COORDS.task4f,
        hideAnswerByDefault: true,
        description: 'Угловая пирамида! Внутри под верхними ступеньками спрятаны опорные кубы — проверь «Слоями»!',
        hint: 'Нижний слой — 6 кубов, средний слой — 3 куба, вершина — 1 куб. Итого 6 + 3 + 1 = 10.',
      },
      {
        id: 'random-puzzle',
        type: 'random',
        shortLabel: 'Случайная + Итог',
        title: 'Генератор 3D-задач + Проверь себя',
        page: 'Стр. 114 · Проверьте себя',
        palette: 'violet',
        cubes: [
          [0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 0, 1], [1, 0, 1],
          [0, 1, 0], [1, 1, 0], [0, 2, 0], [2, 1, 0],
        ],
        hideAnswerByDefault: true,
        description:
          'Создавай новые 3D-фигуры одним нажатием для дополнительной тренировки у доски и отметь пункты самопроверки!',
        callout: 'Проверьте себя: умеешь ли ты составлять фигуры из единичных кубов и измерять их объём?',
      },
    ],
  },
];

// Preset example shapes for Практика №1 (Конструктор)
export const BUILDER_PRESETS = {
  n3: [
    { name: 'Линия (3×1×1)', cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0]] },
    { name: 'Уголок L', cubes: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] },
  ],
  n4: [
    { name: 'Палка 4×1×1', cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]] },
    { name: 'Квадрат 2×2', cubes: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]] },
    { name: 'Буква L', cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]] },
    { name: 'Буква T', cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]] },
    { name: 'Зигзаг S', cubes: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [2, 0, 1]] },
    { name: '3D-уголок', cubes: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]] },
  ],
};

// All 24 proper 3D cube rotations (orientation-preserving SO(3))
// Used to test if two student-built 3D voxel shapes are genuinely DIFFERENT
const ROTATIONS_24 = (() => {
  const axes = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
  ];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const mats = [];
  for (const r0 of axes) {
    for (const r1 of axes) {
      if (dot(r0, r1) !== 0) continue;
      const r2 = cross(r0, r1);
      mats.push([r0, r1, r2]);
    }
  }
  return mats;
})();

export function canonicalShapeKey(cubes) {
  if (!cubes || cubes.length === 0) return '';
  let best = null;
  for (const m of ROTATIONS_24) {
    const transformed = cubes.map(([x, y, z]) => [
      m[0][0] * x + m[0][1] * y + m[0][2] * z,
      m[1][0] * x + m[1][1] * y + m[1][2] * z,
      m[2][0] * x + m[2][1] * y + m[2][2] * z,
    ]);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    for (const [x, y, z] of transformed) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
    }
    const norm = transformed
      .map(([x, y, z]) => [x - minX, y - minY, z - minZ])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
      .map((c) => c.join(','))
      .join(';');
    if (best === null || norm < best) best = norm;
  }
  return best;
}

export function isShapeConnected(cubes) {
  if (cubes.length <= 1) return true;
  const set = new Set(cubes.map((c) => c.join(',')));
  const visited = new Set();
  const queue = [cubes[0]];
  visited.add(cubes[0].join(','));
  const dirs = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
  ];
  while (queue.length > 0) {
    const [x, y, z] = queue.shift();
    for (const [dx, dy, dz] of dirs) {
      const k = `${x + dx},${y + dy},${z + dz}`;
      if (set.has(k) && !visited.has(k)) {
        visited.add(k);
        queue.push([x + dx, y + dy, z + dz]);
      }
    }
  }
  return visited.size === cubes.length;
}

// Gravity-supported random 3D figure generator for extra practice in class
export function generateRandomFigure(difficulty = 'medium') {
  const cfg = {
    easy: { minCubes: 5, maxCubes: 8, maxX: 3, maxZ: 2, maxY: 2 },
    medium: { minCubes: 9, maxCubes: 14, maxX: 4, maxZ: 3, maxY: 3 },
    hard: { minCubes: 15, maxCubes: 22, maxX: 4, maxZ: 4, maxY: 4 },
  }[difficulty] || { minCubes: 9, maxCubes: 14, maxX: 4, maxZ: 3, maxY: 3 };

  const target =
    cfg.minCubes + Math.floor(Math.random() * (cfg.maxCubes - cfg.minCubes + 1));

  // Build connected footprint on y=0 first, then stack columns upward so every cube is gravity-supported
  const heights = new Map();
  const key = (x, z) => `${x},${z}`;
  heights.set(key(0, 0), 1);
  let total = 1;

  let guard = 0;
  while (total < target && guard < 400) {
    guard++;
    const cells = [...heights.keys()].map((k) => k.split(',').map(Number));
    const [cx, cz] = cells[Math.floor(Math.random() * cells.length)];
    const action = Math.random();

    if (action < 0.58) {
      // Expand horizontally to adjacent cell
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dz] = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx >= 0 && nx < cfg.maxX && nz >= 0 && nz < cfg.maxZ && !heights.has(key(nx, nz))) {
        heights.set(key(nx, nz), 1);
        total++;
      }
    } else {
      // Stack vertically on existing cell (preferring back/left so it looks like textbook shapes)
      const h = heights.get(key(cx, cz));
      if (h < cfg.maxY) {
        heights.set(key(cx, cz), h + 1);
        total++;
      }
    }
  }

  const cubes = [];
  for (const [k, h] of heights.entries()) {
    const [x, z] = k.split(',').map(Number);
    for (let y = 0; y < h; y++) {
      cubes.push([x, y, z]);
    }
  }
  return cubes;
}
