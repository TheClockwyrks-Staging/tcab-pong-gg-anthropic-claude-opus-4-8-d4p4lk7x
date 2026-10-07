import { afterEach, describe, expect, it, vi } from "vitest";
import { createInput } from "./input.js";
import type { Fit } from "./canvas.js";

type Handler = (e: unknown) => void;

const fit: Fit = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dpr: 1,
  cssW: 1280,
  cssH: 720,
};

interface Harness {
  win: Record<string, Handler[]>;
  can: Record<string, Handler[]>;
  fire: (target: "win" | "can", type: string, e: unknown) => void;
}

function setup(): Harness {
  const win: Record<string, Handler[]> = {};
  const can: Record<string, Handler[]> = {};
  const add =
    (bag: Record<string, Handler[]>) => (type: string, fn: Handler) => {
      (bag[type] ||= []).push(fn);
    };
  const remove =
    (bag: Record<string, Handler[]>) => (type: string, fn: Handler) => {
      bag[type] = (bag[type] || []).filter((f) => f !== fn);
    };
  vi.stubGlobal("window", {
    addEventListener: add(win),
    removeEventListener: remove(win),
    AudioContext: undefined,
  });
  const canvas = {
    addEventListener: add(can),
    removeEventListener: remove(can),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  // Build input with our fake canvas.
  const input = createInput(canvas as unknown as HTMLCanvasElement);
  const fire = (target: "win" | "can", type: string, e: unknown) => {
    const bag = target === "win" ? win : can;
    for (const fn of bag[type] || []) fn(e);
  };
  // Stash on the returned harness via closure.
  (harnessInput as { current: ReturnType<typeof createInput> }).current = input;
  return { win, can, fire };
}

const harnessInput: { current: ReturnType<typeof createInput> | null } = {
  current: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("input", () => {
  it("reports held movement actions and their press edges once", () => {
    const h = setup();
    const input = harnessInput.current!;
    h.fire("win", "keydown", { code: "KeyW", preventDefault() {} });
    let frame = input.read(fit);
    expect(frame.actions["p1-up"]).toBe(1);
    expect(frame.edges["p1-up"]).toBe(true);
    // The edge clears on the next read while the key is still held.
    frame = input.read(fit);
    expect(frame.actions["p1-up"]).toBe(1);
    expect(frame.edges["p1-up"]).toBe(false);
    h.fire("win", "keyup", { code: "KeyW" });
    frame = input.read(fit);
    expect(frame.actions["p1-up"]).toBe(0);
  });

  it("maps every binding including shared Escape and the mute edge", () => {
    const h = setup();
    const input = harnessInput.current!;
    h.fire("win", "keydown", { code: "Escape", preventDefault() {} });
    h.fire("win", "keydown", { code: "KeyM", preventDefault() {} });
    const frame = input.read(fit);
    expect(frame.edges.pause).toBe(true);
    expect(frame.edges.back).toBe(true);
    expect(frame.muteEdge).toBe(true);
  });

  it("ignores unbound keys", () => {
    const h = setup();
    const input = harnessInput.current!;
    h.fire("win", "keydown", { code: "KeyZ", preventDefault() {} });
    const frame = input.read(fit);
    expect(frame.actions["p1-up"]).toBe(0);
    expect(frame.edges.confirm).toBe(false);
  });

  it("delivers a mouse move and a press+release confirm in logical units", () => {
    const h = setup();
    const input = harnessInput.current!;
    h.fire("can", "mousemove", { clientX: 200, clientY: 150 });
    let frame = input.read(fit);
    expect(frame.pointer.move).toEqual({ x: 200, y: 150 });
    h.fire("can", "mousedown", { clientX: 300, clientY: 250 });
    h.fire("win", "mouseup", { clientX: 300, clientY: 250 });
    frame = input.read(fit);
    expect(frame.pointer.confirm).toEqual({
      press: { x: 300, y: 250 },
      release: { x: 300, y: 250 },
    });
  });

  it("delivers a touch tap as a confirm", () => {
    const h = setup();
    const input = harnessInput.current!;
    h.fire("can", "touchstart", {
      changedTouches: [{ clientX: 50, clientY: 60 }],
    });
    h.fire("can", "touchmove", {
      changedTouches: [{ clientX: 55, clientY: 66 }],
    });
    h.fire("can", "touchend", {
      changedTouches: [{ clientX: 55, clientY: 66 }],
    });
    const frame = input.read(fit);
    expect(frame.pointer.confirm).not.toBeNull();
    expect(frame.pointer.move).not.toBeNull();
  });

  it("marks a gesture after real input and disposes cleanly", () => {
    const h = setup();
    const input = harnessInput.current!;
    expect(input.consumeGesture()).toBe(false);
    h.fire("win", "keydown", { code: "KeyS", preventDefault() {} });
    expect(input.consumeGesture()).toBe(true);
    expect(() => input.dispose()).not.toThrow();
  });
});
