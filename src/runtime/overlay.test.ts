import { afterEach, describe, expect, it, vi } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { createOverlay } from "./overlay.js";

let keyHandler: ((e: { code: string }) => void) | null = null;

function stubWindow(): void {
  keyHandler = null;
  vi.stubGlobal("window", {
    addEventListener: (type: string, fn: (e: { code: string }) => void) => {
      if (type === "keydown") keyHandler = fn;
    },
    removeEventListener: () => {},
  });
}

afterEach(() => vi.unstubAllGlobals());

function ctx() {
  return createCanvas(1280, 720).getContext(
    "2d",
  ) as unknown as CanvasRenderingContext2D;
}

describe("overlay", () => {
  it("starts hidden and toggles on the backtick key", () => {
    stubWindow();
    const overlay = createOverlay();
    expect(overlay.isVisible()).toBe(false);
    keyHandler!({ code: "Backquote" });
    expect(overlay.isVisible()).toBe(true);
    keyHandler!({ code: "KeyX" }); // other keys ignored
    expect(overlay.isVisible()).toBe(true);
    keyHandler!({ code: "Backquote" });
    expect(overlay.isVisible()).toBe(false);
  });

  it("draws nothing while hidden and its registered sources while shown", () => {
    stubWindow();
    const overlay = createOverlay();
    let reads = 0;
    overlay.register("fps", () => {
      reads++;
      return "60";
    });
    overlay.draw(ctx());
    expect(reads).toBe(0); // hidden: no reads
    keyHandler!({ code: "Backquote" });
    overlay.draw(ctx());
    expect(reads).toBe(1);
  });

  it("disposes without throwing", () => {
    stubWindow();
    const overlay = createOverlay();
    expect(() => overlay.dispose()).not.toThrow();
  });
});
