// The frame loop: measures real delta time, clamps it to a sane range, and drives
// the game's step and render each animation frame. The clock can be taken off
// real time (`setAutoStep(false)`) and advanced explicitly, which is how the
// automation surface scripts the game.

export interface LoopHooks {
  /** Advances the simulation by `dt` seconds. */
  step: (dt: number) => void;
  /** Renders the current state. */
  render: () => void;
}

export interface Loop {
  start(): void;
  stop(): void;
  setAutoStep(enabled: boolean): void;
  isAutoStep(): boolean;
  /** Runs `frames` whole frames covering `seconds` of game time, immediately. */
  advance(seconds: number, frames?: number): void;
}

/** The largest real delta time a single frame integrates, in seconds. */
const MAX_DT = 1 / 30;

export function createLoop(hooks: LoopHooks): Loop {
  let autoStep = true;
  let running = false;
  let rafId = 0;
  let lastTime = 0;

  const frame = (now: number): void => {
    if (!running) return;
    const dtRaw = lastTime === 0 ? 0 : (now - lastTime) / 1000;
    lastTime = now;
    if (autoStep) {
      const dt = Math.min(Math.max(dtRaw, 0), MAX_DT);
      if (dt > 0) hooks.step(dt);
    }
    hooks.render();
    rafId = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
    setAutoStep(enabled: boolean) {
      autoStep = enabled;
      // Reset the clock so re-enabling does not integrate the gap.
      lastTime = 0;
    },
    isAutoStep: () => autoStep,
    advance(seconds: number, frames = 1) {
      const n = Math.max(1, Math.floor(frames));
      const dt = seconds / n;
      for (let i = 0; i < n; i++) {
        hooks.step(dt);
      }
      hooks.render();
    },
  };
}
