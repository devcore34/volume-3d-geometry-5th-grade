// Topic 2 (Pages 115–117): "Изображение кубов и кубоидов на трёхмерной сетке"
// Isometric box dimensions convention:
//   a : front-left edge (down-right on dot grid)
//   b : front-right edge (up-right on dot grid, parallel to top-left edge)
//   h : vertical height

export const GRID_PALETTES = {
  purple: {
    top: '#cfc3e6',
    left: '#8d73b8',
    right: '#ae99d1',
    stroke: '#4b2d7a',
    strokeDark: '#e9ddff',
    wire: '#7e3ca6',
    wireDark: '#d8b4fe',
    fill3d: '#9f85c9',
  },
  sky: {
    top: '#cbeffc',
    left: '#49a9d6',
    right: '#84d0ee',
    stroke: '#1e3a5f',
    strokeDark: '#d4f3ff',
    wire: '#25528a',
    wireDark: '#7dd3fc',
    fill3d: '#5ebce3',
  },
  peach: {
    top: '#fde0b6',
    left: '#f4a852',
    right: '#f9c784',
    stroke: '#8a4c0f',
    strokeDark: '#ffebd0',
    wire: '#c26917',
    wireDark: '#fdba74',
    fill3d: '#f5b062',
  },
  sample: {
    // Textbook Page 117 color-coded faces (yellow, green, blue) for showing 90° rotation!
    top: '#a9d89e',
    left: '#f7ef99',
    right: '#8ecae6',
    stroke: '#253b6e',
    strokeDark: '#e2e8f0',
    wire: '#25528a',
    wireDark: '#93c5fd',
    fill3d: '#76c4a8',
    faceColorsPos1: { top: '#a3d997', left: '#f7ee91', right: '#8ac7e6' },
    faceColorsPos2: { top: '#8ac7e6', left: '#f7ee91', right: '#a3d997' },
  },
};

export function makeBoxCubes(a, b, h) {
  // For standard Three.js isometric view from (+X, +Y, +Z):
  //   +Z face (front-left) spans X (length a)
  //   +X face (front-right) spans Z (length b)
  //   +Y vertical spans Y (height h)
  const out = [];
  for (let y = 0; y < h; y++) {
    for (let z = 0; z < b; z++) {
      for (let x = 0; x < a; x++) {
        out.push([x, y, z]);
      }
    }
  }
  return out;
}

export const GRID_SECTIONS = [
  {
    id: 'grid-cubes',
    badge: 'Стр. 115',
    shortTitle: '1. Кубы',
    title: 'Нарисуйте кубы на сетке',
    subtitle: 'Стр. 115 · Смотрите и учитесь (Задание 1)',
    palette: 'purple',
    items: [
      {
        id: 'g1a',
        type: 'grid-single',
        shortLabel: '1a) Куб 1×1×1',
        title: '1a) Куб с ребром 1 единица',
        page: 'Стр. 115 · № 1a',
        palette: 'purple',
        box: { a: 1, b: 1, h: 1 },
        isCube: true,
        hideAnswerByDefault: false,
        description:
          'Посмотрим, как рисуется самый маленький единичный куб (1 × 1 × 1) на трёхмерной точечной сетке.',
        callout:
          'Главное правило сетки: считаем не точки, а ОТРЕЗКИ между точками! 1 единица = 1 шаг от точки к точке.',
        hint: 'Сверху ромб (по 1 шагу), вниз 3 вертикальных отрезка по 1 шагу и замыкаем нижние рёбра.',
      },
      {
        id: 'g1b',
        type: 'grid-single',
        shortLabel: '1b) Куб 2×2×2',
        title: '1b) Куб с ребром 2 единицы',
        page: 'Стр. 115 · № 1b',
        palette: 'purple',
        box: { a: 2, b: 2, h: 2 },
        isCube: true,
        hideAnswerByDefault: false,
        description:
          'Нарисуем куб со стороной 2 единицы. Все три измерения равны: 2 ед. × 2 ед. × 2 ед.',
        callout:
          'Нажми «▶ Пошагово», чтобы показать классу, как по очереди строятся верхняя грань, вертикальные рёбра и низ!',
        hint: 'Отсчитай по 2 отрезка (3 точки подряд) по каждому направлению: влево-вниз, вправо-вниз и строго вниз.',
      },
      {
        id: 'g1c',
        type: 'grid-single',
        shortLabel: '1c) Куб 4×4×4',
        title: '1c) Куб с ребром 4 единицы',
        page: 'Стр. 115 · № 1c',
        palette: 'purple',
        box: { a: 4, b: 4, h: 4 },
        isCube: true,
        hideAnswerByDefault: false,
        description:
          'Большой куб 4 ед. × 4 ед. × 4 ед. Внутри него помещается целый мир из единичных кубиков — проверь в 3D или в режиме Minecraft!',
        callout:
          'Включи «🧱 Единичные кубики» на сетке или нажми «⛏️ Майнкрафт» в 3D — дети сразу увидят, как из маленьких блоков складывается большой куб 4×4×4!',
        hint: '4 единицы = 4 отрезка (проходим через 5 точек). Объём такого куба: 4 × 4 × 4 = 64 куб. ед.',
      },
    ],
  },
  {
    id: 'grid-cuboids',
    badge: 'Стр. 116',
    shortTitle: '2. Кубоиды',
    title: 'Нарисуйте кубоиды на сетке',
    subtitle: 'Стр. 116 · Задание 2',
    palette: 'sky',
    items: [
      {
        id: 'g2a',
        type: 'grid-single',
        shortLabel: '2a) Кубоид 1×1×3',
        title: '2a) Высокий кубоид (1 × 1 × 3)',
        page: 'Стр. 116 · № 2a',
        palette: 'sky',
        box: { a: 1, b: 1, h: 3 },
        isCube: false,
        hideAnswerByDefault: false,
        description:
          'Нарисуйте кубоид с размерами 1 ед., 1 ед. и высотой 3 ед. Он похож на высокую башню из 3 кубов.',
        callout:
          'Верхняя грань — маленький ромб 1 × 1, а вертикальные рёбра спускаются на целых 3 шага вниз!',
        hint: 'Сверху 1 × 1, вниз по вертикали отсчитай 3 отрезка.',
      },
      {
        id: 'g2b',
        type: 'grid-single',
        shortLabel: '2b) Кубоид 3×4×2',
        title: '2b) Кубоид (3 × 4 × 2)',
        page: 'Стр. 116 · № 2b',
        palette: 'sky',
        box: { a: 3, b: 4, h: 2 },
        isCube: false,
        hideAnswerByDefault: false,
        description:
          'Нарисуйте широкий плоский кубоид: ширина — 3 ед., длина — 4 ед., высота — 2 ед.',
        callout:
          'Следи за цветами: 🔵 Длина идёт вправо-вверх (4 ед.), 🟠 Ширина — влево-вниз (3 ед.), 🟢 Высота — вниз (2 ед.). Нажми на любую из них справа, чтобы подсветить!',
        hint: 'Сверху параллелограмм 4 × 3 (длина 4, ширина 3), вниз опускаем три ребра высотой 2 отрезка и замыкаем низ.',
      },
      {
        id: 'g2c',
        type: 'grid-single',
        shortLabel: '2c) Кубоид 3×5×5',
        title: '2c) Большой кубоид (3 × 5 × 5)',
        page: 'Стр. 116 · № 2c',
        palette: 'sky',
        box: { a: 3, b: 5, h: 5 },
        isCube: false,
        hideAnswerByDefault: false,
        description:
          'Нарисуйте крупный кубоид: ширина — 3 ед., длина — 5 ед., высота — 5 ед.',
        callout:
          'Обрати внимание: 🔵 Длина = 5 ед. и 🟢 Высота = 5 ед. (образуют квадрат 5 × 5), а 🟠 Ширина = 3 ед.!',
        hint: 'Сверху 5 × 3 (длина 5, ширина 3), затем вниз 3 вертикальных ребра высотой 5 отрезков и замыкаем низ.',
      },
    ],
  },
  {
    id: 'grid-two-pos',
    badge: 'Стр. 117',
    shortTitle: '3. Два положения',
    title: 'Два разных положения на сетке',
    subtitle: 'Стр. 117 · Образец и Практические задания',
    palette: 'sample',
    items: [
      {
        id: 'g3-sample',
        type: 'grid-double',
        shortLabel: 'Образец: 3×3×2',
        title: 'Образец: кубоид 3 × 3 × 2 в двух положениях',
        page: 'Стр. 117 · Образец',
        palette: 'sample',
        pos1: { a: 3, b: 3, h: 2, label: 'Положение 1 (лежит): 3 × 3 × 2' },
        pos2: { a: 2, b: 3, h: 3, label: 'Положение 2 (стоит): 2 × 3 × 3' },
        colorCodedFaces: true,
        hideAnswerByDefault: false,
        description:
          'Один и тот же кубоид (ширина 3, длина 3, высота 2) можно положить на бок или поставить вертикально!',
        callout:
          'Перейди в 3D и нажми «🔄 Повернуть на 90°» — дети увидят, как зелёная верхняя грань становится боковой, а голубая — верхней!',
        hint: 'В положении 1 высота равна 2, а в положении 2 мы повернули кубоид на 90°, и его высота стала равна 3!',
      },
      {
        id: 'g3a',
        type: 'grid-double',
        shortLabel: 'Практ. a) Куб 4×4×4',
        title: 'Практика a) Куб 4 × 4 × 4 в двух положениях',
        page: 'Стр. 117 · Практ. a)',
        palette: 'sample',
        pos1: { a: 4, b: 4, h: 4, label: 'Положение 1: 4 × 4 × 4' },
        pos2: { a: 4, b: 4, h: 4, label: 'Положение 2 (повернули на 90°): 4 × 4 × 4' },
        colorCodedFaces: true,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте куб с измерениями 4 ед., 4 ед., 4 ед. в двух различных положениях. Что вы заметили?',
        callout:
          'Спросите класс: изменится ли форма куба на сетке, если его перевернуть? А поменяются ли местами его цветные грани?',
        hint: 'У куба все три ребра равны 4 ед., поэтому форма на сетке остаётся одинаковой — меняются только цвета граней при повороте!',
      },
      {
        id: 'g3b',
        type: 'grid-double',
        shortLabel: 'Практ. b) Куб 2×2×2',
        title: 'Практика b) Куб 2 × 2 × 2 в двух положениях',
        page: 'Стр. 117 · Практ. b)',
        palette: 'sample',
        pos1: { a: 2, b: 2, h: 2, label: 'Положение 1: 2 × 2 × 2' },
        pos2: { a: 2, b: 2, h: 2, label: 'Положение 2 (повернули на 90°): 2 × 2 × 2' },
        colorCodedFaces: true,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте куб с измерениями 2 ед., 2 ед., 2 ед. в двух различных положениях и опишите его.',
        callout:
          'Попробуйте сначала нарисовать его по точкам на доске, а потом нажмите «👁 Ответ» и покрутите в 3D!',
        hint: 'Все рёбра равны 2 отрезкам. Объём куба — 8 куб. ед. при любом повороте!',
      },
      {
        id: 'g3c',
        type: 'grid-double',
        shortLabel: 'Практ. c) 3×1×1',
        title: 'Практика c) Кубоид 3 × 1 × 1 в двух положениях',
        page: 'Стр. 117 · Практ. c)',
        palette: 'sample',
        pos1: { a: 3, b: 1, h: 1, label: 'Положение 1 (лежит): 3 × 1 × 1' },
        pos2: { a: 1, b: 1, h: 3, label: 'Положение 2 (стоит): 1 × 1 × 3' },
        colorCodedFaces: true,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте кубоид с измерениями: 3 единицы (ширина), 1 единица (длина), 1 единица (высота) в двух положениях.',
        callout:
          'Он может лежать как брусок (ширина 3 горизонтально) или стоять как башенка (высота 3 вертикально)!',
        hint: 'Положение 1: горизонтальный брусок 3 × 1 × 1. Положение 2: повернули на 90° — вертикальная колонна 1 × 1 × 3.',
      },
      {
        id: 'g3d',
        type: 'grid-double',
        shortLabel: 'Практ. d) 4×1×2',
        title: 'Практика d) Кубоид 4 × 1 × 2 в двух положениях',
        page: 'Стр. 117 · Практ. d)',
        palette: 'sample',
        pos1: { a: 4, b: 1, h: 2, label: 'Положение 1 (горизонтально): 4 × 1 × 2' },
        pos2: { a: 2, b: 1, h: 4, label: 'Положение 2 (вертикально): 2 × 1 × 4' },
        colorCodedFaces: true,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте кубоид с измерениями: 4 единицы (ширина), 1 единица (длина), 2 единицы (высота) в двух положениях.',
        callout:
          'Посмотрите, как плоская стена 4 × 2 превращается в высокую башню 2 × 4 при повороте на 90°!',
        hint: 'В положении 1 ширина 4 и высота 2; поворачиваем на 90° — высота становится 4, а ширина 2!',
      },
    ],
  },
  {
    id: 'grid-tasks',
    badge: 'Стр. 117',
    shortTitle: '4. Задачи + 🎲',
    title: 'Выполняйте и изучайте',
    subtitle: 'Стр. 117 · Задачи a–c и Рандомный генератор',
    palette: 'peach',
    items: [
      {
        id: 'g4a',
        type: 'grid-single',
        shortLabel: 'Задача a) 1×2×3',
        title: 'Задача a) Нарисуйте фигуру (2 × 1 × 3)',
        page: 'Стр. 117 · a)',
        palette: 'peach',
        box: { a: 1, b: 2, h: 3 },
        isCube: false,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте на трёхмерной сетке кубоид с размерами 2 ед., 1 ед. и высотой 3 ед.',
        callout:
          'Попробуйте сначала нарисовать прямо по точкам на доске кнопкой «✍️ Рисовать», а затем нажмите «👁 Ответ»!',
        hint: 'Узкая грань слева — 1 шаг, более широкая грань справа — 2 шага, высота — 3 шага вниз.',
      },
      {
        id: 'g4b',
        type: 'grid-single',
        shortLabel: 'Задача b) 3×3×3',
        title: 'Задача b) Нарисуйте куб (3 × 3 × 3)',
        page: 'Стр. 117 · b)',
        palette: 'peach',
        box: { a: 3, b: 3, h: 3 },
        isCube: true,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте на трёхмерной сетке куб с ребром 3 единицы (3 ед. × 3 ед. × 3 ед.).',
        callout:
          'Как Кубик Рубика! Все рёбра равны 3 отрезкам между точками.',
        hint: 'Отсчитывай ровно 3 отрезка по каждому направлению сетки. Объём = 3 × 3 × 3 = 27 куб. ед.',
      },
      {
        id: 'g4c',
        type: 'grid-single',
        shortLabel: 'Задача c) 2×3×2',
        title: 'Задача c) Нарисуйте кубоид (3 × 2 × 2)',
        page: 'Стр. 117 · c)',
        palette: 'peach',
        box: { a: 2, b: 3, h: 2 },
        isCube: false,
        hideAnswerByDefault: true,
        description:
          'Нарисуйте на трёхмерной сетке кубоид с размерами 3 ед., 2 ед. и высотой 2 ед.',
        callout:
          'Передняя левая грань — квадрат 2 × 2, а правая грань — прямоугольник 3 × 2!',
        hint: 'Сверху параллелограмм 2 × 3, затем 3 вертикальных ребра вниз по 2 шага.',
      },
      {
        id: 'g4-random',
        type: 'grid-random',
        shortLabel: 'Генератор сетки',
        title: 'Рандомный генератор на 3D-сетке',
        page: 'Стр. 117 · Генератор + Проверь себя',
        palette: 'peach',
        box: { a: 2, b: 4, h: 3 },
        pos1: { a: 2, b: 4, h: 3, label: 'Положение 1: 2 × 4 × 3' },
        pos2: { a: 3, b: 4, h: 2, label: 'Положение 2: 3 × 4 × 2' },
        randomKind: 'cuboid', // 'cube' | 'cuboid' | 'double'
        isCube: false,
        hideAnswerByDefault: true,
        description:
          'Создавайте случайные кубы и кубоиды для тренировки у доски! Сначала рисуйте по точкам, потом проверяйте ответ и крутите в 3D или Minecraft!',
        callout: 'Проверьте себя (стр. 117): умеешь ли ты рисовать куб и кубоид на трёхмерной сетке?',
      },
    ],
  },
];

export function generateRandomGridBox(kind = 'cuboid') {
  if (kind === 'cube') {
    const s = 1 + Math.floor(Math.random() * 4); // 1..4
    return {
      isCube: true,
      box: { a: s, b: s, h: s },
      title: `Случайный куб (${s} × ${s} × ${s})`,
      description: `Нарисуйте на трёхмерной сетке куб с ребром ${s} ${s === 1 ? 'единица' : s < 5 ? 'единицы' : 'единиц'}.`,
      hint: `Отсчитай по ${s} отрезков по каждому из трёх направлений сетки. Объём: ${s} × ${s} × ${s} = ${s * s * s} куб. ед.`,
    };
  }

  // Generate cuboid with at least 2 distinct dimensions (1..4 / 1..5, keeping size crisp on grid)
  let a, b, h;
  do {
    a = 1 + Math.floor(Math.random() * 4); // 1..4
    b = 1 + Math.floor(Math.random() * 5); // 1..5
    h = 1 + Math.floor(Math.random() * 4); // 1..4
  } while ((a === b && b === h) || a + b + h > 11);

  if (kind === 'double') {
    // Ensure a !== h so 90° Z-rotation always produces a visibly different orientation!
    if (a === h) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    const p1 = { a, b, h, label: `Положение 1: ${a} × ${b} × ${h}` };
    const p2 = { a: h, b, h: a, label: `Положение 2: ${h} × ${b} × ${a}` };
    return {
      isCube: false,
      box: p1,
      pos1: p1,
      pos2: p2,
      title: `Случайный кубоид в 2 положениях (${a} × ${b} × ${h})`,
      description: `Нарисуйте кубоид с измерениями ${a} ед., ${b} ед. и ${h} ед. в двух различных положениях на трёхмерной сетке.`,
      hint: `В положении 1 высота = ${p1.h} ед., а если повернуть на 90° (положение 2), высота станет ${p2.h} ед. Объём всегда равен ${a * b * h} куб. ед.!`,
    };
  }

  return {
    isCube: false,
    box: { a, b, h },
    title: `Случайный кубоид (${a} × ${b} × ${h})`,
    description: `Нарисуйте на трёхмерной сетке кубоид: длина ${b} ед., ширина ${a} ед., высота ${h} ед.`,
    hint: `Сверху параллелограмм (🔵 длина ${b}, 🟠 ширина ${a}), вниз 3 вертикальных ребра по 🟢 высоте ${h}. Объём = ${a * b * h} куб. ед.`,
  };
}
