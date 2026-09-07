export class StrokeRecorder {
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
