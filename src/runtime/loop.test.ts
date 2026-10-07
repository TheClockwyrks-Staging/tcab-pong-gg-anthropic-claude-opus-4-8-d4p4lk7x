import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoop } from "./loop.js";

afterEach(() => vi.unstubAllGlobals());

describe("loop frame driving", () => {
  it("steps and renders across animation frames, clamping the delta", () => {
    const frames: ((t: number) => void)[] = [];
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (fn: (t: number) => void) => {
      frames.push(fn);
      return ++id;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const step = vi.fn();
    const render = vi.fn();
    const loop = createLoop({ step, render });
    loop.start();
    // First frame: lastTime is 0, so dt is 0 and no step runs, but it renders.
    frames.shift()!(1000);
    expect(step).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    // A normal 16ms gap steps once.
    frames.shift()!(1016);
    expect(step).toHaveBeenCalledWith(0.016);
    // A huge gap is clamped to MAX_DT (1/30).
    frames.shift()!(5016);
    expect(step).toHaveBeenLastCalledWith(1 / 30);
    // With auto-step off, frames render but do not step.
    const before = step.mock.calls.length;
    loop.setAutoStep(false);
    frames.shift()!(5100);
    frames.shift()!(5200);
    expect(step.mock.calls.length).toBe(before);
    loop.stop();
  });

  it("ignores a second start and stops before starting", () => {
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const loop = createLoop({ step: () => {}, render: () => {} });
    expect(() => loop.stop()).not.toThrow();
    loop.start();
    loop.start();
    loop.stop();
  });
});

describe("loop", () => {
  it("advance runs the counted frames and renders once", () => {
    const step = vi.fn();
    const render = vi.fn();
    const loop = createLoop({ step, render });
    loop.advance(0.08, 4);
    expect(step).toHaveBeenCalledTimes(4);
    expect(step).toHaveBeenCalledWith(0.02);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("advance defaults to a single frame", () => {
    const step = vi.fn();
    const loop = createLoop({ step, render: () => {} });
    loop.advance(0.016);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledWith(0.016);
  });

  it("advance treats non-positive frame counts as one frame", () => {
    const step = vi.fn();
    const loop = createLoop({ step, render: () => {} });
    loop.advance(0.016, 0);
    expect(step).toHaveBeenCalledTimes(1);
  });

  it("tracks the auto-step flag", () => {
    const loop = createLoop({ step: () => {}, render: () => {} });
    expect(loop.isAutoStep()).toBe(true);
    loop.setAutoStep(false);
    expect(loop.isAutoStep()).toBe(false);
  });
});
