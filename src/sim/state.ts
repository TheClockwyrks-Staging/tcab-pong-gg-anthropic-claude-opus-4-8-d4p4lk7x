// State construction and the serve-sign draw. These are the pure building blocks
// the update and the debug surface both stand on.

import { FIELD_CX, FIELD_CY, HOLD_TIME, OBSTACLE_CENTERS } from "../config.js";
import type { Ball, GameState, Obstacle, Paddle, Side } from "../types.js";

/** Draws a fresh serve sign, 1 and -1 each equally likely. */
export function drawServeSign(): 1 | -1 {
  return Math.random() < 0.5 ? -1 : 1;
}

function makePaddle(cy: number): Paddle {
  return { cy, vy: 0, driven: false, drivenVy: 0 };
}

/**
 * Parks the ball at its home point: held, zero velocity and spin, empty trail,
 * `holdTimer` at HOLD_TIME, and a freshly drawn serve sign.
 */
export function makeParkedBall(): Ball {
  return {
    x: FIELD_CX,
    y: FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: HOLD_TIME,
    serveSign: drawServeSign(),
    trail: [],
  };
}

/** Parks the given ball in place, keeping the same object identity. */
export function parkBall(ball: Ball): void {
  ball.x = FIELD_CX;
  ball.y = FIELD_CY;
  ball.vx = 0;
  ball.vy = 0;
  ball.spin = 0;
  ball.held = true;
  ball.holdTimer = HOLD_TIME;
  ball.trail = [];
  ball.serveSign = drawServeSign();
}

export function makeObstacle(index: number): Obstacle {
  const [cx, cy] = OBSTACLE_CENTERS[index];
  return { index, cx, cy };
}

/** The complete title-screen state. */
export function createInitialState(muted: boolean): GameState {
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    paddles: { left: makePaddle(FIELD_CY), right: makePaddle(FIELD_CY) },
    ai: { tracking: true, movement: true },
    ball: makeParkedBall(),
    obstacles: [makeObstacle(0), makeObstacle(1)],
    simTime: 0,
    muted,
  };
}

/**
 * Restores every declared field to its title-screen value, keeping the fields
 * `specs/ui.md` says survive a return to title: `titleIndex`, `simTime`, and
 * `muted`. `menuIndex` becomes `titleIndex`. Used by "return to title".
 */
export function returnToTitle(state: GameState): void {
  const titleIndex = state.titleIndex;
  const simTime = state.simTime;
  const muted = state.muted;
  const fresh = createInitialState(muted);
  Object.assign(state, fresh);
  state.titleIndex = titleIndex;
  state.menuIndex = titleIndex;
  state.simTime = simTime;
  state.muted = muted;
}

/**
 * Starts a match in the given mode: countdown, scores zeroed, paddles centered,
 * ball parked and aimed at player one. `titleIndex` is preserved.
 */
export function startMatch(state: GameState, mode: GameState["mode"]): void {
  state.mode = mode;
  state.screen = "countdown";
  state.resumeScreen = "playing";
  state.menuIndex = 0;
  state.score = { p1: 0, p2: 0 };
  state.winner = null;
  state.receiver = "left";
  state.paddles.left.cy = FIELD_CY;
  state.paddles.left.vy = 0;
  state.paddles.right.cy = FIELD_CY;
  state.paddles.right.vy = 0;
  if (state.ball) {
    parkBall(state.ball);
  } else {
    state.ball = makeParkedBall();
  }
}

export function otherSide(side: Side): Side {
  return side === "left" ? "right" : "left";
}
