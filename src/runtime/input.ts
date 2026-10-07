// Keyboard, pointer, and touch input. Keys are tracked as held/edge sets; each
// frame the game reads the action values, the press edges, and one pointer
// selection, through the canvas fit so positions arrive in logical units.

import type { FrameInput } from "../sim/update.js";
import type { Fit } from "./canvas.js";
import { clientToLogical } from "./canvas.js";

/** The physical keys bound to each action, by KeyboardEvent.code. */
const KEY_BINDINGS = {
  "p1-up": ["KeyW"],
  "p1-down": ["KeyS"],
  "p2-up": ["ArrowUp"],
  "p2-down": ["ArrowDown"],
  confirm: ["Enter", "Space"],
  back: ["Escape"],
  pause: ["KeyP", "Escape"],
  mute: ["KeyM"],
} as const;

type Action = keyof typeof KEY_BINDINGS;

interface PointerState {
  logicalX: number;
  logicalY: number;
  moved: boolean;
  /** Position a completed press+release / tap resolved at this frame. */
  confirmX: number;
  confirmY: number;
  confirmed: boolean;
  /** The region-check is left to the menu layer; we only track raw positions. */
  pressX: number;
  pressY: number;
  pressed: boolean;
}

export interface Input {
  /** Reads one frame of input and clears the per-frame edges. */
  read(fit: Fit): FrameInput & { muteEdge: boolean };
  /** Whether the audio layer should arm (set once a real gesture occurs). */
  consumeGesture(): boolean;
  dispose(): void;
}

/** Creates the input layer, wiring listeners to the given canvas and window. */
export function createInput(canvas: HTMLCanvasElement): Input {
  const held = new Set<string>();
  const pressedThisFrame = new Set<string>();
  let gesture = false;

  const pointer: PointerState = {
    logicalX: 0,
    logicalY: 0,
    moved: false,
    confirmX: 0,
    confirmY: 0,
    confirmed: false,
    pressX: 0,
    pressY: 0,
    pressed: false,
  };
  // Latest fit, updated on each read, so listeners can map positions.
  let lastFit: Fit | null = null;

  const allCodes = new Set<string>(
    (
      Object.values(KEY_BINDINGS) as ReadonlyArray<ReadonlyArray<string>>
    ).flat(),
  );
  const codeIsBound = (code: string): boolean => allCodes.has(code);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!codeIsBound(e.code)) return;
    e.preventDefault();
    gesture = true;
    if (!held.has(e.code)) {
      pressedThisFrame.add(e.code);
    }
    held.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (!codeIsBound(e.code)) return;
    held.delete(e.code);
  };

  const mapEvent = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const fit = lastFit;
    if (!fit) return { x: clientX, y: clientY };
    return clientToLogical(fit, clientX - rect.left, clientY - rect.top);
  };

  const onPointerMove = (e: MouseEvent): void => {
    const p = mapEvent(e.clientX, e.clientY);
    pointer.logicalX = p.x;
    pointer.logicalY = p.y;
    pointer.moved = true;
  };
  const onPointerDown = (e: MouseEvent): void => {
    gesture = true;
    const p = mapEvent(e.clientX, e.clientY);
    pointer.pressed = true;
    pointer.pressX = p.x;
    pointer.pressY = p.y;
    pointer.logicalX = p.x;
    pointer.logicalY = p.y;
    pointer.moved = true;
  };
  const onPointerUp = (e: MouseEvent): void => {
    const p = mapEvent(e.clientX, e.clientY);
    if (pointer.pressed) {
      pointer.confirmed = true;
      pointer.confirmX = p.x;
      pointer.confirmY = p.y;
    }
    pointer.pressed = false;
  };

  const onTouchStart = (e: TouchEvent): void => {
    gesture = true;
    const t = e.changedTouches[0];
    if (!t) return;
    const p = mapEvent(t.clientX, t.clientY);
    pointer.pressed = true;
    pointer.pressX = p.x;
    pointer.pressY = p.y;
    pointer.logicalX = p.x;
    pointer.logicalY = p.y;
    pointer.moved = true;
  };
  const onTouchMove = (e: TouchEvent): void => {
    const t = e.changedTouches[0];
    if (!t) return;
    const p = mapEvent(t.clientX, t.clientY);
    pointer.logicalX = p.x;
    pointer.logicalY = p.y;
    pointer.moved = true;
  };
  const onTouchEnd = (e: TouchEvent): void => {
    const t = e.changedTouches[0];
    if (!t) return;
    const p = mapEvent(t.clientX, t.clientY);
    if (pointer.pressed) {
      pointer.confirmed = true;
      pointer.confirmX = p.x;
      pointer.confirmY = p.y;
    }
    pointer.pressed = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mouseup", onPointerUp);
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });

  const actionHeld = (action: Action): boolean =>
    KEY_BINDINGS[action].some((code: string) => held.has(code));
  const actionEdge = (action: Action): boolean =>
    KEY_BINDINGS[action].some((code: string) => pressedThisFrame.has(code));

  return {
    read(fit: Fit) {
      lastFit = fit;
      const actions = {
        "p1-up": actionHeld("p1-up") ? 1 : 0,
        "p1-down": actionHeld("p1-down") ? 1 : 0,
        "p2-up": actionHeld("p2-up") ? 1 : 0,
        "p2-down": actionHeld("p2-down") ? 1 : 0,
      };
      const edges = {
        "p1-up": actionEdge("p1-up"),
        "p1-down": actionEdge("p1-down"),
        "p2-up": actionEdge("p2-up"),
        "p2-down": actionEdge("p2-down"),
        confirm: actionEdge("confirm"),
        back: actionEdge("back"),
        pause: actionEdge("pause"),
        mute: actionEdge("mute"),
      };
      const frame: FrameInput & { muteEdge: boolean } = {
        actions,
        edges,
        pointer: {
          move: pointer.moved
            ? { x: pointer.logicalX, y: pointer.logicalY }
            : null,
          confirm: pointer.confirmed
            ? {
                press: { x: pointer.pressX, y: pointer.pressY },
                release: { x: pointer.confirmX, y: pointer.confirmY },
              }
            : null,
        },
        muteEdge: edges.mute,
      };

      // Clear per-frame edges.
      pressedThisFrame.clear();
      pointer.moved = false;
      pointer.confirmed = false;
      return frame;
    },
    consumeGesture() {
      const g = gesture;
      return g;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onPointerMove);
      canvas.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mouseup", onPointerUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    },
  };
}
