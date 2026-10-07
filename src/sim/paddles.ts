// Paddle movement: the single integration rule every mover shares, plus the
// per-mover velocity each uses before integrating.

import {
  AI_DEADZONE,
  AI_HOME_DEADZONE,
  AI_HOME_Y,
  AI_REACT,
  AI_SPEED,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
} from "../config.js";
import type { Ball, GameState, Paddle } from "../types.js";

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Integrates a paddle one frame from the velocity already set on it, applying
 * the clamp and the velocity-correction `specs/playfield.md` fixes. After this
 * the paddle's `vy` is its actual vertical velocity for the frame.
 */
export function integratePaddle(paddle: Paddle, dt: number): void {
  const raw = paddle.cy + paddle.vy * dt;
  const next = clamp(raw, PADDLE_MIN_CY, PADDLE_MAX_CY);
  if (next !== raw && dt > 0) {
    paddle.vy = (next - paddle.cy) / dt;
  }
  paddle.cy = next;
}

/** Human velocity from the two movement values: `vy = (down - up) * SPEED`. */
export function humanVy(up: number, down: number): number {
  const axis = down - up;
  return axis * PADDLE_SPEED;
}

/**
 * The AI's velocity for the right paddle, gated by its two faculties.
 * `specs/modes/single-player.md` states the rule; tracking and movement gate it
 * as `specs/instrumentation.md` states.
 */
export function aiVy(
  paddle: Paddle,
  ball: Ball | null,
  ai: GameState["ai"],
  screen: GameState["screen"],
  dt: number,
): number {
  if (!ai.movement) return 0;

  let target = AI_HOME_Y;
  let deadzone = AI_HOME_DEADZONE;
  if (
    ai.tracking &&
    screen === "playing" &&
    ball !== null &&
    !ball.held &&
    ball.vx > 0
  ) {
    target = ball.y - ball.vy * AI_REACT;
    deadzone = AI_DEADZONE;
  }

  const diff = target - paddle.cy;
  if (Math.abs(diff) <= deadzone) return 0;
  const magnitude = dt > 0 ? Math.min(AI_SPEED, Math.abs(diff) / dt) : AI_SPEED;
  return Math.sign(diff) * magnitude;
}
