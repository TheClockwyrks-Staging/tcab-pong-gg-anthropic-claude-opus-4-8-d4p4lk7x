// Carom's entry point. It wires the runtime layer — frame loop, canvas fit,
// input, audio, and overlay — to the game simulation and renderer, and installs
// the `window.__carom` automation surface.

import { createInitialState } from "./sim/state.js";
import { update } from "./sim/update.js";
import type { FrameInput } from "./sim/update.js";
import { renderGame, clearBackground } from "./render.js";
import { fitCanvas } from "./runtime/canvas.js";
import type { Fit } from "./runtime/canvas.js";
import { createInput } from "./runtime/input.js";
import { createAudio } from "./runtime/audio.js";
import { createOverlay } from "./runtime/overlay.js";
import { createLoop } from "./runtime/loop.js";
import { createDebugSurface } from "./debug.js";
import type { DebugSurface } from "./debug.js";

declare global {
  interface Window {
    __carom?: DebugSurface;
  }
}

function round(n: number, d = 1): string {
  return n.toFixed(d);
}

function main(): void {
  const canvas = document.getElementById("stage") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Carom: #stage canvas not found");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Carom: 2D context unavailable");

  const audio = createAudio();
  const state = createInitialState(audio.isMuted());
  const input = createInput(canvas);
  const overlay = createOverlay();

  let fit: Fit = fitCanvas(canvas);

  // One simulation step: read input, apply the mute toggle, mirror the mute bit,
  // advance the game, and play the cues the frame raised.
  const step = (dt: number): void => {
    const frame = input.read(fit);

    // The mute action is read on every screen, before the update.
    if (frame.muteEdge) {
      audio.toggleMuted();
    }
    // The game mirrors the runtime's mute bit every frame.
    state.muted = audio.isMuted();

    // Arm audio once a real gesture has happened.
    if (input.consumeGesture()) {
      audio.arm();
    }

    const frameInput: FrameInput = {
      actions: frame.actions,
      edges: frame.edges,
      pointer: frame.pointer,
    };

    const cues = update(state, frameInput, dt);
    for (const cue of cues) {
      audio.play(cue);
    }
  };

  const render = (): void => {
    fit = fitCanvas(canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(fit.dpr, fit.dpr);
    clearBackground(ctx, fit.cssW, fit.cssH);

    // Letterboxed, centered logical field.
    ctx.save();
    ctx.translate(fit.offsetX, fit.offsetY);
    ctx.scale(fit.scale, fit.scale);
    // Clip to the field so glow does not bleed into the letterbox.
    ctx.beginPath();
    ctx.rect(0, 0, 1280, 720);
    ctx.clip();
    renderGame(ctx, state);
    ctx.restore();

    // The overlay draws in CSS pixels, over everything.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(fit.dpr, fit.dpr);
    overlay.draw(ctx);
  };

  const loop = createLoop({ step, render });

  // Diagnostics: short, pure reads of the live state.
  overlay.register("screen", () => state.screen);
  overlay.register("mode", () => state.mode);
  overlay.register("score", () => `${state.score.p1} - ${state.score.p2}`);
  overlay.register("ball.pos", () =>
    state.ball ? `${round(state.ball.x)}, ${round(state.ball.y)}` : "none",
  );
  overlay.register("ball.vel", () =>
    state.ball ? `${round(state.ball.vx)}, ${round(state.ball.vy)}` : "none",
  );
  overlay.register("ball.speed", () =>
    state.ball ? round(Math.hypot(state.ball.vx, state.ball.vy)) : "none",
  );
  overlay.register("ball.spin", () =>
    state.ball ? round(state.ball.spin) : "none",
  );
  overlay.register(
    "paddle.L",
    () => `${round(state.paddles.left.cy)} v${round(state.paddles.left.vy)}`,
  );
  overlay.register(
    "paddle.R",
    () => `${round(state.paddles.right.cy)} v${round(state.paddles.right.vy)}`,
  );

  // The automation surface.
  window.__carom = createDebugSurface({
    state,
    setAutoStep: (enabled) => loop.setAutoStep(enabled),
    isAutoStep: () => loop.isAutoStep(),
    advance: (seconds, frames) => loop.advance(seconds, frames),
    setMuted: (muted) => audio.setMuted(muted),
  });

  window.addEventListener("resize", () => {
    fit = fitCanvas(canvas);
  });

  loop.start();
}

main();
