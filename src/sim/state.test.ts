import { describe, expect, it } from "vitest";
import {
  createInitialState,
  drawServeSign,
  makeObstacle,
  makeParkedBall,
  otherSide,
  parkBall,
  returnToTitle,
  startMatch,
} from "./state.js";
import { HOLD_TIME, OBSTACLE_CENTERS } from "../config.js";

describe("state", () => {
  it("creates the title state", () => {
    const s = createInitialState(true);
    expect(s.screen).toBe("title");
    expect(s.muted).toBe(true);
    expect(s.obstacles.length).toBe(2);
    expect(s.ball?.held).toBe(true);
  });

  it("draws a serve sign of +/-1", () => {
    for (let i = 0; i < 50; i++) expect([1, -1]).toContain(drawServeSign());
  });

  it("parks a ball at the home point", () => {
    const b = makeParkedBall();
    b.x = 10;
    b.vx = 99;
    b.held = false;
    parkBall(b);
    expect(b.x).toBe(640);
    expect(b.y).toBe(360);
    expect(b.vx).toBe(0);
    expect(b.held).toBe(true);
    expect(b.holdTimer).toBe(HOLD_TIME);
  });

  it("builds obstacles at their fixed centers", () => {
    const o = makeObstacle(1);
    expect([o.cx, o.cy]).toEqual([...OBSTACLE_CENTERS[1]]);
  });

  it("startMatch zeroes the score and begins a countdown", () => {
    const s = createInitialState(false);
    s.score = { p1: 5, p2: 1 };
    s.titleIndex = 2;
    startMatch(s, "versus");
    expect(s.screen).toBe("countdown");
    expect(s.mode).toBe("versus");
    expect(s.score).toEqual({ p1: 0, p2: 0 });
    expect(s.receiver).toBe("left");
    expect(s.titleIndex).toBe(2); // preserved
  });

  it("startMatch spawns a ball if one is missing", () => {
    const s = createInitialState(false);
    s.ball = null;
    startMatch(s, "solo");
    expect(s.ball).not.toBeNull();
  });

  it("returnToTitle preserves titleIndex, simTime and muted", () => {
    const s = createInitialState(false);
    s.screen = "matchover";
    s.titleIndex = 1;
    s.simTime = 42;
    s.muted = true;
    s.score = { p1: 9, p2: 3 };
    returnToTitle(s);
    expect(s.screen).toBe("title");
    expect(s.titleIndex).toBe(1);
    expect(s.menuIndex).toBe(1);
    expect(s.simTime).toBe(42);
    expect(s.muted).toBe(true);
    expect(s.score).toEqual({ p1: 0, p2: 0 });
  });

  it("otherSide flips the side", () => {
    expect(otherSide("left")).toBe("right");
    expect(otherSide("right")).toBe("left");
  });
});
