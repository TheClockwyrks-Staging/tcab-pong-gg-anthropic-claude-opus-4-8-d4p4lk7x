import { describe, expect, it } from "vitest";
import { FIELD_CY, HOLD_TIME, SERVE_SPEED, WIN_SCORE } from "../config.js";
import { createInitialState, makeParkedBall } from "./state.js";
import { update } from "./update.js";
import { noInput, hold } from "./testUtil.js";
import type { GameState } from "../types.js";

function freshPlaying(): GameState {
  const s = createInitialState(false);
  s.screen = "countdown";
  s.ball = makeParkedBall();
  s.ball.holdTimer = HOLD_TIME;
  return s;
}

describe("update: serving", () => {
  it("counts the hold timer down and serves toward the receiver", () => {
    const s = freshPlaying();
    s.receiver = "left";
    s.ball!.serveSign = 1;
    // Run enough frames to exhaust the hold.
    let served = false;
    for (let i = 0; i < 200 && !served; i++) {
      update(s, noInput(), 1 / 60);
      if (!s.ball!.held) served = true;
    }
    expect(served).toBe(true);
    expect(s.screen).toBe("playing");
    expect(s.ball!.vx).toBeLessThan(0); // toward left
    expect(s.ball!.vy).toBeGreaterThan(0); // serveSign 1
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(SERVE_SPEED, 3);
  });

  it("does not advance the ball on the frame it is served", () => {
    const s = freshPlaying();
    s.receiver = "right";
    s.ball!.holdTimer = 0.001;
    update(s, noInput(), 1 / 60);
    expect(s.ball!.held).toBe(false);
    expect(s.ball!.x).toBeCloseTo(640, 6);
    expect(s.ball!.y).toBeCloseTo(FIELD_CY, 6);
  });

  it("accumulates simTime on every screen", () => {
    const s = createInitialState(false);
    s.screen = "title";
    update(s, noInput(), 0.5);
    expect(s.simTime).toBeCloseTo(0.5, 6);
  });
});

describe("update: scoring", () => {
  it("awards player one a point when the ball exits the right edge", () => {
    const s = freshPlaying();
    s.screen = "playing";
    s.ball!.held = false;
    s.ball!.x = 1270;
    s.ball!.y = 360;
    s.ball!.vx = 2000;
    s.ball!.vy = 0;
    update(s, noInput(), 1 / 60);
    expect(s.score.p1).toBe(1);
    expect(s.screen).toBe("countdown");
    expect(s.receiver).toBe("right");
    expect(s.ball!.held).toBe(true);
  });

  it("ends the match when the win rule holds", () => {
    const s = freshPlaying();
    s.screen = "playing";
    s.score.p1 = WIN_SCORE - 1;
    s.score.p2 = 0;
    s.ball!.held = false;
    s.ball!.x = 1270;
    s.ball!.y = 360;
    s.ball!.vx = 2000;
    update(s, noInput(), 1 / 60);
    expect(s.score.p1).toBe(WIN_SCORE);
    expect(s.winner).toBe("left");
    expect(s.screen).toBe("matchover");
    expect(s.menuIndex).toBe(0);
  });

  it("continues play at deuce without a two-point lead", () => {
    const s = freshPlaying();
    s.screen = "playing";
    s.score.p1 = 10;
    s.score.p2 = 10;
    s.ball!.held = false;
    s.ball!.x = 1270;
    s.ball!.y = 360;
    s.ball!.vx = 2000;
    update(s, noInput(), 1 / 60);
    expect(s.score.p1).toBe(11);
    expect(s.winner).toBeNull();
    expect(s.screen).toBe("countdown");
  });
});

describe("update: paddles during countdown", () => {
  it("moves the human paddle on a countdown frame", () => {
    const s = freshPlaying();
    s.mode = "versus";
    const cy0 = s.paddles.left.cy;
    update(s, hold("p1-down"), 1 / 60);
    expect(s.paddles.left.cy).toBeGreaterThan(cy0);
  });
});

describe("update: trail", () => {
  it("records trail samples and drops old ones", () => {
    const s = freshPlaying();
    s.screen = "playing";
    s.ball!.held = false;
    s.ball!.x = 640;
    s.ball!.vx = 300;
    for (let i = 0; i < 60; i++) update(s, noInput(), 1 / 60);
    const trail = s.ball!.trail;
    expect(trail.length).toBeGreaterThan(0);
    const span = trail[trail.length - 1].t - trail[0].t;
    expect(span).toBeLessThanOrEqual(0.13 + 1 / 60 + 1e-6);
  });
});
