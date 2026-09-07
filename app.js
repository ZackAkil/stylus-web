import { StrokeRenderer } from './stroke-renderer.js';
import { StrokeRecorder } from './recorder.js';

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
