// The shape of Carom's game state. The build owns this shape entirely; the one
// contract over it is the debug surface in `specs/instrumentation.md`.

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";

export type Mode = "solo" | "versus";

export type Side = "left" | "right";

export interface Paddle {
  cy: number;
  vy: number;
  driven: boolean;
  drivenVy: number;
}

export interface TrailSample {
  x: number;
  y: number;
  t: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  held: boolean;
  holdTimer: number;
  serveSign: 1 | -1;
  trail: TrailSample[];
}

export interface Obstacle {
  index: number;
  cx: number;
  cy: number;
}

export interface Ai {
  tracking: boolean;
  movement: boolean;
}

export interface GameState {
  screen: Screen;
  mode: Mode;
  menuIndex: number;
  titleIndex: number;
  resumeScreen: "countdown" | "playing";
  score: { p1: number; p2: number };
  winner: Side | null;
  receiver: Side;
  paddles: { left: Paddle; right: Paddle };
  ai: Ai;
  ball: Ball | null;
  obstacles: Obstacle[];
  simTime: number;
  muted: boolean;
}

/** The four movement actions, as read each frame (1 while held, 0 otherwise). */
export interface InputActions {
  "p1-up": number;
  "p1-down": number;
  "p2-up": number;
  "p2-down": number;
}

/** A press edge for a menu action, true only on the frame the key went down. */
export interface MenuEdges {
  "p1-up": boolean;
  "p1-down": boolean;
  "p2-up": boolean;
  "p2-down": boolean;
  confirm: boolean;
  back: boolean;
  pause: boolean;
  mute: boolean;
}

/** A rectangular hit region in logical units. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A pointer/touch selection delivered to the menu layer for one frame. */
export interface PointerEvent2D {
  /** Logical position the pointer moved to this frame, or null if no move. */
  move: { x: number; y: number } | null;
  /**
   * A completed press+release (pointer) or land+lift (touch) this frame, with
   * both edge positions. The menu confirms only when both fall in one region.
   */
  confirm: {
    press: { x: number; y: number };
    release: { x: number; y: number };
  } | null;
}

/** The named cues the audio layer plays. */
export type Cue = "paddle-hit" | "wall-bounce" | "obstacle-bounce" | "score";
