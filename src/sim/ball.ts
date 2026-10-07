// Ball physics: sub-stepped integration, spin, collisions against walls,
// paddles, and obstacles, and the paddle bounce. Collisions raise named cues
// through the sink passed in, so audio stays out of the pure core.

import {
  BALL_R,
  FIELD_H,
  MAX_BOUNCE_ANGLE,
  MAX_SUBSTEP,
  OBSTACLE_HH,
  OBSTACLE_HW,
  P1_X0,
  P1_X1,
  P2_X0,
  P2_X1,
  PADDLE_H,
  PADDLE_HALF,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
  SPIN_FROM_PADDLE,
  SPIN_HALFLIFE,
} from "../config.js";
import type { Ball, Cue, GameState, Obstacle } from "../types.js";

export type CueSink = (cue: Cue) => void;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** The outcome of resolving a circle against an axis-aligned rectangle. */
type Face = "left" | "right" | "top" | "bottom" | null;

/**
 * Resolves the ball against an axis-aligned rectangle [x0,x1]x[y0,y1] using the
 * expanded-rectangle rule, returning the struck face or null for no overlap.
 * Mutates the ball's position and the normal velocity component as specified.
 */
function resolveRect(
  ball: Ball,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): Face {
  const ex0 = x0 - BALL_R;
  const ex1 = x1 + BALL_R;
  const ey0 = y0 - BALL_R;
  const ey1 = y1 + BALL_R;
  if (ball.x <= ex0 || ball.x >= ex1 || ball.y <= ey0 || ball.y >= ey1) {
    return null;
  }

  const left = ball.x - ex0;
  const right = ex1 - ball.x;
  const top = ball.y - ey0;
  const bottom = ey1 - ball.y;

  // Smallest depth wins; ties resolve left, right, top, bottom in order.
  let face: Face = "left";
  let min = left;
  if (right < min) {
    min = right;
    face = "right";
  }
  if (top < min) {
    min = top;
    face = "top";
  }
  if (bottom < min) {
    face = "bottom";
  }

  switch (face) {
    case "left":
      ball.x = x0 - BALL_R;
      if (ball.vx > 0) ball.vx = -ball.vx;
      break;
    case "right":
      ball.x = x1 + BALL_R;
      if (ball.vx < 0) ball.vx = -ball.vx;
      break;
    case "top":
      ball.y = y0 - BALL_R;
      if (ball.vy > 0) ball.vy = -ball.vy;
      break;
    case "bottom":
      ball.y = y1 + BALL_R;
      if (ball.vy < 0) ball.vy = -ball.vy;
      break;
  }
  return face;
}

/** Resolves the walls: top first, then bottom. Returns true if one bounced. */
function resolveWalls(ball: Ball): boolean {
  if (ball.y - BALL_R < 0 && ball.vy < 0) {
    ball.y = BALL_R;
    ball.vy = -ball.vy;
    return true;
  }
  if (ball.y + BALL_R > FIELD_H && ball.vy > 0) {
    ball.y = FIELD_H - BALL_R;
    ball.vy = -ball.vy;
    return true;
  }
  return false;
}

/** The paddle bounce: reflection angle, speed bump, and spin from motion. */
function paddleBounce(
  ball: Ball,
  dir: 1 | -1,
  frontFace: number,
  paddleCy: number,
  paddleVy: number,
): void {
  const offset = clamp((ball.y - paddleCy) / PADDLE_HALF, -1, 1);
  const theta = offset * MAX_BOUNCE_ANGLE;
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * SPEED_MULT, SPEED_CAP);
  ball.vx = dir * speed * Math.cos(theta);
  ball.vy = speed * Math.sin(theta);
  ball.spin = clamp(
    ball.spin + paddleVy * SPIN_FROM_PADDLE,
    -SPIN_CLAMP,
    SPIN_CLAMP,
  );
  ball.x = frontFace + dir * BALL_R;
}

/**
 * Resolves the ball against one paddle. A left/right face contact is a paddle
 * hit (bounce + spin, `paddle-hit`); a top/bottom contact is an end cap, resolved
 * like a wall (`wall-bounce`). Returns true if any contact occurred.
 */
function resolvePaddle(
  ball: Ball,
  side: "left" | "right",
  cy: number,
  vy: number,
  cue: CueSink,
): boolean {
  const x0 = side === "left" ? P1_X0 : P2_X0;
  const x1 = side === "left" ? P1_X1 : P2_X1;
  const y0 = cy - PADDLE_H / 2;
  const y1 = cy + PADDLE_H / 2;
  const face = resolveRect(ball, x0, x1, y0, y1);
  if (face === null) return false;

  if (face === "left" || face === "right") {
    // A paddle hit: the field-facing face is P1_X1 (left) / P2_X0 (right).
    const dir: 1 | -1 = side === "left" ? 1 : -1;
    const front = side === "left" ? x1 : x0;
    paddleBounce(ball, dir, front, cy, vy);
    cue("paddle-hit");
  } else {
    // End cap: resolveRect already reflected vy and placed the ball.
    cue("wall-bounce");
  }
  return true;
}

function resolveObstacle(
  ball: Ball,
  obstacle: Obstacle,
  cue: CueSink,
): boolean {
  const x0 = obstacle.cx - OBSTACLE_HW;
  const x1 = obstacle.cx + OBSTACLE_HW;
  const y0 = obstacle.cy - OBSTACLE_HH;
  const y1 = obstacle.cy + OBSTACLE_HH;
  const face = resolveRect(ball, x0, x1, y0, y1);
  if (face === null) return false;
  cue("obstacle-bounce");
  return true;
}

/** One physics sub-step over `h` seconds. */
function substep(ball: Ball, state: GameState, h: number, cue: CueSink): void {
  // 1. Spin turns the velocity.
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 0) {
    const angle = (ball.spin / speed) * h;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nvx = ball.vx * cos - ball.vy * sin;
    const nvy = ball.vx * sin + ball.vy * cos;
    ball.vx = nvx;
    ball.vy = nvy;
  }

  // 2. Spin decays.
  ball.spin *= Math.pow(0.5, h / SPIN_HALFLIFE);

  // 3. Advance.
  ball.x += ball.vx * h;
  ball.y += ball.vy * h;

  // 4. Resolve collisions in order: walls, left paddle, right paddle, A, B.
  if (resolveWalls(ball)) cue("wall-bounce");
  resolvePaddle(
    ball,
    "left",
    state.paddles.left.cy,
    state.paddles.left.vy,
    cue,
  );
  resolvePaddle(
    ball,
    "right",
    state.paddles.right.cy,
    state.paddles.right.vy,
    cue,
  );
  for (const obstacle of state.obstacles) {
    resolveObstacle(ball, obstacle, cue);
  }
}

/**
 * Advances the ball one frame over `dt`, in sub-steps sized from its speed. The
 * cue sink is called once per raising event (deduplicated per frame by the
 * caller if required by the spec; this fires once per sub-step event).
 */
export function advanceBall(
  ball: Ball,
  state: GameState,
  dt: number,
  cue: CueSink,
): void {
  const speed = Math.hypot(ball.vx, ball.vy);
  const n = Math.max(1, Math.ceil((speed * dt) / MAX_SUBSTEP));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    substep(ball, state, h, cue);
  }
}
