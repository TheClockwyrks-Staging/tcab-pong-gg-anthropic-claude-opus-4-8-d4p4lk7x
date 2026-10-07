// Menu input handling: the keyboard edges and the pointer/touch selections that
// drive every menu screen, plus the pause/resume transitions. This runs first in
// each update, on the screen the update began on.

import type { FrameInput } from "./update.js";
import type { GameState } from "../types.js";
import { menuItemCount, menuItemRect } from "./menuLayout.js";
import { returnToTitle, startMatch } from "./state.js";

function inRect(
  rect: { x: number; y: number; w: number; h: number },
  px: number,
  py: number,
): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

/** Finds the index of the menu item whose region contains (px, py), or -1. */
function itemAt(state: GameState, px: number, py: number): number {
  const count = menuItemCount(state.screen);
  for (let i = 0; i < count; i++) {
    const rect = menuItemRect(state.screen, i);
    if (rect && inRect(rect, px, py)) return i;
  }
  return -1;
}

/** Confirms the item at the current `menuIndex` on the current screen. */
function confirmCurrent(state: GameState): void {
  switch (state.screen) {
    case "title": {
      state.titleIndex = state.menuIndex;
      if (state.menuIndex === 0) startMatch(state, "solo");
      else if (state.menuIndex === 1) startMatch(state, "versus");
      else {
        state.screen = "howto";
        state.menuIndex = 0;
      }
      break;
    }
    case "howto":
      returnToTitle(state);
      break;
    case "paused":
      if (state.menuIndex === 0) state.screen = state.resumeScreen;
      else if (state.menuIndex === 1) startMatch(state, state.mode);
      else returnToTitle(state);
      break;
    case "matchover":
      if (state.menuIndex === 0) startMatch(state, state.mode);
      else returnToTitle(state);
      break;
  }
}

/** Moves the menu cursor by `delta`, wrapping over the current menu's items. */
function moveCursor(state: GameState, delta: number): void {
  const count = menuItemCount(state.screen);
  if (count === 0) return;
  state.menuIndex = (state.menuIndex + delta + count) % count;
}

/**
 * Applies one frame of input to the menus and the pause state. Order within the
 * frame follows `specs/ui.md`: pause/back before menu edges on `paused`; up
 * before down; movement before confirm; pointer/touch after the keyboard edges.
 */
export function applyMenu(state: GameState, input: FrameInput): void {
  const { edges, pointer } = input;

  // Mute is read on every screen.
  // (The actual mute toggle is applied by the runtime; the state mirror is kept
  // in sync there. Nothing to do here.)

  const screen = state.screen;

  if (screen === "countdown" || screen === "playing") {
    if (edges.pause) {
      state.resumeScreen = screen;
      state.screen = "paused";
      state.menuIndex = 0;
    }
    return;
  }

  if (screen === "paused") {
    // pause and back are read before the menu edges; either resumes.
    if (edges.pause || edges.back) {
      state.screen = state.resumeScreen;
      return;
    }
  }

  if (screen === "title" || screen === "paused" || screen === "matchover") {
    const up = edges["p1-up"] || edges["p2-up"];
    const down = edges["p1-down"] || edges["p2-down"];
    if (up) {
      moveCursor(state, -1);
      applyPointerMove(state, pointer);
      return;
    }
    if (down) {
      moveCursor(state, 1);
      applyPointerMove(state, pointer);
      return;
    }
    if (edges.confirm) {
      // The keyboard's item is confirmed alone; a pointer confirm this frame is
      // ignored, but a pointer move still has nothing to add since confirm acts.
      confirmCurrent(state);
      return;
    }
  } else if (screen === "howto") {
    if (edges.confirm || edges.back) {
      confirmCurrent(state);
      return;
    }
  }

  applyPointer(state, pointer);
}

/** Applies a pointer/touch move alone (used when a keyboard move also fired). */
function applyPointerMove(
  state: GameState,
  pointer: FrameInput["pointer"],
): void {
  if (menuItemCount(state.screen) === 0) return;
  if (pointer.move) {
    const idx = itemAt(state, pointer.move.x, pointer.move.y);
    if (idx >= 0) state.menuIndex = idx;
  }
}

/** Applies the frame's pointer/touch move and confirm, after keyboard edges. */
function applyPointer(state: GameState, pointer: FrameInput["pointer"]): void {
  if (menuItemCount(state.screen) === 0) return;
  if (pointer.move) {
    const idx = itemAt(state, pointer.move.x, pointer.move.y);
    if (idx >= 0) state.menuIndex = idx;
  }
  if (pointer.confirm) {
    const pressIdx = itemAt(
      state,
      pointer.confirm.press.x,
      pointer.confirm.press.y,
    );
    const releaseIdx = itemAt(
      state,
      pointer.confirm.release.x,
      pointer.confirm.release.y,
    );
    // Both edges must fall in one and the same item's region.
    if (pressIdx >= 0 && pressIdx === releaseIdx) {
      state.menuIndex = pressIdx;
      confirmCurrent(state);
    }
  }
}
