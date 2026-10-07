import { afterEach, describe, expect, it, vi } from "vitest";
import { clientToLogical, fitCanvas } from "./canvas.js";
import type { Fit } from "./canvas.js";

interface FakeCanvas {
  clientWidth: number;
  clientHeight: number;
  width: number;
  height: number;
}

function stubWindow(dpr: number, w: number, h: number): void {
  vi.stubGlobal("window", {
    devicePixelRatio: dpr,
    innerWidth: w,
    innerHeight: h,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("canvas fit", () => {
  it("fits the 1280x720 field into a wide window, letterboxed left/right", () => {
    stubWindow(1, 1600, 720);
    const canvas: FakeCanvas = {
      clientWidth: 1600,
      clientHeight: 720,
      width: 0,
      height: 0,
    };
    const fit = fitCanvas(canvas as unknown as HTMLCanvasElement);
    expect(fit.scale).toBeCloseTo(1, 6); // 720/720 limits
    expect(fit.offsetX).toBeCloseTo((1600 - 1280) / 2, 6);
    expect(fit.offsetY).toBeCloseTo(0, 6);
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(720);
  });

  it("fits into a tall window, letterboxed top/bottom at DPR 2", () => {
    stubWindow(2, 1280, 1000);
    const canvas: FakeCanvas = {
      clientWidth: 1280,
      clientHeight: 1000,
      width: 0,
      height: 0,
    };
    const fit = fitCanvas(canvas as unknown as HTMLCanvasElement);
    expect(fit.scale).toBeCloseTo(1, 6);
    expect(fit.offsetY).toBeCloseTo((1000 - 720) / 2, 6);
    expect(fit.dpr).toBe(2);
    expect(canvas.width).toBe(2560);
    expect(canvas.height).toBe(2000);
  });

  it("maps a client point into logical units through the fit", () => {
    const fit: Fit = {
      scale: 2,
      offsetX: 100,
      offsetY: 50,
      dpr: 1,
      cssW: 0,
      cssH: 0,
    };
    expect(clientToLogical(fit, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(clientToLogical(fit, 300, 250)).toEqual({ x: 100, y: 100 });
  });
});
