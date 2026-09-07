const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clear-btn');
const pressureIndicator = document.getElementById('pressure-indicator');

let isDrawing = false;
let lastPoint = null;

const MIN_WIDTH = 1;
const MAX_WIDTH = 12;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function getLineWidth(pressure) {
  const effectivePressure = pressure > 0 ? pressure : 0.5;
  return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * effectivePressure;
}

function drawSegment(p1, p2, pressure) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = getLineWidth(pressure);
  ctx.stroke();
}

function handlePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const currentPoint = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  const pressure = event.pressure;
  pressureIndicator.textContent = `Pressure: ${pressure.toFixed(2)}`;

  if (lastPoint) {
    drawSegment(lastPoint, currentPoint, pressure);
  }

  lastPoint = currentPoint;
}

function onPointerDown(event) {
  if (event.pointerType !== 'pen') return;
  isDrawing = true;
  canvas.setPointerCapture(event.pointerId);

  const rect = canvas.getBoundingClientRect();
  lastPoint = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  // Process coalesced events if available for high-frequency input
  const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
  for (const e of events) {
    handlePointer(e);
  }
}

function onPointerMove(event) {
  if (!isDrawing || event.pointerType !== 'pen') return;

  const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
  for (const e of events) {
    handlePointer(e);
  }
}

function onPointerUp(event) {
  if (!isDrawing || event.pointerType !== 'pen') return;
  isDrawing = false;
  lastPoint = null;
  canvas.releasePointerCapture(event.pointerId);
}

function clearCanvas() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
clearBtn.addEventListener('click', clearCanvas);

resizeCanvas();
