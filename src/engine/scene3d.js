import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PALETTES, getBounds } from '../data/lessons.js';

function createCubeFaceTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Subtle soft vignette gradient on each unit face so individual squares read clearly
  const grad = ctx.createRadialGradient(size * 0.42, size * 0.38, size * 0.08, size * 0.5, size * 0.5, size * 0.78);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.75, '#f6f7f9');
  grad.addColorStop(1, '#e4e8ef');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle architectural inner border frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class GeometryScene {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.theme = 'light'; // 'light' | 'dark'
    this.projection = 'perspective'; // 'perspective' | 'ortho'
    this.mode = 'figure'; // 'figure' | 'compare' | 'builder'

    // Visual tool states
    this.explode = 0;
    this.layerLimit = null; // null = all layers, 1..N = max visible height level
    this.xray = false;
    this.showAxes = true;
    this.showDimensions = false;
    this.showNumbers = false;
    this.countVisible = null; // null = show all, integer 0..N = step animation count
    this.interactionMode = 'orbit'; // 'orbit' | 'count' | 'peel'

    // Builder state
    this.builderTool = 'add'; // 'add' | 'remove'
    this.builderCubes = new Map(); // "x,y,z" -> [x,y,z]
    this.builderPalette = 'emerald';

    // Interactive cube state
    this.countedOrder = []; // array of cube id strings in order clicked
    this.peeledSet = new Set();

    // Scene objects tracking
    this.cubeEntries = []; // { id, coord, groupIndex, groupCenter, basePos, mesh, edges, labelObj, labelEl, palette, scaleAnim, targetScale, isBuilder }
    this.compareMeta = []; // { key, label, count, center, badgeObj, badgeEl, padMesh, ringMesh }
    this.currentBounds = null;
    this.currentCenter = new THREE.Vector3(0, 0.5, 0);
    this.currentRadius = 2.5;
    this.currentDimensionsSpec = null;

    // Camera transition & safe-area framing state
    this.camAnim = null;
    this.lastPreset = 'textbook';
    this.safeInsets = { left: 258, right: 346, top: 80, bottom: 90 };
    this.currentHalfWidth = 1.6;
    this.currentHalfHeight = 1.4;
    this.pointerDownPos = null;
    this.isDragging = false;
    this.hoveredEntry = null;

    // Smart Performance & On-Demand Rendering state (for 4K electronic boards & phones)
    this.paused = false;
    this.rafRunning = false;
    this.idleFrames = 0;
    this.lowPerfActive = false;
    this.slowFrameCount = 0;
    this.shadowsDirty = true;

    this._initRenderer();
    this._initScene();
    this._initCamerasAndControls();
    this._initLights();
    this._initSharedAssets();
    this._initEvents();

    this.clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    this.requestRender(true);
  }

  _computeOptimalDpr() {
    const raw = window.devicePixelRatio || 1;
    if (this.lowPerfActive) return 1;
    const area = Math.max(window.innerWidth * window.innerHeight, 1);
    const cores = navigator.hardwareConcurrency || 4;
    // Cap DPR sensibly on 4K interactive whiteboards & low-core school OPS PCs
    if (area >= 2300000 || cores <= 4) return Math.min(raw, 1.25);
    return Math.min(raw, 1.5);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this._computeOptimalDpr());
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.inset = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelRenderer.domElement.style.overflow = 'hidden';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.cubesGroup = new THREE.Group();
    this.rootGroup.add(this.cubesGroup);

    this.axesGroup = new THREE.Group();
    this.rootGroup.add(this.axesGroup);

    this.dimGroup = new THREE.Group();
    this.rootGroup.add(this.dimGroup);

    this.compareGroup = new THREE.Group();
    this.rootGroup.add(this.compareGroup);

    this.builderFloorGroup = new THREE.Group();
    this.rootGroup.add(this.builderFloorGroup);

    this.reservoirGroup = new THREE.Group();
    this.rootGroup.add(this.reservoirGroup);
    this.reservoirMeta = null;

    // Subtle studio floor shadow catcher + blueprint grid
    this.floorGroup = new THREE.Group();
    this.scene.add(this.floorGroup);

    const shadowGeo = new THREE.PlaneGeometry(80, 80);
    this.shadowMat = new THREE.ShadowMaterial({ opacity: 0.13, color: 0x0f172a });
    this.shadowPlane = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = -0.505;
    this.shadowPlane.receiveShadow = true;
    this.floorGroup.add(this.shadowPlane);

    this._buildFloorGrid();
  }

  _buildFloorGrid() {
    if (this.gridMajor) this.floorGroup.remove(this.gridMajor);
    if (this.gridMinor) this.floorGroup.remove(this.gridMinor);

    const isDark = this.theme === 'dark';
    const majorColor = isDark ? 0x26436d : 0xcad6e8;
    const minorColor = isDark ? 0x162a47 : 0xe3ebf5;

    this.gridMinor = new THREE.GridHelper(36, 36, minorColor, minorColor);
    this.gridMinor.position.y = -0.503;
    this.gridMinor.material.transparent = true;
    this.gridMinor.material.opacity = isDark ? 0.45 : 0.72;
    this.floorGroup.add(this.gridMinor);

    this.gridMajor = new THREE.GridHelper(36, 9, majorColor, majorColor);
    this.gridMajor.position.y = -0.501;
    this.gridMajor.material.transparent = true;
    this.gridMajor.material.opacity = isDark ? 0.55 : 0.75;
    this.floorGroup.add(this.gridMajor);
  }

  _initCamerasAndControls() {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    const aspect = w / h;

    this.perspCamera = new THREE.PerspectiveCamera(34, aspect, 0.1, 200);
    this.orthoFrustum = 6;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-this.orthoFrustum * aspect) / 2,
      (this.orthoFrustum * aspect) / 2,
      this.orthoFrustum / 2,
      -this.orthoFrustum / 2,
      -100,
      200
    );

    this.camera = this.perspCamera;
    this.camera.position.set(5, 4.5, 8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.085;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.95;
    this.controls.panSpeed = 0.82;
    this.controls.maxPolarAngle = Math.PI * 0.96;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 42;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.controls.addEventListener('start', () => {
      this.camAnim = null;
      this.requestRender(false);
    });
    this.controls.addEventListener('change', () => {
      this.requestRender(false);
    });
  }

  _initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.15);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffdf8, 1.45);
    this.keyLight.position.set(8, 14, 10);
    this.keyLight.castShadow = true;
    const isSmall = window.innerWidth <= 820;
    const shadowSize = isSmall ? 512 : 1024;
    this.keyLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 45;
    const d = 13;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0006;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xdbeafe, 0.72);
    this.fillLight.position.set(-10, 6, -8);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
    this.rimLight.position.set(0, -6, 8);
    this.scene.add(this.rimLight);
  }

  _initSharedAssets() {
    this.faceTexture = createCubeFaceTexture();
    // segments=1 keeps the crisp chamfered bevel highlights with ~6x fewer triangles (much faster on electronic boards & phones!)
    this.cubeGeo = new RoundedBoxGeometry(0.988, 0.988, 0.988, 1, 0.036);
    this.edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.996, 0.996, 0.996));

    // Hover preview ghost cube for 3D Builder
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.38,
      roughness: 0.3,
      depthWrite: false,
    });
    this.ghostMesh = new THREE.Mesh(this.cubeGeo, ghostMat);
    const ghostEdges = new THREE.LineSegments(
      this.edgeGeo,
      new THREE.LineBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.9 })
    );
    this.ghostMesh.add(ghostEdges);
    this.ghostMesh.visible = false;
    this.scene.add(this.ghostMesh);

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
  }

  _initEvents() {
    const dom = this.renderer.domElement;

    this._onResize = () => {
      const w = Math.max(this.container.clientWidth, 1);
      const h = Math.max(this.container.clientHeight, 1);
      const aspect = w / h;

      this.perspCamera.aspect = aspect;
      this.orthoCamera.left = (-this.orthoFrustum * aspect) / 2;
      this.orthoCamera.right = (this.orthoFrustum * aspect) / 2;
      this.orthoCamera.top = this.orthoFrustum / 2;
      this.orthoCamera.bottom = -this.orthoFrustum / 2;
      this._applyCameraViewOffset();

      this.renderer.setPixelRatio(this._computeOptimalDpr());
      this.renderer.setSize(w, h);
      this.labelRenderer.setSize(w, h);
      this.requestRender(false);
    };
    window.addEventListener('resize', this._onResize);

    dom.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY, button: e.button };
      this.isDragging = true;
      this.requestRender(false);
    });

    dom.addEventListener('pointermove', (e) => {
      // Skip expensive raycasting while actively rotating/pinching or in pure orbit mode
      if (this.isDragging) return;
      if (this.mode !== 'builder' && this.interactionMode === 'orbit') return;
      this._updatePointer(e);
      if (this.mode === 'builder') {
        this._updateBuilderGhost();
        this.requestRender(false);
      } else {
        this._updateCubeHover();
      }
    });

    dom.addEventListener('pointerleave', () => {
      this.isDragging = false;
      this.ghostMesh.visible = false;
      this._setHoveredEntry(null);
      this.requestRender(false);
    });

    dom.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      if (!this.pointerDownPos) return;
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;
      const button = this.pointerDownPos.button;
      this.pointerDownPos = null;

      // Only treat as a click/tap if the user did not drag to orbit
      if (dx * dx + dy * dy > 49) return;

      this._updatePointer(e);

      if (this.mode === 'builder') {
        this._handleBuilderClick(button === 2);
      } else if (this.interactionMode === 'count' || this.interactionMode === 'peel') {
        this._handleInteractiveCubeClick();
      }
    });

    dom.addEventListener(
      'wheel',
      () => {
        this.requestRender(false);
      },
      { passive: true }
    );

    dom.addEventListener('contextmenu', (e) => {
      if (this.mode === 'builder') e.preventDefault();
    });
  }

  _updatePointer(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _clearDynamicScene() {
    // Clean CSS2D objects and dispose temporary geometries/materials to prevent VRAM leaks
    const cleanGroup = (group, disposeGeom = true) => {
      group.traverse((child) => {
        if (child.isCSS2DObject && child.element && child.element.parentNode) {
          child.element.parentNode.removeChild(child.element);
        }
        if (disposeGeom && child.geometry && child.geometry !== this.cubeGeo && child.geometry !== this.edgeGeo) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      group.clear();
    };

    cleanGroup(this.cubesGroup, false);
    cleanGroup(this.axesGroup, true);
    cleanGroup(this.dimGroup, true);
    cleanGroup(this.compareGroup, true);
    cleanGroup(this.builderFloorGroup, true);
    cleanGroup(this.reservoirGroup, true);
    this.reservoirMeta = null;

    this.cubeEntries = [];
    this.compareMeta = [];
    this.countedOrder = [];
    this.peeledSet.clear();
    this.hoveredEntry = null;
    this.ghostMesh.visible = false;
    this.shadowsDirty = true;
  }

  _createCubeEntry({ coord, offset = [0, 0, 0], groupIndex = 0, groupCenter, paletteKey, id, animateIn = false }) {
    const pal = PALETTES[paletteKey] || PALETTES.cyan;
    const isDark = this.theme === 'dark';

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pal.fill),
      map: this.faceTexture,
      roughness: 0.36,
      metalness: 0.04,
      transparent: false,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(this.cubeGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edgeColor = isDark ? pal.edgeDark : pal.edgeLight;
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(edgeColor),
      transparent: true,
      opacity: isDark ? 0.72 : 0.85,
    });
    const edges = new THREE.LineSegments(this.edgeGeo, edgeMat);
    mesh.add(edges);

    const basePos = new THREE.Vector3(
      coord[0] + offset[0],
      coord[1] + offset[1],
      coord[2] + offset[2]
    );
    mesh.position.copy(basePos);

    // Floating number badge (hidden by default; shown in Count-Up or Click-to-Count mode)
    const labelEl = document.createElement('div');
    labelEl.className = 'cube-num-badge';
    labelEl.style.display = 'none';
    const labelObj = new CSS2DObject(labelEl);
    labelObj.visible = false;
    labelObj.position.set(0, 0.08, 0);
    mesh.add(labelObj);

    const entry = {
      id,
      coord: [...coord],
      groupIndex,
      groupCenter: groupCenter.clone(),
      basePos,
      mesh,
      edges,
      labelObj,
      labelEl,
      paletteKey,
      currentScale: animateIn ? 0.001 : 1,
      targetScale: 1,
      popTime: animateIn ? 0 : 1,
    };
    mesh.userData.entry = entry;

    if (animateIn) {
      mesh.scale.setScalar(0.001);
    }

    this.cubesGroup.add(mesh);
    this.cubeEntries.push(entry);
    return entry;
  }

  // Sort cubes pedagogically: bottom layer -> top layer, back -> front, left -> right
  _sortCubesPedagogically(cubes) {
    return [...cubes].sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
  }

  // ==================== LOAD SINGLE FIGURE ====================
  loadFigure(cubes, options = {}) {
    this._clearDynamicScene();
    this.mode = 'figure';
    this.countVisible = null;
    this.layerLimit = null;

    const paletteKey = options.palette || 'cyan';
    const sorted = this._sortCubesPedagogically(cubes);
    const bounds = getBounds(sorted);
    this.currentBounds = bounds;
    this.currentDimensionsSpec = options.dimensions || null;

    // Center X and Z cleanly around world origin, keeping bottom of y=0 resting on floor y=-0.5
    const shiftX = -(bounds.minX + bounds.maxX) / 2;
    const shiftZ = -(bounds.minZ + bounds.maxZ) / 2;
    const shiftY = -bounds.minY;
    this.figureOffset = [shiftX, shiftY, shiftZ];

    const center = new THREE.Vector3(0, (bounds.sy - 1) / 2, 0);

    sorted.forEach((coord, idx) => {
      this._createCubeEntry({
        coord,
        offset: this.figureOffset,
        groupIndex: 0,
        groupCenter: center,
        paletteKey,
        id: `c_${idx}_${coord.join('_')}`,
        animateIn: true,
      });
    });

    this._buildTextbookAxes(bounds, this.figureOffset);
    this.showDimensions = Boolean(options.showDimensions);
    this._buildDimensions(bounds, this.figureOffset, this.currentDimensionsSpec);

    this.currentCenter = center.clone();
    this.currentRadius = Math.max(
      Math.hypot(bounds.sx, bounds.sy, bounds.sz) * 0.56,
      1.05
    );
    this.currentHalfWidth = Math.max((bounds.sx + bounds.sz * 0.65) * 0.52 + 0.55, 1.3);
    this.currentHalfHeight = Math.max((bounds.sy + bounds.sz * 0.4) * 0.55 + 0.5, 1.25);

    this._applyVisualStates();
    this.frameCamera(options.view || 'textbook', !options.instant);
  }

  // ==================== LOAD 3D GLASS RESERVOIR FILLING DEMO ====================
  loadReservoir(nx, ny, nz, options = {}) {
    this._clearDynamicScene();
    this.mode = 'reservoir';
    this.countVisible = null;
    this.layerLimit = null;
    this.explode = 0;

    const paletteKey = options.palette || 'pink';
    const coords = [];
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
          coords.push([x, y, z]);
        }
      }
    }

    const bounds = getBounds(coords);
    this.currentBounds = bounds;
    const shiftX = -(nx - 1) / 2;
    const shiftY = 0;
    const shiftZ = -(nz - 1) / 2;
    this.figureOffset = [shiftX, shiftY, shiftZ];

    const center = new THREE.Vector3(0, (ny - 1) / 2 + 0.28, 0);

    coords.forEach((coord, idx) => {
      const entry = this._createCubeEntry({
        coord,
        offset: this.figureOffset,
        groupIndex: 0,
        groupCenter: center,
        paletteKey,
        id: `res_${idx}_${coord.join('_')}`,
        animateIn: false,
      });
      entry.reservoirActive = false;
      entry.reservoirDrop = 0;
      entry.reservoirStartY = ny + 1.55;
      entry.mesh.visible = false;
      entry.mesh.position.set(entry.basePos.x, entry.reservoirStartY, entry.basePos.z);
    });

    this.reservoirMeta = {
      nx,
      ny,
      nz,
      total: nx * ny * nz,
      filled: 0,
      rimMeshes: [],
      rimMat: null,
      fullGlowMat: null,
    };

    this._buildReservoirTank(nx, ny, nz);

    this.currentDimensionsSpec = [
      { axis: 'x', label: `ширина = ${nx}` },
      { axis: 'y', label: `высота = ${ny}` },
      { axis: 'z', label: `длина = ${nz}` },
    ];
    this.showDimensions = options.showDimensions !== false;
    this._buildDimensions(bounds, this.figureOffset, this.currentDimensionsSpec);

    this.currentCenter = center.clone();
    this.currentRadius = Math.max(Math.hypot(nx, ny + 1.2, nz) * 0.56, 2.2);
    this.currentHalfWidth = Math.max((nx + nz * 0.68) * 0.55 + 0.85, 2.0);
    this.currentHalfHeight = Math.max((ny + 1.35 + nz * 0.35) * 0.54 + 0.55, 2.1);

    this._applyVisualStates();
    this.frameCamera('textbook', !options.instant);
  }

  _buildReservoirTank(nx, ny, nz) {
    this.reservoirGroup.clear();
    const isDark = this.theme === 'dark';

    const pad = 0.048;
    const w = nx + pad * 2;
    const h = ny + pad * 1.1;
    const d = nz + pad * 2;
    const bottomY = -0.505;
    const centerY = bottomY + h / 2;
    const topY = bottomY + h;

    // 1) Sleek grounded base tray
    const baseGeo = new THREE.BoxGeometry(w + 0.24, 0.08, d + 0.24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x162b4a : 0xdde7f3,
      roughness: 0.45,
      metalness: 0.12,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, bottomY - 0.04, 0);
    baseMesh.receiveShadow = true;
    this.reservoirGroup.add(baseMesh);

    const baseEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(baseGeo),
      new THREE.LineBasicMaterial({
        color: isDark ? 0x38bdf8 : 0x64748b,
        transparent: true,
        opacity: isDark ? 0.55 : 0.45,
      })
    );
    baseEdge.position.copy(baseMesh.position);
    this.reservoirGroup.add(baseEdge);

    // 2) Crystal-clear translucent open-top glass walls (4 sides)
    const glassMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x38bdf8 : 0x7dd3fc,
      transparent: true,
      opacity: isDark ? 0.14 : 0.16,
      roughness: 0.06,
      metalness: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const addWall = (ww, hh, x, y, z, rotY = 0) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), glassMat);
      wall.position.set(x, y, z);
      wall.rotation.y = rotY;
      wall.renderOrder = 6;
      this.reservoirGroup.add(wall);
    };

    addWall(w, h, 0, centerY, d / 2, 0); // front
    addWall(w, h, 0, centerY, -d / 2, Math.PI); // back
    addWall(d, h, -w / 2, centerY, 0, -Math.PI / 2); // left
    addWall(d, h, w / 2, centerY, 0, Math.PI / 2); // right

    // 3) Crisp glass frame lines (4 vertical corners + bottom rectangle)
    const framePts = [];
    const hx = w / 2;
    const hz = d / 2;
    const corners = [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ];
    for (let i = 0; i < 4; i++) {
      const [cx, cz] = corners[i];
      const [nx2, nz2] = corners[(i + 1) % 4];
      // vertical pillar
      framePts.push(new THREE.Vector3(cx, bottomY, cz), new THREE.Vector3(cx, topY, cz));
      // bottom rim
      framePts.push(new THREE.Vector3(cx, bottomY + 0.004, cz), new THREE.Vector3(nx2, bottomY + 0.004, nz2));
    }
    const frameGeo = new THREE.BufferGeometry().setFromPoints(framePts);
    const frameMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.85 : 0.72,
    });
    this.reservoirGroup.add(new THREE.LineSegments(frameGeo, frameMat));

    // 4) Tactile 3D open top glass rim (turns bright emerald when filled to the brim!)
    const rimT = 0.042;
    const rimMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      emissive: new THREE.Color(isDark ? 0x0ea5e9 : 0x0284c7),
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.15,
    });
    const makeRimBar = (bw, bh, bd, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), rimMat);
      m.position.set(px, py, pz);
      this.reservoirGroup.add(m);
      return m;
    };
    const rimMeshes = [
      makeRimBar(w + rimT, rimT, rimT, 0, topY, -hz),
      makeRimBar(w + rimT, rimT, rimT, 0, topY, hz),
      makeRimBar(rimT, rimT, d + rimT, -hx, topY, 0),
      makeRimBar(rimT, rimT, d + rimT, hx, topY, 0),
    ];

    // 5) Subtle etched 1x1 unit graduation marks on the inside glass walls & floor
    //    so students visually see the exact unit cube slots waiting to be filled!
    const gradPts = [];
    const tickEps = 0.008;
    // Floor grid inside tank
    for (let ix = 1; ix < nx; ix++) {
      const gx = -nx / 2 + ix;
      gradPts.push(new THREE.Vector3(gx, bottomY + tickEps, -nz / 2), new THREE.Vector3(gx, bottomY + tickEps, nz / 2));
      // Back wall vertical
      gradPts.push(new THREE.Vector3(gx, bottomY, -hz + tickEps), new THREE.Vector3(gx, topY, -hz + tickEps));
      // Front wall subtle vertical
      gradPts.push(new THREE.Vector3(gx, bottomY, hz - tickEps), new THREE.Vector3(gx, topY, hz - tickEps));
    }
    for (let iz = 1; iz < nz; iz++) {
      const gz = -nz / 2 + iz;
      gradPts.push(new THREE.Vector3(-nx / 2, bottomY + tickEps, gz), new THREE.Vector3(nx / 2, bottomY + tickEps, gz));
      // Left & right wall verticals
      gradPts.push(new THREE.Vector3(-hx + tickEps, bottomY, gz), new THREE.Vector3(-hx + tickEps, topY, gz));
      gradPts.push(new THREE.Vector3(hx - tickEps, bottomY, gz), new THREE.Vector3(hx - tickEps, topY, gz));
    }
    // Horizontal layer lines around all 4 glass walls (level 1, 2, ...)
    for (let iy = 1; iy < ny; iy++) {
      const gy = bottomY + iy;
      gradPts.push(new THREE.Vector3(-hx + tickEps, gy, -hz + tickEps), new THREE.Vector3(hx - tickEps, gy, -hz + tickEps));
      gradPts.push(new THREE.Vector3(-hx + tickEps, gy, hz - tickEps), new THREE.Vector3(hx - tickEps, gy, hz - tickEps));
      gradPts.push(new THREE.Vector3(-hx + tickEps, gy, -hz + tickEps), new THREE.Vector3(-hx + tickEps, gy, hz - tickEps));
      gradPts.push(new THREE.Vector3(hx - tickEps, gy, -hz + tickEps), new THREE.Vector3(hx - tickEps, gy, hz - tickEps));
    }
    const gradGeo = new THREE.BufferGeometry().setFromPoints(gradPts);
    const gradMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x7dd3fc : 0x0369a1,
      transparent: true,
      opacity: isDark ? 0.28 : 0.24,
    });
    this.reservoirGroup.add(new THREE.LineSegments(gradGeo, gradMat));

    if (this.reservoirMeta) {
      this.reservoirMeta.rimMeshes = rimMeshes;
      this.reservoirMeta.rimMat = rimMat;
      this.reservoirMeta.frameMat = frameMat;
      this._updateReservoirRimColor();
    }
  }

  _updateReservoirRimColor() {
    if (!this.reservoirMeta || !this.reservoirMeta.rimMat) return;
    const isFull = this.reservoirMeta.filled >= this.reservoirMeta.total;
    const isDark = this.theme === 'dark';
    if (isFull) {
      this.reservoirMeta.rimMat.color.setHex(0x10b981);
      this.reservoirMeta.rimMat.emissive.setHex(0x10b981);
      this.reservoirMeta.rimMat.emissiveIntensity = 0.55;
      this.reservoirMeta.frameMat.color.setHex(0x10b981);
    } else {
      const hex = isDark ? 0x38bdf8 : 0x0284c7;
      this.reservoirMeta.rimMat.color.setHex(hex);
      this.reservoirMeta.rimMat.emissive.setHex(isDark ? 0x0ea5e9 : 0x0284c7);
      this.reservoirMeta.rimMat.emissiveIntensity = 0.25;
      this.reservoirMeta.frameMat.color.setHex(hex);
    }
  }

  setReservoirCount(n, instant = false) {
    if (this.mode !== 'reservoir' || !this.reservoirMeta) return;
    const target = Math.max(0, Math.min(this.reservoirMeta.total, n));
    this.reservoirMeta.filled = target;

    this.cubeEntries.forEach((entry, idx) => {
      if (idx < target) {
        const wasActive = entry.reservoirActive;
        entry.reservoirActive = true;
        entry.mesh.visible = true;
        if (instant) {
          entry.reservoirDrop = 1;
          entry.mesh.position.copy(entry.basePos);
          entry.mesh.scale.setScalar(1);
        } else if (!wasActive) {
          entry.reservoirDrop = 0;
          entry.mesh.position.set(entry.basePos.x, entry.reservoirStartY, entry.basePos.z);
          entry.mesh.scale.setScalar(0.9);
          entry.mesh.material.transparent = true;
          entry.mesh.material.opacity = 0.02;
        }
      } else {
        entry.reservoirActive = false;
        entry.reservoirDrop = 0;
        entry.mesh.visible = false;
        entry.labelObj.visible = false;
        entry.labelEl.style.display = 'none';
      }
    });

    this._updateReservoirRimColor();
    this._applyVisualStates();
  }

  // ==================== LOAD MULTI-MODEL COMPARISON ====================
  loadComparison(models, options = {}) {
    this._clearDynamicScene();
    this.mode = 'compare';
    this.countVisible = null;
    this.layerLimit = null;
    this.showDimensions = false;

    const gap = models.length <= 2 ? 2.2 : 1.75;
    const modelInfos = models.map((m) => {
      const sorted = this._sortCubesPedagogically(m.cubes);
      const b = getBounds(sorted);
      return { ...m, sorted, bounds: b };
    });

    const totalWidth =
      modelInfos.reduce((acc, m) => acc + m.bounds.sx, 0) +
      gap * Math.max(modelInfos.length - 1, 0);

    let cursorX = -totalWidth / 2;
    let maxY = 1;
    let maxZ = 1;

    modelInfos.forEach((m, gIdx) => {
      const b = m.bounds;
      const offsetX = cursorX - b.minX;
      const offsetY = -b.minY;
      const offsetZ = -(b.minZ + b.maxZ) / 2;
      const centerX = cursorX + (b.sx - 1) / 2;
      const centerY = (b.sy - 1) / 2;
      const groupCenter = new THREE.Vector3(centerX, centerY, 0);

      m.sorted.forEach((coord, cIdx) => {
        this._createCubeEntry({
          coord,
          offset: [offsetX, offsetY, offsetZ],
          groupIndex: gIdx,
          groupCenter,
          paletteKey: m.palette || 'terracotta',
          id: `cmp_${m.key}_${cIdx}`,
          animateIn: true,
        });
      });

      // Architectural pedestal pad under each compared figure
      const padW = b.sx + 0.65;
      const padD = b.sz + 0.65;
      const padGeo = new THREE.BoxGeometry(padW, 0.06, padD);
      const isDark = this.theme === 'dark';
      const padMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x162947 : 0xe8eef7,
        roughness: 0.7,
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.set(centerX, -0.49, 0);
      padMesh.receiveShadow = true;
      this.compareGroup.add(padMesh);

      // Highlight outline ring (shown when teacher reveals matching / winner models)
      const ringGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(padW + 0.12, 0.1, padD + 0.12));
      const ringMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0 });
      const ringMesh = new THREE.LineSegments(ringGeo, ringMat);
      ringMesh.position.set(centerX, -0.47, 0);
      this.compareGroup.add(ringMesh);

      // Floating nameplate underneath each figure
      const badgeEl = document.createElement('div');
      badgeEl.className = 'compare-nameplate';
      badgeEl.innerHTML = `<span class="cmp-title">${m.label}</span><span class="cmp-vol">${
        options.revealAnswers ? `${m.cubes.length} куб. ед.` : '? куб. ед.'
      }</span>`;
      const badgeObj = new CSS2DObject(badgeEl);
      badgeObj.position.set(centerX, -0.58, b.sz / 2 + 0.65);
      this.compareGroup.add(badgeObj);

      this.compareMeta.push({
        key: m.key,
        label: m.label,
        count: m.cubes.length,
        center: groupCenter,
        badgeObj,
        badgeEl,
        padMesh,
        ringMesh,
      });

      if (b.sy > maxY) maxY = b.sy;
      if (b.sz > maxZ) maxZ = b.sz;
      cursorX += b.sx + gap;
    });

    this.currentCenter = new THREE.Vector3(0, (maxY - 1) * 0.42, 0);
    this.currentRadius = Math.max(totalWidth * 0.52, maxY * 0.9, maxZ * 0.85, 2.2);
    this.currentHalfWidth = Math.max(totalWidth * 0.54 + 0.8, 2.4);
    this.currentHalfHeight = Math.max(maxY * 0.68 + maxZ * 0.35 + 0.9, 2.0);

    this.setCompareReveal(Boolean(options.revealAnswers), options.highlightIds || []);
    this._applyVisualStates();
    this.frameCamera('textbook', true);
  }

  setCompareReveal(revealed, highlightIds = []) {
    const isDark = this.theme === 'dark';
    for (const meta of this.compareMeta) {
      const volSpan = meta.badgeEl.querySelector('.cmp-vol');
      if (volSpan) {
        volSpan.textContent = revealed ? `${meta.count} куб. ед.` : '? куб. ед.';
      }
      const isHighlight = revealed && highlightIds.includes(meta.key);
      meta.badgeEl.classList.toggle('is-highlight', isHighlight);
      meta.ringMesh.material.opacity = isHighlight ? 1 : 0;
      meta.padMesh.material.color.setHex(
        isHighlight ? (isDark ? 0x114232 : 0xd1fae5) : (isDark ? 0x162947 : 0xe8eef7)
      );
    }
    this.requestRender(false);
  }

  // ==================== LOAD 3D BUILDER ====================
  loadBuilder(initialCubes = [[0, 0, 0]], paletteKey = 'emerald') {
    this._clearDynamicScene();
    this.mode = 'builder';
    this.builderPalette = paletteKey;
    this.builderCubes.clear();
    this.countVisible = null;
    this.layerLimit = null;
    this.showDimensions = false;

    // Create interactive 5x5 studio floor pad (-2..2 in X and Z)
    const isDark = this.theme === 'dark';
    const tileGeo = new THREE.PlaneGeometry(0.95, 0.95);
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const checker = (x + z) % 2 === 0;
        const mat = new THREE.MeshStandardMaterial({
          color: isDark
            ? (checker ? 0x162b4a : 0x1b3358)
            : (checker ? 0xeef3fa : 0xe2eaf5),
          roughness: 0.85,
          side: THREE.DoubleSide,
        });
        const tile = new THREE.Mesh(tileGeo, mat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, -0.495, z);
        tile.receiveShadow = true;
        tile.userData.floorCoord = [x, 0, z];
        this.builderFloorGroup.add(tile);
      }
    }

    // Subtle border frame around 5x5 build zone
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(5.06, 0.04, 5.06));
    const borderMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x3b82f6,
      transparent: true,
      opacity: 0.65,
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.set(0, -0.48, 0);
    this.builderFloorGroup.add(border);

    // Place initial cubes
    for (const c of initialCubes) {
      this._addBuilderCubeInternal(c, false);
    }

    this.currentCenter = new THREE.Vector3(0, 0.55, 0);
    this.currentRadius = 3.2;
    this.currentHalfWidth = 3.4;
    this.currentHalfHeight = 2.6;
    this._applyVisualStates();
    this.frameCamera('textbook', true);
    this._emitBuilderState();
  }

  setBuilderCubes(cubes) {
    if (this.mode !== 'builder') return;
    // Clear existing cube entries only (keep floor pad)
    for (const entry of this.cubeEntries) {
      if (entry.labelEl && entry.labelEl.parentNode) {
        entry.labelEl.parentNode.removeChild(entry.labelEl);
      }
      entry.mesh.material.dispose();
      entry.edges.material.dispose();
    }
    this.cubesGroup.clear();
    this.cubeEntries = [];
    this.builderCubes.clear();

    // Center incoming preset on 5x5 pad
    const b = getBounds(cubes);
    const sx = Math.round(-(b.minX + b.maxX) / 2);
    const sz = Math.round(-(b.minZ + b.maxZ) / 2);
    const sy = -b.minY;

    for (const [x, y, z] of cubes) {
      this._addBuilderCubeInternal([x + sx, y + sy, z + sz], true);
    }
    this._applyVisualStates();
    this._emitBuilderState();
  }

  _addBuilderCubeInternal(coord, animateIn = true) {
    const [x, y, z] = coord;
    if (x < -2 || x > 2 || z < -2 || z > 2 || y < 0 || y > 4) return false;
    const key = `${x},${y},${z}`;
    if (this.builderCubes.has(key)) return false;

    this.builderCubes.set(key, [x, y, z]);
    this._createCubeEntry({
      coord: [x, y, z],
      offset: [0, 0, 0],
      groupIndex: 0,
      groupCenter: new THREE.Vector3(0, 0.5, 0),
      paletteKey: this.builderPalette,
      id: `b_${key}`,
      animateIn,
    });
    return true;
  }

  _removeBuilderCubeInternal(entry) {
    const key = entry.coord.join(',');
    if (!this.builderCubes.has(key)) return;
    this.builderCubes.delete(key);
    if (entry.labelEl && entry.labelEl.parentNode) {
      entry.labelEl.parentNode.removeChild(entry.labelEl);
    }
    this.cubesGroup.remove(entry.mesh);
    entry.mesh.material.dispose();
    entry.edges.material.dispose();
    this.cubeEntries = this.cubeEntries.filter((e) => e !== entry);
  }

  _emitBuilderState() {
    if (this.callbacks.onBuilderChange) {
      this.callbacks.onBuilderChange([...this.builderCubes.values()]);
    }
  }

  setBuilderTool(tool) {
    this.builderTool = tool; // 'add' | 'remove'
    this.ghostMesh.visible = false;
    this.requestRender(false);
  }

  _getBuilderRaycast() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const cubeMeshes = this.cubeEntries.map((e) => e.mesh);
    const cubeHits = this.raycaster.intersectObjects(cubeMeshes, false);
    if (cubeHits.length > 0) {
      const hit = cubeHits[0];
      const entry = hit.object.userData.entry;
      const n = hit.face.normal;
      const target = [
        entry.coord[0] + Math.round(n.x),
        entry.coord[1] + Math.round(n.y),
        entry.coord[2] + Math.round(n.z),
      ];
      return { type: 'cube', entry, target };
    }
    const floorHits = this.raycaster.intersectObjects(this.builderFloorGroup.children, false);
    for (const hit of floorHits) {
      if (hit.object.userData.floorCoord) {
        return { type: 'floor', target: hit.object.userData.floorCoord };
      }
    }
    return null;
  }

  _updateBuilderGhost() {
    if (this.explode > 0.02) {
      this.ghostMesh.visible = false;
      return;
    }
    const hit = this._getBuilderRaycast();
    if (!hit) {
      this.ghostMesh.visible = false;
      this._setHoveredEntry(null);
      return;
    }
    if (this.builderTool === 'remove') {
      this.ghostMesh.visible = false;
      this._setHoveredEntry(hit.type === 'cube' ? hit.entry : null);
      return;
    }

    this._setHoveredEntry(null);
    const [tx, ty, tz] = hit.target;
    const valid =
      tx >= -2 && tx <= 2 && tz >= -2 && tz <= 2 && ty >= 0 && ty <= 4 &&
      !this.builderCubes.has(`${tx},${ty},${tz}`);
    if (valid) {
      this.ghostMesh.position.set(tx, ty, tz);
      this.ghostMesh.visible = true;
    } else {
      this.ghostMesh.visible = false;
    }
  }

  _handleBuilderClick(isRightClick) {
    if (this.explode > 0.02) return;
    const hit = this._getBuilderRaycast();
    if (!hit) return;

    const doRemove = isRightClick || this.builderTool === 'remove';
    if (doRemove) {
      if (hit.type === 'cube') {
        this._removeBuilderCubeInternal(hit.entry);
        this._setHoveredEntry(null);
        this._applyVisualStates();
        this._emitBuilderState();
      }
      return;
    }

    const added = this._addBuilderCubeInternal(hit.target, true);
    if (added) {
      this._applyVisualStates();
      this._emitBuilderState();
      this._updateBuilderGhost();
    }
  }

  // ==================== INTERACTIVE TAP-TO-COUNT / PEEL ====================
  _updateCubeHover() {
    if (this.interactionMode === 'orbit') {
      this._setHoveredEntry(null);
      return;
    }
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const visibleMeshes = this.cubeEntries
      .filter((e) => e.mesh.visible && e.targetScale > 0.5)
      .map((e) => e.mesh);
    const hits = this.raycaster.intersectObjects(visibleMeshes, false);
    if (hits.length > 0) {
      this._setHoveredEntry(hits[0].object.userData.entry);
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this._setHoveredEntry(null);
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  _setHoveredEntry(entry) {
    if (this.hoveredEntry === entry) return;
    this.hoveredEntry = entry;
    this._applyVisualStates();
  }

  _handleInteractiveCubeClick() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const visibleMeshes = this.cubeEntries
      .filter((e) => e.mesh.visible && e.targetScale > 0.5)
      .map((e) => e.mesh);
    const hits = this.raycaster.intersectObjects(visibleMeshes, false);
    if (hits.length === 0) return;

    const entry = hits[0].object.userData.entry;
    if (this.interactionMode === 'count') {
      const idx = this.countedOrder.indexOf(entry.id);
      if (idx >= 0) {
        this.countedOrder.splice(idx, 1);
      } else {
        this.countedOrder.push(entry.id);
        entry.popTime = 0.35; // playful pulse
      }
    } else if (this.interactionMode === 'peel') {
      if (this.peeledSet.has(entry.id)) {
        this.peeledSet.delete(entry.id);
      } else {
        this.peeledSet.add(entry.id);
      }
    }

    this._applyVisualStates();
    if (this.callbacks.onInteractionChange) {
      this.callbacks.onInteractionChange({
        counted: this.countedOrder.length,
        peeled: this.peeledSet.size,
        total: this.cubeEntries.length,
      });
    }
  }

  resetInteractiveMarks() {
    this.countedOrder = [];
    this.peeledSet.clear();
    this._applyVisualStates();
    if (this.callbacks.onInteractionChange) {
      this.callbacks.onInteractionChange({
        counted: 0,
        peeled: 0,
        total: this.cubeEntries.length,
      });
    }
  }

  // ==================== AXES & DIMENSIONS ====================
  _buildTextbookAxes(bounds, offset) {
    const ox = bounds.minX + offset[0] - 0.5;
    const oy = bounds.minY + offset[1] - 0.5;
    const oz = bounds.minZ + offset[2] - 0.5;

    const lenX = bounds.sx + 1.1;
    const lenY = bounds.sy + 1.0;
    const lenZ = bounds.sz + 1.1;

    const isDark = this.theme === 'dark';
    const axisColor = isDark ? 0x6488b8 : 0x64748b;

    const addAxis = (dir, len, labelText) => {
      const end = new THREE.Vector3(
        ox + dir[0] * len,
        oy + dir[1] * len,
        oz + dir[2] * len
      );
      const start = new THREE.Vector3(ox, oy, oz);
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      const mat = new THREE.LineBasicMaterial({ color: axisColor, transparent: true, opacity: 0.72 });
      this.axesGroup.add(new THREE.Line(geo, mat));

      // Crisp small cone tip
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.065, 0.2, 12),
        new THREE.MeshBasicMaterial({ color: axisColor })
      );
      cone.position.copy(end);
      if (dir[0] === 1) cone.rotation.z = -Math.PI / 2;
      if (dir[2] === 1) cone.rotation.x = Math.PI / 2;
      this.axesGroup.add(cone);

      const el = document.createElement('div');
      el.className = 'axis-label';
      el.textContent = labelText;
      const lbl = new CSS2DObject(el);
      lbl.position.set(
        end.x + dir[0] * 0.28,
        end.y + dir[1] * 0.26,
        end.z + dir[2] * 0.28
      );
      this.axesGroup.add(lbl);
    };

    addAxis([1, 0, 0], lenX, 'Ш');
    addAxis([0, 1, 0], lenY, 'В');
    addAxis([0, 0, 1], lenZ, 'Д');

    this.axesGroup.visible = this.showAxes;
  }

  _buildDimensions(bounds, offset, customSpecs) {
    // Clean old labels first
    this.dimGroup.traverse((child) => {
      if (child.isCSS2DObject && child.element && child.element.parentNode) {
        child.element.parentNode.removeChild(child.element);
      }
    });
    this.dimGroup.clear();

    const minX = bounds.minX + offset[0] - 0.5;
    const maxX = bounds.maxX + offset[0] + 0.5;
    const minY = bounds.minY + offset[1] - 0.5;
    const maxY = bounds.maxY + offset[1] + 0.5;
    const minZ = bounds.minZ + offset[2] - 0.5;
    const maxZ = bounds.maxZ + offset[2] + 0.5;

    const specs = customSpecs || [
      { axis: 'x', label: `ширина = ${bounds.sx}` },
      { axis: 'y', label: `высота = ${bounds.sy}` },
      { axis: 'z', label: `длина = ${bounds.sz}` },
    ];

    const isDark = this.theme === 'dark';
    const lineColor = isDark ? 0x38bdf8 : 0x1d4ed8;
    const pad = 0.38;

    const drawBracket = (p1, p2, tickDir, text) => {
      const mat = new THREE.LineBasicMaterial({ color: lineColor });
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      this.dimGroup.add(new THREE.Line(geo, mat));

      // End ticks
      const t = tickDir.clone().multiplyScalar(0.11);
      const tick1 = new THREE.BufferGeometry().setFromPoints([p1.clone().sub(t), p1.clone().add(t)]);
      const tick2 = new THREE.BufferGeometry().setFromPoints([p2.clone().sub(t), p2.clone().add(t)]);
      this.dimGroup.add(new THREE.Line(tick1, mat));
      this.dimGroup.add(new THREE.Line(tick2, mat));

      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const el = document.createElement('div');
      el.className = 'dim-badge';
      el.textContent = text;
      const obj = new CSS2DObject(el);
      obj.position.copy(mid);
      this.dimGroup.add(obj);
    };

    for (const s of specs) {
      if (s.axis === 'x') {
        drawBracket(
          new THREE.Vector3(minX, maxY + pad, minZ),
          new THREE.Vector3(maxX, maxY + pad, minZ),
          new THREE.Vector3(0, 1, 0),
          s.label
        );
      } else if (s.axis === 'y') {
        drawBracket(
          new THREE.Vector3(maxX + pad, minY, maxZ),
          new THREE.Vector3(maxX + pad, maxY, maxZ),
          new THREE.Vector3(1, 0, 0),
          s.label
        );
      } else if (s.axis === 'z') {
        drawBracket(
          new THREE.Vector3(minX - pad, maxY, minZ),
          new THREE.Vector3(minX - pad, maxY, maxZ),
          new THREE.Vector3(1, 0, 0),
          s.label
        );
      }
    }

    this.dimGroup.visible =
      this.showDimensions && (this.mode === 'figure' || this.mode === 'reservoir');
  }

  // ==================== SMART ON-DEMAND RENDERING ====================
  setPaused(paused) {
    this.paused = Boolean(paused);
    if (this.paused) {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      this.rafRunning = false;
    } else {
      this.clock.getDelta();
      this.requestRender(true);
    }
  }

  requestRender(dirtyShadows = false) {
    if (dirtyShadows) this.shadowsDirty = true;
    this.idleFrames = 0;
    if (this.paused) return;
    if (!this.rafRunning) {
      this.rafRunning = true;
      this.clock.getDelta();
      this._raf = requestAnimationFrame(this._animate);
    }
  }

  _enableLowPerfFallback() {
    if (this.lowPerfActive) return;
    this.lowPerfActive = true;
    this.renderer.setPixelRatio(1);
    if (this.keyLight.shadow.mapSize.width > 512) {
      this.keyLight.shadow.mapSize.set(512, 512);
      if (this.keyLight.shadow.map) {
        this.keyLight.shadow.map.dispose();
        this.keyLight.shadow.map = null;
      }
      this.shadowsDirty = true;
    }
    this.callbacks.onLowPerfDetected?.();
  }

  // ==================== VISUAL CONTROLS API ====================
  setTheme(theme) {
    this.theme = theme;
    this._buildFloorGrid();
    this.shadowMat.opacity = theme === 'dark' ? 0.34 : 0.13;
    this.hemiLight.intensity = theme === 'dark' ? 1.05 : 1.15;

    // Refresh builder floor colors if active
    if (this.mode === 'builder') {
      const isDark = theme === 'dark';
      this.builderFloorGroup.children.forEach((child) => {
        if (child.userData.floorCoord) {
          const [x, , z] = child.userData.floorCoord;
          const checker = (x + z) % 2 === 0;
          child.material.color.setHex(
            isDark ? (checker ? 0x162b4a : 0x1b3358) : (checker ? 0xeef3fa : 0xe2eaf5)
          );
        }
      });
    }

    // Refresh glass reservoir if active
    if (this.mode === 'reservoir' && this.reservoirMeta) {
      this._buildReservoirTank(
        this.reservoirMeta.nx,
        this.reservoirMeta.ny,
        this.reservoirMeta.nz
      );
      if (this.currentBounds) {
        this._buildDimensions(this.currentBounds, this.figureOffset, this.currentDimensionsSpec);
      }
    }

    // Refresh axes/dims colors
    if (this.mode === 'figure' && this.currentBounds) {
      this.axesGroup.traverse((c) => {
        if (c.isCSS2DObject && c.element?.parentNode) c.element.parentNode.removeChild(c.element);
      });
      this.axesGroup.clear();
      this._buildTextbookAxes(this.currentBounds, this.figureOffset);
      this._buildDimensions(this.currentBounds, this.figureOffset, this.currentDimensionsSpec);
    }

    this._applyVisualStates();
  }

  setExplode(amount) {
    this.explode = Math.max(0, Math.min(1, amount));
    this.requestRender(true);
  }

  setLayerLimit(limit) {
    this.layerLimit = limit; // null or integer 1..maxY
    this._applyVisualStates();
  }

  setXRay(enabled) {
    this.xray = enabled;
    this._applyVisualStates();
  }

  setShowDimensions(enabled) {
    this.showDimensions = enabled;
    this.dimGroup.visible = enabled && (this.mode === 'figure' || this.mode === 'reservoir');
    this.requestRender(false);
  }

  setShowAxes(enabled) {
    this.showAxes = enabled;
    this.axesGroup.visible = enabled && this.mode === 'figure';
    this.requestRender(false);
  }

  setShowNumbers(enabled) {
    this.showNumbers = enabled;
    this._applyVisualStates();
  }

  setCountVisible(n) {
    const prev = this.countVisible;
    this.countVisible = n; // null = show all, 0..total
    if (n !== null && (prev === null || n > prev)) {
      const start = prev === null ? 0 : prev;
      for (let i = start; i < Math.min(n, this.cubeEntries.length); i++) {
        this.cubeEntries[i].popTime = 0;
        this.cubeEntries[i].currentScale = 0.01;
      }
    }
    this._applyVisualStates();
  }

  setInteractionMode(mode) {
    this.interactionMode = mode; // 'orbit' | 'count' | 'peel'
    this.renderer.domElement.style.cursor = mode === 'orbit' ? 'grab' : 'pointer';
    this._applyVisualStates();
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
    this.requestRender(false);
  }

  setProjection(proj) {
    if (this.projection === proj) return;
    this.projection = proj;

    const pos = this.camera.position.clone();
    const target = this.controls.target.clone();
    const dist = pos.distanceTo(target);

    if (proj === 'ortho') {
      const w = Math.max(this.container.clientWidth, 1);
      const h = Math.max(this.container.clientHeight, 1);
      const aspect = w / h;
      // Match perspective visible height at target distance
      const visibleH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2));
      this.orthoFrustum = visibleH;
      this.orthoCamera.left = (-visibleH * aspect) / 2;
      this.orthoCamera.right = (visibleH * aspect) / 2;
      this.orthoCamera.top = visibleH / 2;
      this.orthoCamera.bottom = -visibleH / 2;
      this.orthoCamera.zoom = 1;
      this.orthoCamera.position.copy(pos);
      this.orthoCamera.lookAt(target);
      this.orthoCamera.updateProjectionMatrix();
      this.camera = this.orthoCamera;
    } else {
      this.perspCamera.position.copy(pos);
      this.perspCamera.lookAt(target);
      this.perspCamera.updateProjectionMatrix();
      this.camera = this.perspCamera;
    }

    this._applyCameraViewOffset();
    this.controls.object = this.camera;
    this.controls.target.copy(target);
    this.controls.update();
    this.requestRender(false);
  }

  _applyCameraViewOffset() {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    const { left, right, top, bottom } = this.safeInsets;
    // Shift optical center to the exact middle of the unobstructed whiteboard space
    const offsetX = Math.round((right - left) / 2);
    const offsetY = Math.round((bottom - top) / 2);
    this.perspCamera.setViewOffset(w, h, offsetX, offsetY, w, h);
    this.orthoCamera.setViewOffset(w, h, offsetX, offsetY, w, h);
    this.perspCamera.updateProjectionMatrix();
    this.orthoCamera.updateProjectionMatrix();
  }

  setSafeInsets(insets, reframe = true) {
    this.safeInsets = { ...this.safeInsets, ...insets };
    this._applyCameraViewOffset();
    if (reframe) {
      this.frameCamera(this.lastPreset || 'textbook', true);
    } else {
      this.requestRender(false);
    }
  }

  frameCamera(preset = 'textbook', animate = true) {
    this.lastPreset = preset;
    const dirs = {
      textbook: new THREE.Vector3(0.56, 0.50, 0.94).normalize(),
      top: new THREE.Vector3(0.001, 0.996, 0.09).normalize(),
      front: new THREE.Vector3(0, 0.08, 0.997).normalize(),
      side: new THREE.Vector3(0.997, 0.08, 0).normalize(),
      back: new THREE.Vector3(-0.58, 0.50, -0.92).normalize(),
    };
    const dir = dirs[preset] || dirs.textbook;

    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    const aspect = w / h;
    const fovRad = THREE.MathUtils.degToRad(this.perspCamera.fov);
    const tanHalfV = Math.tan(fovRad / 2);
    const tanHalfH = tanHalfV * aspect;

    // Fit LARGE inside the exact unobstructed region between panels!
    const safeW = Math.max(w - this.safeInsets.left - this.safeInsets.right, 260);
    const safeH = Math.max(h - this.safeInsets.top - this.safeInsets.bottom, 260);
    const fracW = Math.min(safeW / w, 0.94);
    const fracH = Math.min(safeH / h, 0.92);

    const fill = this.mode === 'compare' ? (aspect < 0.8 ? 0.66 : 0.84) : aspect < 0.8 ? 0.74 : 0.80;
    const halfW = this.currentHalfWidth || this.currentRadius;
    const halfH = this.currentHalfHeight || this.currentRadius;

    const distV = halfH / (tanHalfV * fracH * fill);
    const distH = halfW / (tanHalfH * fracW * fill);
    const dist = Math.max(distV, distH, 3.6);

    const goalTarget = this.currentCenter.clone();
    const goalPos = goalTarget.clone().addScaledVector(dir, dist);

    // Also update ortho frustum & view offset cleanly
    const visibleH = 2 * dist * tanHalfV;
    this.orthoFrustum = visibleH;
    this.orthoCamera.left = (-visibleH * aspect) / 2;
    this.orthoCamera.right = (visibleH * aspect) / 2;
    this.orthoCamera.top = visibleH / 2;
    this.orthoCamera.bottom = -visibleH / 2;
    this.orthoCamera.zoom = 1;
    this._applyCameraViewOffset();

    if (!animate) {
      this.camera.position.copy(goalPos);
      this.controls.target.copy(goalTarget);
      this.controls.update();
      this.camAnim = null;
    } else {
      this.camAnim = {
        startPos: this.camera.position.clone(),
        goalPos,
        startTarget: this.controls.target.clone(),
        goalTarget,
        t: 0,
        duration: 0.52,
      };
    }
    this.requestRender(false);
  }

  // Dramatic smooth 2D -> 3D reveal sweep so the textbook drawing visibly "comes alive" in 3D!
  revealFrom2D() {
    this.lastPreset = 'textbook';
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    const aspect = w / h;
    const fovRad = THREE.MathUtils.degToRad(this.perspCamera.fov);
    const tanHalfV = Math.tan(fovRad / 2);
    const tanHalfH = tanHalfV * aspect;

    const safeW = Math.max(w - this.safeInsets.left - this.safeInsets.right, 260);
    const safeH = Math.max(h - this.safeInsets.top - this.safeInsets.bottom, 260);
    const fracW = Math.min(safeW / w, 0.94);
    const fracH = Math.min(safeH / h, 0.92);

    const fill = this.mode === 'compare' ? (aspect < 0.8 ? 0.66 : 0.84) : aspect < 0.8 ? 0.74 : 0.80;
    const halfW = this.currentHalfWidth || this.currentRadius;
    const halfH = this.currentHalfHeight || this.currentRadius;
    const dist = Math.max(
      halfH / (tanHalfV * fracH * fill),
      halfW / (tanHalfH * fracW * fill),
      3.6
    );

    const target = this.currentCenter.clone();
    const startDir = new THREE.Vector3(0.30, 0.30, 0.96).normalize();
    const endDir = new THREE.Vector3(0.64, 0.54, 0.88).normalize();
    const startPos = target.clone().addScaledVector(startDir, dist * 1.04);
    const goalPos = target.clone().addScaledVector(endDir, dist);

    this.camera.position.copy(startPos);
    this.controls.target.copy(target);
    this.controls.update();

    this.camAnim = {
      startPos,
      goalPos,
      startTarget: target.clone(),
      goalTarget: target.clone(),
      t: 0,
      duration: 0.82,
    };

    // Subtle crisp pop-in on all cubes as they transition from flat 2D into 3D
    for (const entry of this.cubeEntries) {
      entry.popTime = 0.28;
    }
    this.requestRender(true);
  }

  _applyVisualStates() {
    const isDark = this.theme === 'dark';

    this.cubeEntries.forEach((entry, idx) => {
      const pal = PALETTES[entry.paletteKey] || PALETTES.cyan;
      const mat = entry.mesh.material;
      const edgeMat = entry.edges.material;

      // 1) Visibility (Reservoir filling OR Step-by-step Count-Up)
      if (this.mode === 'reservoir') {
        if (!entry.reservoirActive) {
          entry.mesh.visible = false;
          entry.labelObj.visible = false;
          entry.labelEl.style.display = 'none';
          return;
        }
        entry.mesh.visible = true;
        entry.targetScale = 1;
      } else {
        const hiddenByCount = this.countVisible !== null && idx >= this.countVisible;
        if (hiddenByCount) {
          entry.mesh.visible = false;
          entry.targetScale = 0.001;
          entry.labelObj.visible = false;
          entry.labelEl.style.display = 'none';
          return;
        }
        entry.mesh.visible = true;
        entry.targetScale = 1;
        if (entry.popTime >= 1) {
          entry.mesh.scale.setScalar(1);
        }
      }

      // 2) Layer slicing
      const yLevel = entry.coord[1] + 1;
      const aboveSlice = this.layerLimit !== null && yLevel > this.layerLimit;
      const onActiveSlice = this.layerLimit !== null && yLevel === this.layerLimit;

      // 3) Interactive count / peel / hover
      const countIdx = this.countedOrder.indexOf(entry.id);
      const isCounted = countIdx >= 0;
      const isPeeled = this.peeledSet.has(entry.id);
      const isHovered = this.hoveredEntry === entry;
      const isBuilderRemoveHover =
        this.mode === 'builder' && this.builderTool === 'remove' && isHovered;

      // Material color
      if (isBuilderRemoveHover) {
        mat.color.set('#ef4444');
        mat.emissive.set('#991b1b');
        mat.emissiveIntensity = 0.25;
      } else if (isCounted) {
        mat.color.set('#fbbf24');
        mat.emissive.set('#d97706');
        mat.emissiveIntensity = 0.16;
      } else if (isHovered) {
        mat.color.set(pal.light);
        mat.emissive.set(pal.fill);
        mat.emissiveIntensity = 0.18;
      } else if (onActiveSlice) {
        mat.color.set(pal.light);
        mat.emissive.set(pal.fill);
        mat.emissiveIntensity = 0.08;
      } else {
        mat.color.set(pal.fill);
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }

      // Transparency / X-Ray / Ghost
      if (aboveSlice) {
        mat.transparent = true;
        mat.opacity = isDark ? 0.08 : 0.07;
        mat.depthWrite = false;
        entry.mesh.castShadow = false;
        edgeMat.color.set(isDark ? '#64748b' : '#94a3b8');
        edgeMat.opacity = isDark ? 0.28 : 0.28;
      } else if (isPeeled) {
        mat.transparent = true;
        mat.opacity = 0.14;
        mat.depthWrite = false;
        entry.mesh.castShadow = false;
        edgeMat.color.set(isDark ? '#94a3b8' : '#64748b');
        edgeMat.opacity = 0.45;
      } else if (this.xray) {
        mat.transparent = true;
        mat.opacity = isDark ? 0.28 : 0.26;
        mat.depthWrite = false;
        entry.mesh.castShadow = false;
        edgeMat.color.set(isDark ? pal.light : pal.dark);
        edgeMat.opacity = 0.92;
      } else {
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        entry.mesh.castShadow = true;
        edgeMat.color.set(isDark ? pal.edgeDark : pal.edgeLight);
        edgeMat.opacity = isDark ? 0.72 : 0.86;
      }

      // Floating number badge on cube (must toggle labelObj.visible because CSS2DRenderer resets display!)
      if (isCounted && !aboveSlice) {
        entry.labelEl.textContent = String(countIdx + 1);
        entry.labelEl.className = 'cube-num-badge is-gold';
        entry.labelEl.style.display = 'flex';
        entry.labelObj.visible = true;
      } else if (this.countVisible !== null && !aboveSlice) {
        entry.labelEl.textContent = String(idx + 1);
        const isLatest = idx === this.countVisible - 1;
        entry.labelEl.className = isLatest ? 'cube-num-badge is-latest' : 'cube-num-badge';
        entry.labelEl.style.display = 'flex';
        entry.labelObj.visible = true;
      } else if (this.mode === 'reservoir' && this.showNumbers && entry.reservoirActive) {
        entry.labelEl.textContent = String(idx + 1);
        const isLatest = this.reservoirMeta && idx === this.reservoirMeta.filled - 1;
        entry.labelEl.className = isLatest ? 'cube-num-badge is-latest' : 'cube-num-badge';
        entry.labelEl.style.display = 'flex';
        entry.labelObj.visible = true;
      } else if (this.showNumbers && !aboveSlice) {
        entry.labelEl.textContent = String(idx + 1);
        entry.labelEl.className = 'cube-num-badge';
        entry.labelEl.style.display = 'flex';
        entry.labelObj.visible = true;
      } else {
        entry.labelEl.textContent = '';
        entry.labelEl.style.display = 'none';
        entry.labelObj.visible = false;
      }
    });
    this.requestRender(true);
  }

  _animate() {
    if (this.paused) {
      this.rafRunning = false;
      return;
    }

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    let anyMotion = false;
    let geometryMoved = false;

    // Smooth camera preset animation
    if (this.camAnim) {
      anyMotion = true;
      this.camAnim.t += dt / this.camAnim.duration;
      const u = Math.min(this.camAnim.t, 1);
      // Cubic ease out
      const ease = 1 - Math.pow(1 - u, 3);
      this.camera.position.lerpVectors(this.camAnim.startPos, this.camAnim.goalPos, ease);
      this.controls.target.lerpVectors(this.camAnim.startTarget, this.camAnim.goalTarget, ease);
      if (u >= 1) this.camAnim = null;
    }

    // Smooth explode & pop-in / reservoir drop animation per cube
    const posLerp = 1 - Math.exp(-12 * dt);
    for (const entry of this.cubeEntries) {
      if (this.mode === 'reservoir') {
        if (!entry.reservoirActive) continue;
        if (entry.reservoirDrop < 1) {
          anyMotion = true;
          geometryMoved = true;
          // Smooth, gentle descent (~0.52s) straight into its exact slot in the glass reservoir
          entry.reservoirDrop = Math.min(1, entry.reservoirDrop + dt * 1.95);
          const p = entry.reservoirDrop;
          // Quartic ease-out: silky smooth soft touch-down with zero harsh bounce
          const ease = 1 - Math.pow(1 - p, 4);
          const curY = THREE.MathUtils.lerp(entry.reservoirStartY, entry.basePos.y, ease);
          entry.mesh.position.set(entry.basePos.x, curY, entry.basePos.z);

          // Gentle fade-in + settle scale as the cube enters from above the glass rim
          const s = 0.90 + 0.10 * ease;
          entry.mesh.scale.setScalar(s);
          const fade = Math.min(1, p / 0.24);
          if (fade < 1) {
            entry.mesh.material.transparent = true;
            entry.mesh.material.opacity = fade;
            entry.edges.material.opacity = fade * 0.86;
          } else if (!this.xray) {
            entry.mesh.material.transparent = false;
            entry.mesh.material.opacity = 1;
            entry.edges.material.opacity = this.theme === 'dark' ? 0.72 : 0.86;
          }
        } else {
          entry.mesh.position.copy(entry.basePos);
          entry.mesh.scale.setScalar(1);
        }
        continue;
      }

      // Explode offset radially from its figure group's center
      const dirX = entry.basePos.x - entry.groupCenter.x;
      const dirY = entry.basePos.y - entry.groupCenter.y;
      const dirZ = entry.basePos.z - entry.groupCenter.z;
      const factor = this.explode * 0.68;

      const tx = entry.basePos.x + dirX * factor;
      // Keep cubes above floor when exploding
      const ty = Math.max(0, entry.basePos.y + (dirY + 0.45) * factor * 1.15);
      const tz = entry.basePos.z + dirZ * factor;

      const dx = tx - entry.mesh.position.x;
      const dy = ty - entry.mesh.position.y;
      const dz = tz - entry.mesh.position.z;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.0012) {
        entry.mesh.position.x += dx * posLerp;
        entry.mesh.position.y += dy * posLerp;
        entry.mesh.position.z += dz * posLerp;
        anyMotion = true;
        geometryMoved = true;
      } else if (dx !== 0 || dy !== 0 || dz !== 0) {
        entry.mesh.position.set(tx, ty, tz);
        geometryMoved = true;
      }

      // Elastic pop-in scale
      if (entry.popTime < 1) {
        anyMotion = true;
        geometryMoved = true;
        entry.popTime = Math.min(1, entry.popTime + dt * 3.8);
        const p = entry.popTime;
        // Spring overshoot
        const s = p < 1 ? 1 + Math.sin(p * Math.PI * 1.5) * 0.14 * (1 - p) : 1;
        const base = THREE.MathUtils.smoothstep(p, 0, 0.45);
        const finalScale = Math.max(0.001, base * s * entry.targetScale);
        entry.mesh.scale.setScalar(finalScale);
      }
    }

    const prevPos = this.camera.position;
    const ox = prevPos.x;
    const oy = prevPos.y;
    const oz = prevPos.z;
    this.controls.update();
    const camMoved =
      Math.abs(prevPos.x - ox) + Math.abs(prevPos.y - oy) + Math.abs(prevPos.z - oz) > 0.00025;

    if (camMoved || this.controls.autoRotate || this.isDragging) {
      anyMotion = true;
    }

    // Only regenerate directional shadow map when cubes actually move (2x faster camera rotation!)
    if (geometryMoved || this.shadowsDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsDirty = false;
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

    // Lightweight FPS watchdog: smoothly enable lite mode on older school whiteboards if FPS < 28
    if (anyMotion && !this.lowPerfActive && rawDt > 0.005 && rawDt < 0.25) {
      if (rawDt > 0.036) {
        this.slowFrameCount++;
        if (this.slowFrameCount >= 22) {
          this._enableLowPerfFallback();
        }
      } else if (this.slowFrameCount > 0) {
        this.slowFrameCount--;
      }
    }

    if (anyMotion) {
      this.idleFrames = 0;
    } else {
      this.idleFrames++;
    }

    // Sleep cleanly once completely still (~14 frames) so idle GPU/battery usage drops to 0%!
    if (this.idleFrames < 14) {
      this._raf = requestAnimationFrame(this._animate);
    } else {
      this.rafRunning = false;
      this._raf = null;
    }
  }

  getCubeCount() {
    return this.cubeEntries.length;
  }

  getMaxLayer() {
    let maxL = 1;
    for (const e of this.cubeEntries) {
      if (e.coord[1] + 1 > maxL) maxL = e.coord[1] + 1;
    }
    return maxL;
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this._clearDynamicScene();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
