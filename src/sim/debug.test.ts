import { describe, expect, it, vi } from "vitest";
import { createDebugSurface } from "../debug.js";
import { createInitialState } from "./state.js";
import { CAROM_DEBUG_VERSION } from "../config.js";

function make() {
  const state = createInitialState(false);
  let autoStep = true;
  const advance = vi.fn();
  const setMuted = vi.fn();
  const surface = createDebugSurface({
    state,
    setAutoStep: (e) => {
      autoStep = e;
    },
    isAutoStep: () => autoStep,
    advance,
    setMuted,
  });
  return { state, surface, advance, setMuted };
}

describe("debug surface", () => {
  it("reports its version", () => {
    const { surface } = make();
    expect(surface.version).toBe(CAROM_DEBUG_VERSION);
    expect(surface.snapshot().version).toBe(CAROM_DEBUG_VERSION);
  });

  it("snapshots the live state including derived ball speed", () => {
    const { surface } = make();
    surface.setBallVelocity(30, 40);
    const snap = surface.snapshot();
    expect(snap.ball?.speed).toBeCloseTo(50, 6);
  });

  it("poses screen, mode, menu and match fields", () => {
    const { surface, state } = make();
    surface.setScreen("paused");
    surface.setMode("versus");
    surface.setMenuIndex(2);
    surface.setTitleIndex(1);
    surface.setResumeScreen("countdown");
    surface.setScore(3, 4);
    surface.setWinner("right");
    surface.setReceiver("left");
    expect(state.screen).toBe("paused");
    expect(state.mode).toBe("versus");
    expect(state.menuIndex).toBe(2);
    expect(state.titleIndex).toBe(1);
    expect(state.resumeScreen).toBe("countdown");
    expect(state.score).toEqual({ p1: 3, p2: 4 });
    expect(state.winner).toBe("right");
    expect(state.receiver).toBe("left");
  });

  it("poses paddles independently", () => {
    const { surface, state } = make();
    surface.setPaddleCy("left", 120);
    surface.setPaddleVy("left", 200);
    surface.setPaddleDriven("left", true);
    expect(state.paddles.left.cy).toBe(120);
    expect(state.paddles.left.drivenVy).toBe(200);
    expect(state.paddles.left.driven).toBe(true);
    expect(state.paddles.right.driven).toBe(false);
  });

  it("poses the ball and draws a serve sign", () => {
    const { surface, state } = make();
    surface.setBallPosition(100, 200);
    surface.setBallVelocity(-50, 60);
    surface.setBallSpin(123);
    surface.setBallHeld(false);
    surface.setBallHoldTimer(0.4);
    surface.setBallServeSign(-1);
    expect(state.ball?.x).toBe(100);
    expect(state.ball?.y).toBe(200);
    expect(state.ball?.spin).toBe(123);
    expect(state.ball?.held).toBe(false);
    expect(state.ball?.holdTimer).toBe(0.4);
    expect(state.ball?.serveSign).toBe(-1);
    surface.drawBallServeSign();
    expect([1, -1]).toContain(state.ball?.serveSign);
  });

  it("rejects an invalid serve sign", () => {
    const { surface } = make();
    expect(() => surface.setBallServeSign(2 as 1)).toThrow();
  });

  it("throws when posing the ball with none present", () => {
    const { surface } = make();
    surface.clearWorld();
    expect(() => surface.setBallSpin(1)).toThrow();
  });

  it("clears and repopulates the world", () => {
    const { surface, state } = make();
    surface.clearWorld();
    expect(state.ball).toBeNull();
    expect(state.obstacles).toEqual([]);
    surface.spawnBall();
    expect(state.ball).not.toBeNull();
    surface.spawnObstacle(1);
    surface.spawnObstacle(0);
    expect(state.obstacles.map((o) => o.index)).toEqual([0, 1]);
    // Re-spawning an existing obstacle resets it rather than duplicating.
    surface.spawnObstacle(0);
    expect(state.obstacles.length).toBe(2);
  });

  it("rejects an unknown obstacle index", () => {
    const { surface } = make();
    expect(() => surface.spawnObstacle(5)).toThrow();
  });

  it("poses the AI faculties", () => {
    const { surface, state } = make();
    surface.setAiTracking(false);
    surface.setAiMovement(false);
    expect(state.ai).toEqual({ tracking: false, movement: false });
  });

  it("drives the clock through its deps", () => {
    const { surface, advance } = make();
    surface.setAutoStep(false);
    expect(surface.snapshot().autoStep).toBe(false);
    surface.advance(0.016, 1);
    expect(advance).toHaveBeenCalledWith(0.016, 1);
  });

  it("mirrors the mute bit into state", () => {
    const { surface, state, setMuted } = make();
    surface.setMuted(true);
    expect(setMuted).toHaveBeenCalledWith(true);
    expect(state.muted).toBe(true);
  });

  it("resets to the title state", () => {
    const { surface, state } = make();
    surface.setScreen("matchover");
    surface.setScore(9, 2);
    surface.setTitleIndex(2);
    surface.reset();
    expect(state.screen).toBe("title");
    expect(state.score).toEqual({ p1: 0, p2: 0 });
    expect(state.titleIndex).toBe(0);
    expect(state.obstacles.length).toBe(2);
    expect(state.simTime).toBe(0);
  });

  it("reports menu item rects for the current screen", () => {
    const { surface } = make();
    surface.setScreen("title");
    expect(surface.menuItemRect(0)).not.toBeNull();
    expect(surface.menuItemRect(9)).toBeNull();
  });

  it("reconcile is a no-op that does not throw", () => {
    const { surface } = make();
    expect(() => surface.reconcile()).not.toThrow();
  });
});
