class StrokeRecorder {
  constructor() {
    this.events = [];
    this.isRecording = false;
    this.isPlaying = false;
    this.startTime = 0;
    this.playbackAnimationId = null;
  }

  startRecording() {
    this.events = [];
    this.isRecording = true;
    this.startTime = performance.now();
  }

  stopRecording() {
    this.isRecording = false;
  }

  recordEvent(type, x, y, pressure) {
    if (!this.isRecording) return;
    this.events.push({
      type,
      x,
      y,
      pressure,
      time: performance.now() - this.startTime,
    });
  }

  hasRecording() {
    return this.events.length > 0;
  }

  play(onEvent, onComplete) {
    if (this.events.length === 0 || this.isPlaying) return;

    this.isPlaying = true;
    let eventIndex = 0;
    const playbackStart = performance.now();

    const step = () => {
      if (!this.isPlaying) return;

      const elapsed = performance.now() - playbackStart;

      while (eventIndex < this.events.length && this.events[eventIndex].time <= elapsed) {
        const ev = this.events[eventIndex];
        onEvent(ev);
        eventIndex++;
      }

      if (eventIndex < this.events.length) {
        this.playbackAnimationId = requestAnimationFrame(step);
      } else {
        this.isPlaying = false;
        this.playbackAnimationId = null;
        if (onComplete) onComplete();
      }
    };

    this.playbackAnimationId = requestAnimationFrame(step);
  }

  stopPlayback() {
    if (this.playbackAnimationId) {
      cancelAnimationFrame(this.playbackAnimationId);
      this.playbackAnimationId = null;
    }
    this.isPlaying = false;
  }
}

class StrokeRenderer {
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.minWidth = options.minWidth || 1;
    this.maxWidth = options.maxWidth || 12;
    this.strokeColor = options.strokeColor || '#ffffff';
    this.points = [];
    this.smoothedPressure = 0.5;
  }

  getLineWidth(pressure) {
    const effectivePressure = pressure > 0 ? pressure : 0.5;
    return this.minWidth + (this.maxWidth - this.minWidth) * effectivePressure;
  }

  beginStroke(x, y, pressure) {
    this.smoothedPressure = pressure > 0 ? pressure : 0.5;
    this.points = [{ x, y }];
  }

  addPoint(x, y, pressure) {
    const rawPressure = pressure > 0 ? pressure : 0.5;
    this.smoothedPressure = this.smoothedPressure * 0.65 + rawPressure * 0.35;
    this.points.push({ x, y });

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.fillStyle = this.strokeColor;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.getLineWidth(this.smoothedPressure);

    if (this.points.length === 2) {
      const p0 = this.points[0];
      const p1 = this.points[1];
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      this.ctx.beginPath();
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.lineTo(mid.x, mid.y);
      this.ctx.stroke();
    } else if (this.points.length >= 3) {
      const p0 = this.points[this.points.length - 3];
      const p1 = this.points[this.points.length - 2];
      const p2 = this.points[this.points.length - 1];

      const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      this.ctx.beginPath();
      this.ctx.moveTo(mid1.x, mid1.y);
      this.ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      this.ctx.stroke();
    }
  }

  endStroke() {
    if (this.points.length === 1) {
      const p = this.points[0];
      const radius = this.getLineWidth(this.smoothedPressure) / 2;
      this.ctx.fillStyle = this.strokeColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(radius, 1), 0, Math.PI * 2);
      this.ctx.fill();
    } else if (this.points.length >= 2) {
      const pLast = this.points[this.points.length - 1];
      const pPrev = this.points[this.points.length - 2];
      const mid = { x: (pPrev.x + pLast.x) / 2, y: (pPrev.y + pLast.y) / 2 };

      this.ctx.lineWidth = this.getLineWidth(this.smoothedPressure);
      this.ctx.beginPath();
      this.ctx.moveTo(mid.x, mid.y);
      this.ctx.lineTo(pLast.x, pLast.y);
      this.ctx.stroke();
    }

    this.points = [];
  }
}

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const recordBtn = document.getElementById('record-btn');
const playBtn = document.getElementById('play-btn');
const clearBtn = document.getElementById('clear-btn');
const statusIndicator = document.getElementById('status-indicator');
const pressureIndicator = document.getElementById('pressure-indicator');

const renderer = new StrokeRenderer(ctx, {
  minWidth: 1,
  maxWidth: 12,
  strokeColor: '#ffffff',
});

const recorder = new StrokeRecorder();
let isDrawing = false;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);
}

function clearCanvas() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function processPointerPoint(type, x, y, pressure) {
  pressureIndicator.textContent = `Pressure: ${pressure.toFixed(2)}`;

  if (type === 'down') {
    renderer.beginStroke(x, y, pressure);
    renderer.addPoint(x, y, pressure);
  } else if (type === 'move') {
    renderer.addPoint(x, y, pressure);
  } else if (type === 'up') {
    renderer.endStroke();
  }

  recorder.recordEvent(type, x, y, pressure);
}

function onPointerDown(event) {
  if (event.pointerType !== 'pen' || recorder.isPlaying) return;

  isDrawing = true;
  canvas.setPointerCapture(event.pointerId);

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  processPointerPoint('down', x, y, event.pressure);
}

function onPointerMove(event) {
  if (!isDrawing || event.pointerType !== 'pen' || recorder.isPlaying) return;

  const rect = canvas.getBoundingClientRect();
  const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];

  for (const e of events) {
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    processPointerPoint('move', x, y, e.pressure);
  }
}

function onPointerUp(event) {
  if (!isDrawing || event.pointerType !== 'pen') return;

  isDrawing = false;
  canvas.releasePointerCapture(event.pointerId);

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  processPointerPoint('up', x, y, event.pressure);
}

function toggleRecording() {
  if (recorder.isPlaying) return;

  if (recorder.isRecording) {
    recorder.stopRecording();
    recordBtn.textContent = 'Record';
    recordBtn.classList.remove('recording');
    statusIndicator.textContent = '';
    playBtn.disabled = !recorder.hasRecording();
  } else {
    recorder.startRecording();
    recordBtn.textContent = 'Stop Recording';
    recordBtn.classList.add('recording');
    statusIndicator.textContent = 'Recording...';
    playBtn.disabled = true;
  }
}

function startPlayback() {
  if (!recorder.hasRecording() || recorder.isPlaying || recorder.isRecording) return;

  clearCanvas();
  statusIndicator.textContent = 'Playing...';
  playBtn.disabled = true;
  recordBtn.disabled = true;
  clearBtn.disabled = true;

  recorder.play(
    (ev) => {
      pressureIndicator.textContent = `Pressure: ${ev.pressure.toFixed(2)}`;
      if (ev.type === 'down') {
        renderer.beginStroke(ev.x, ev.y, ev.pressure);
        renderer.addPoint(ev.x, ev.y, ev.pressure);
      } else if (ev.type === 'move') {
        renderer.addPoint(ev.x, ev.y, ev.pressure);
      } else if (ev.type === 'up') {
        renderer.endStroke();
      }
    },
    () => {
      statusIndicator.textContent = '';
      playBtn.disabled = false;
      recordBtn.disabled = false;
      clearBtn.disabled = false;
    }
  );
}

window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);

recordBtn.addEventListener('click', toggleRecording);
playBtn.addEventListener('click', startPlayback);
clearBtn.addEventListener('click', () => {
  if (!recorder.isPlaying) {
    clearCanvas();
  }
});

resizeCanvas();
