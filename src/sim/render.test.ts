import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { clearBackground, renderGame } from "../render.js";
import { createInitialState, makeParkedBall } from "./state.js";
import type { GameState, Screen } from "../types.js";

function ctx() {
  const canvas = createCanvas(1280, 720);
  return canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
}

function sampleState(screen: Screen): GameState {
  const s = createInitialState(false);
  s.screen = screen;
  s.ball = makeParkedBall();
  s.ball.held = screen === "countdown";
  s.ball.trail = [
    { x: 100, y: 100, t: s.simTime - 0.01 },
    { x: 120, y: 110, t: s.simTime },
  ];
  s.score = { p1: 3, p2: 5 };
  s.winner = "left";
  return s;
}

describe("renderer", () => {
  const screens: Screen[] = [
    "title",
    "howto",
    "playing",
    "countdown",
    "paused",
    "matchover",
  ];

  for (const screen of screens) {
    it(`draws the ${screen} screen without throwing`, () => {
      const c = ctx();
      expect(() => renderGame(c, sampleState(screen))).not.toThrow();
    });
  }

  it("draws the matchover screen for a right-side winner in versus", () => {
    const c = ctx();
    const s = sampleState("matchover");
    s.mode = "versus";
    s.winner = "right";
    expect(() => renderGame(c, s)).not.toThrow();
  });

  it("draws the matchover screen for a right-side winner in solo", () => {
    const c = ctx();
    const s = sampleState("matchover");
    s.mode = "solo";
    s.winner = "right";
    expect(() => renderGame(c, s)).not.toThrow();
  });

  it("renders with no ball present", () => {
    const c = ctx();
    const s = sampleState("playing");
    s.ball = null;
    expect(() => renderGame(c, s)).not.toThrow();
  });

  it("clears the background across the whole canvas", () => {
    const c = ctx();
    expect(() => clearBackground(c, 1600, 900)).not.toThrow();
  });
});
