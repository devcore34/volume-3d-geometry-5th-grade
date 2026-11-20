// Lightweight hi-DPI electronic whiteboard marker overlay
export class WhiteboardDraw {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.active = false;
    this.drawing = false;
    this.color = '#ef4444';
    this.lineWidth = 4;
    this.mode = 'pen'; // 'pen' | 'eraser'
    this.strokes = [];
    this.currentStroke = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onResize = this._onResize.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);

    this._onResize();
  }

  setActive(isActive) {
    this.active = isActive;
    this.canvas.classList.toggle('draw-active', isActive);
    this.canvas.style.pointerEvents = isActive ? 'auto' : 'none';
  }

  setColor(color) {
    this.color = color;
    this.mode = 'pen';
  }

  setMode(mode) {
    this.mode = mode;
  }

  undo() {
    this.strokes.pop();
    this._redraw();
  }

  clear() {
    this.strokes = [];
    this._redraw();
  }

  hasStrokes() {
    return this.strokes.length > 0;
  }

  _onResize() {
    // Cap DPR at 1.5 so 4K electronic whiteboards blit strokes effortlessly with zero lag
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._redraw();
  }

  _onPointerDown(e) {
    if (!this.active) return;
    e.preventDefault();
    this.drawing = true;
    this.canvas.setPointerCapture?.(e.pointerId);
    const pt = { x: e.clientX, y: e.clientY };
    this.currentStroke = {
      color: this.color,
      width: this.mode === 'eraser' ? 26 : this.lineWidth,
      mode: this.mode,
      points: [pt],
    };
    this.strokes.push(this.currentStroke);
    // Incremental single-dot draw instead of redrawing entire stroke history!
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.currentStroke.color;
    if (this.currentStroke.mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, this.currentStroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _onPointerMove(e) {
    if (!this.drawing || !this.currentStroke) return;
    e.preventDefault();
    const pts = this.currentStroke.points;
    const last = pts[pts.length - 1];
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (dx * dx + dy * dy < 4) return;
    pts.push({ x: e.clientX, y: e.clientY });
    this._drawSegment(this.currentStroke, pts.length - 2, pts.length - 1);
  }

  _onPointerUp() {
    this.drawing = false;
    this.currentStroke = null;
  }

  _drawSegment(stroke, i0, i1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;
    if (stroke.mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }
    const p0 = stroke.points[i0];
    const p1 = stroke.points[i1];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
  }

  _redraw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const stroke of this.strokes) {
      if (stroke.points.length === 1) {
        ctx.save();
        ctx.fillStyle = stroke.color;
        if (stroke.mode === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
        }
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          this._drawSegment(stroke, i - 1, i);
        }
      }
    }
  }
}
