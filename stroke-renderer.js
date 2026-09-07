export class StrokeRenderer {
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
    // Exponential smoothing for pressure to avoid stepped line widths
    this.smoothedPressure = this.smoothedPressure * 0.65 + rawPressure * 0.35;
    this.points.push({ x, y });

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.fillStyle = this.strokeColor;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.getLineWidth(this.smoothedPressure);

    if (this.points.length === 2) {
      // First segment: draw straight line to midpoint
      const p0 = this.points[0];
      const p1 = this.points[1];
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      this.ctx.beginPath();
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.lineTo(mid.x, mid.y);
      this.ctx.stroke();
    } else if (this.points.length >= 3) {
      // Midpoint quadratic Bézier spline
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
      // Single tap dot
      const p = this.points[0];
      const radius = this.getLineWidth(this.smoothedPressure) / 2;
      this.ctx.fillStyle = this.strokeColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(radius, 1), 0, Math.PI * 2);
      this.ctx.fill();
    } else if (this.points.length >= 2) {
      // Finalize curve to last endpoint
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
