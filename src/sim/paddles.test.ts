import { describe, expect, it } from "vitest";
import { PADDLE_MAX_CY, PADDLE_MIN_CY, PADDLE_SPEED } from "../config.js";
import { aiVy, humanVy, integratePaddle } from "./paddles.js";
import type { Paddle } from "../types.js";

function paddle(cy: number): Paddle {
  return { cy, vy: 0, driven: false, drivenVy: 0 };
}

describe("paddle movement", () => {
  it("human velocity is (down - up) * PADDLE_SPEED", () => {
    expect(humanVy(1, 0)).toBe(-PADDLE_SPEED);
    expect(humanVy(0, 1)).toBe(PADDLE_SPEED);
    expect(humanVy(1, 1)).toBe(0);
    expect(humanVy(0, 0)).toBe(0);
  });

  it("integrates and clamps to the lower bound, zeroing vy at the bound", () => {
    const p = paddle(PADDLE_MIN_CY + 1);
    p.vy = -PADDLE_SPEED;
    integratePaddle(p, 1 / 60);
    expect(p.cy).toBe(PADDLE_MIN_CY);
    // Clamp changed the value, so vy becomes the corrected velocity.
    expect(p.vy).toBeCloseTo(
      (PADDLE_MIN_CY - (PADDLE_MIN_CY + 1)) / (1 / 60),
      5,
    );
  });

  it("a paddle pinned against a bound carries vy = 0 while held into it", () => {
    const p = paddle(PADDLE_MIN_CY);
    p.vy = -PADDLE_SPEED;
    integratePaddle(p, 1 / 60);
    expect(p.cy).toBe(PADDLE_MIN_CY);
    expect(p.vy).toBe(0);
  });

  it("clamps to the upper bound", () => {
    const p = paddle(PADDLE_MAX_CY - 1);
    p.vy = PADDLE_SPEED;
    integratePaddle(p, 1 / 60);
    expect(p.cy).toBe(PADDLE_MAX_CY);
  });

  it("moves freely in-bounds leaving vy unchanged", () => {
    const p = paddle(360);
    p.vy = PADDLE_SPEED;
    integratePaddle(p, 1 / 60);
    expect(p.cy).toBeCloseTo(360 + PADDLE_SPEED / 60, 5);
    expect(p.vy).toBe(PADDLE_SPEED);
  });
});

describe("AI", () => {
  const ai = { tracking: true, movement: true };

  it("returns home when the ball travels away", () => {
    const p = paddle(200);
    const vy = aiVy(
      p,
      {
        x: 640,
        y: 360,
        vx: -400,
        vy: 0,
        spin: 0,
        held: false,
        holdTimer: 0,
        serveSign: 1,
        trail: [],
      },
      ai,
      "playing",
      1 / 60,
    );
    expect(vy).toBeGreaterThan(0); // moves down toward AI_HOME_Y = 360
  });

  it("tracks the ball when it approaches", () => {
    const p = paddle(360);
    const vy = aiVy(
      p,
      {
        x: 640,
        y: 600,
        vx: 400,
        vy: 0,
        spin: 0,
        held: false,
        holdTimer: 0,
        serveSign: 1,
        trail: [],
      },
      ai,
      "playing",
      1 / 60,
    );
    expect(vy).toBeGreaterThan(0); // moves down toward the ball
  });

  it("holds still when movement is disabled", () => {
    const p = paddle(100);
    const vy = aiVy(
      p,
      {
        x: 640,
        y: 600,
        vx: 400,
        vy: 0,
        spin: 0,
        held: false,
        holdTimer: 0,
        serveSign: 1,
        trail: [],
      },
      { tracking: true, movement: false },
      "playing",
      1 / 60,
    );
    expect(vy).toBe(0);
  });

  it("ignores the ball when tracking is disabled, returning home", () => {
    const p = paddle(100);
    const vy = aiVy(
      p,
      {
        x: 640,
        y: 600,
        vx: 400,
        vy: 0,
        spin: 0,
        held: false,
        holdTimer: 0,
        serveSign: 1,
        trail: [],
      },
      { tracking: false, movement: true },
      "playing",
      1 / 60,
    );
    expect(vy).toBeGreaterThan(0); // toward home at 360, not the ball at 600
  });

  it("stays within the home deadzone", () => {
    const p = paddle(365);
    const vy = aiVy(p, null, ai, "playing", 1 / 60);
    expect(vy).toBe(0);
  });
});
