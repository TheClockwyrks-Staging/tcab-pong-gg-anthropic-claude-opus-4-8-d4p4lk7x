import { describe, expect, it } from "vitest";
import {
  BALL_R,
  FIELD_H,
  OBSTACLE_CENTERS,
  P1_X1,
  P2_X0,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
} from "../config.js";
import { advanceBall } from "./ball.js";
import { createInitialState, makeParkedBall } from "./state.js";
import type { Cue, GameState } from "../types.js";

function playState(): GameState {
  const s = createInitialState(false);
  s.screen = "playing";
  s.ball = makeParkedBall();
  s.ball.held = false;
  return s;
}

function collectCues(): { sink: (c: Cue) => void; cues: Cue[] } {
  const cues: Cue[] = [];
  return { sink: (c) => cues.push(c), cues };
}

describe("ball physics", () => {
  it("reflects off the top wall, keeping speed", () => {
    const s = playState();
    const b = s.ball!;
    b.x = 640;
    b.y = BALL_R + 1;
    b.vx = 0;
    b.vy = -300;
    const speed0 = Math.hypot(b.vx, b.vy);
    const { sink, cues } = collectCues();
    advanceBall(b, s, 1 / 60, sink);
    expect(b.vy).toBeGreaterThan(0);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(speed0, 5);
    expect(cues).toContain("wall-bounce");
    expect(b.y).toBeGreaterThanOrEqual(BALL_R - 1e-6);
  });

  it("reflects off the bottom wall", () => {
    const s = playState();
    const b = s.ball!;
    b.x = 640;
    b.y = FIELD_H - BALL_R - 1;
    b.vx = 0;
    b.vy = 300;
    advanceBall(b, s, 1 / 60, () => {});
    expect(b.vy).toBeLessThan(0);
    expect(b.y).toBeLessThanOrEqual(FIELD_H - BALL_R + 1e-6);
  });

  it("bounces off the left paddle toward the right, bumping speed", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    const b = s.ball!;
    b.x = P1_X1 + BALL_R + 2;
    b.y = 360;
    b.vx = -400;
    b.vy = 0;
    const speed0 = Math.hypot(b.vx, b.vy);
    const { sink, cues } = collectCues();
    advanceBall(b, s, 1 / 60, sink);
    expect(b.vx).toBeGreaterThan(0);
    expect(cues).toContain("paddle-hit");
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(speed0 * SPEED_MULT, 3);
  });

  it("hitting the paddle center sends the ball straight across", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    const b = s.ball!;
    b.x = P1_X1 + BALL_R + 1;
    b.y = 360;
    b.vx = -500;
    b.vy = 0;
    advanceBall(b, s, 1 / 240, () => {});
    expect(Math.abs(b.vy)).toBeLessThan(1);
    expect(b.vx).toBeGreaterThan(0);
  });

  it("hitting the paddle top edge sends the ball upward", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    const b = s.ball!;
    b.x = P1_X1 + BALL_R + 1;
    b.y = 360 - 55; // top edge
    b.vx = -500;
    b.vy = 0;
    advanceBall(b, s, 1 / 240, () => {});
    expect(b.vy).toBeLessThan(0);
  });

  it("caps speed at SPEED_CAP on repeated paddle hits", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    const b = s.ball!;
    b.y = 360;
    b.vx = -SPEED_CAP;
    b.vy = 0;
    b.x = P1_X1 + BALL_R + 1;
    advanceBall(b, s, 1 / 240, () => {});
    expect(Math.hypot(b.vx, b.vy)).toBeLessThanOrEqual(SPEED_CAP + 1e-6);
  });

  it("adds positive spin when the left paddle moves downward", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    s.paddles.left.vy = 500;
    const b = s.ball!;
    b.x = P1_X1 + BALL_R + 1;
    b.y = 360;
    b.vx = -400;
    b.vy = 0;
    b.spin = 0;
    advanceBall(b, s, 1 / 240, () => {});
    expect(b.spin).toBeGreaterThan(0);
  });

  it("clamps spin to +/- SPIN_CLAMP", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    s.paddles.left.vy = 100000;
    const b = s.ball!;
    b.x = P1_X1 + BALL_R + 1;
    b.y = 360;
    b.vx = -400;
    b.vy = 0;
    advanceBall(b, s, 1 / 240, () => {});
    expect(b.spin).toBeLessThanOrEqual(SPIN_CLAMP + 1e-6);
  });

  it("bounces off an obstacle without changing speed", () => {
    const s = playState();
    const [cx, cy] = OBSTACLE_CENTERS[0];
    const b = s.ball!;
    b.x = cx - 10 - BALL_R - 1;
    b.y = cy;
    b.vx = 400;
    b.vy = 0;
    b.spin = 0;
    const speed0 = Math.hypot(b.vx, b.vy);
    const { sink, cues } = collectCues();
    advanceBall(b, s, 1 / 120, sink);
    expect(b.vx).toBeLessThan(0);
    expect(cues).toContain("obstacle-bounce");
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(speed0, 5);
  });

  it("spin curves the direction of travel clockwise for positive spin", () => {
    const s = playState();
    const b = s.ball!;
    b.x = 640;
    b.y = 100;
    b.vx = 400;
    b.vy = 0;
    b.spin = 800;
    advanceBall(b, s, 0.05, () => {});
    // Positive spin turns +x toward +y (downward on screen).
    expect(b.vy).toBeGreaterThan(0);
  });

  it("the right paddle sends the ball toward the left", () => {
    const s = playState();
    s.paddles.right.cy = 360;
    const b = s.ball!;
    b.x = P2_X0 - BALL_R - 1;
    b.y = 360;
    b.vx = 400;
    b.vy = 0;
    advanceBall(b, s, 1 / 240, () => {});
    expect(b.vx).toBeLessThan(0);
  });

  it("keeps the ball out of the paddle after a fast hit", () => {
    const s = playState();
    s.paddles.left.cy = 360;
    const b = s.ball!;
    b.x = P1_X1 + BALL_R + 1;
    b.y = 360;
    b.vx = -SPEED_CAP;
    b.vy = 0;
    advanceBall(b, s, 1 / 60, () => {});
    expect(b.x).toBeGreaterThanOrEqual(P1_X1 + BALL_R - 1e-6);
  });
});
