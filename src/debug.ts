// The `window.__carom` debugging and automation surface. Every operation is a
// reading or a pose of the running game; the game's own update then runs the real
// collisions and AI from there. The surface is inert until something calls it.

import { CAROM_DEBUG_VERSION, OBSTACLE_CENTERS } from "./config.js";
import type { GameState, Side } from "./types.js";
import { menuItemRect } from "./sim/menuLayout.js";
import { drawServeSign, makeObstacle, makeParkedBall } from "./sim/state.js";

export interface DebugDeps {
  state: GameState;
  /** Takes the clock off/onto real time. */
  setAutoStep: (enabled: boolean) => void;
  isAutoStep: () => boolean;
  /** Runs whole frames covering `seconds`, through the real loop. */
  advance: (seconds: number, frames?: number) => void;
  /** Sets the audio mute bit (mirrored into state each frame). */
  setMuted: (muted: boolean) => void;
}

function fail(message: string): never {
  throw new Error(`__carom: ${message}`);
}

function requireBall(state: GameState) {
  if (!state.ball) fail("no ball on the playfield");
  return state.ball;
}

function paddle(state: GameState, side: Side) {
  return side === "left" ? state.paddles.left : state.paddles.right;
}

/** Builds the surface object installed on `window.__carom`. */
export function createDebugSurface(deps: DebugDeps) {
  const { state } = deps;

  const snapshot = () => {
    const ball = state.ball;
    return {
      version: CAROM_DEBUG_VERSION,
      screen: state.screen,
      mode: state.mode,
      menuIndex: state.menuIndex,
      titleIndex: state.titleIndex,
      resumeScreen: state.resumeScreen,
      score: { p1: state.score.p1, p2: state.score.p2 },
      winner: state.winner,
      muted: state.muted,
      paddles: {
        left: {
          cy: state.paddles.left.cy,
          vy: state.paddles.left.vy,
          drivenVy: state.paddles.left.drivenVy,
          driven: state.paddles.left.driven,
        },
        right: {
          cy: state.paddles.right.cy,
          vy: state.paddles.right.vy,
          drivenVy: state.paddles.right.drivenVy,
          driven: state.paddles.right.driven,
        },
      },
      ai: { tracking: state.ai.tracking, movement: state.ai.movement },
      receiver: state.receiver,
      ball: ball
        ? {
            x: ball.x,
            y: ball.y,
            vx: ball.vx,
            vy: ball.vy,
            speed: Math.hypot(ball.vx, ball.vy),
            spin: ball.spin,
            held: ball.held,
            holdTimer: ball.holdTimer,
            serveSign: ball.serveSign,
            trail: ball.trail.map((s) => ({ x: s.x, y: s.y, t: s.t })),
          }
        : null,
      obstacles: state.obstacles.map((o) => ({
        index: o.index,
        cx: o.cx,
        cy: o.cy,
      })),
      autoStep: deps.isAutoStep(),
      simTime: state.simTime,
    };
  };

  return {
    version: CAROM_DEBUG_VERSION,

    // --- The clock ---
    setAutoStep(enabled: boolean): void {
      deps.setAutoStep(!!enabled);
    },
    advance(seconds: number, frames = 1): void {
      deps.advance(seconds, frames);
    },

    // --- The world ---
    clearWorld(): void {
      state.ball = null;
      state.obstacles = [];
    },
    spawnBall(): void {
      state.ball = makeParkedBall();
    },
    spawnObstacle(index: number): void {
      if (index !== 0 && index !== 1) fail(`no obstacle with index ${index}`);
      const existing = state.obstacles.find((o) => o.index === index);
      if (existing) {
        const [cx, cy] = OBSTACLE_CENTERS[index];
        existing.cx = cx;
        existing.cy = cy;
      } else {
        state.obstacles.push(makeObstacle(index));
        state.obstacles.sort((a, b) => a.index - b.index);
      }
    },
    reset(): void {
      // Restore every declared field to its title-screen value. muted and
      // autoStep are left as they are, per the spec.
      state.screen = "title";
      state.mode = "solo";
      state.menuIndex = 0;
      state.titleIndex = 0;
      state.resumeScreen = "playing";
      state.score = { p1: 0, p2: 0 };
      state.winner = null;
      state.receiver = "left";
      state.paddles.left.cy = 360;
      state.paddles.left.vy = 0;
      state.paddles.left.drivenVy = 0;
      state.paddles.left.driven = false;
      state.paddles.right.cy = 360;
      state.paddles.right.vy = 0;
      state.paddles.right.drivenVy = 0;
      state.paddles.right.driven = false;
      state.ai.tracking = true;
      state.ai.movement = true;
      state.ball = makeParkedBall();
      state.obstacles = [makeObstacle(0), makeObstacle(1)];
      state.simTime = 0;
    },
    reconcile(): void {
      // `speed` is derived at the read, so there is nothing stored to refresh.
    },

    // --- Screens and menus ---
    setScreen(screen: GameState["screen"]): void {
      state.screen = screen;
    },
    setMode(mode: GameState["mode"]): void {
      state.mode = mode;
    },
    setMenuIndex(index: number): void {
      state.menuIndex = index;
    },
    setTitleIndex(index: number): void {
      state.titleIndex = index;
    },
    setResumeScreen(screen: "countdown" | "playing"): void {
      state.resumeScreen = screen;
    },

    // --- Match state ---
    setScore(p1: number, p2: number): void {
      state.score = { p1, p2 };
    },
    setWinner(side: Side | null): void {
      state.winner = side;
    },
    setReceiver(side: Side): void {
      state.receiver = side;
    },

    // --- Paddles ---
    setPaddleCy(side: Side, cy: number): void {
      paddle(state, side).cy = cy;
    },
    setPaddleVy(side: Side, vy: number): void {
      paddle(state, side).drivenVy = vy;
    },
    setPaddleDriven(side: Side, driven: boolean): void {
      paddle(state, side).driven = !!driven;
    },

    // --- The ball ---
    setBallPosition(x: number, y: number): void {
      const ball = requireBall(state);
      ball.x = x;
      ball.y = y;
    },
    setBallVelocity(vx: number, vy: number): void {
      const ball = requireBall(state);
      ball.vx = vx;
      ball.vy = vy;
    },
    setBallSpin(spin: number): void {
      requireBall(state).spin = spin;
    },
    setBallHeld(held: boolean): void {
      requireBall(state).held = !!held;
    },
    setBallHoldTimer(seconds: number): void {
      requireBall(state).holdTimer = seconds;
    },
    setBallServeSign(sign: 1 | -1): void {
      const ball = requireBall(state);
      if (sign !== 1 && sign !== -1) fail(`serveSign must be 1 or -1`);
      ball.serveSign = sign;
    },
    drawBallServeSign(): void {
      requireBall(state).serveSign = drawServeSign();
    },

    // --- The AI ---
    setAiTracking(enabled: boolean): void {
      state.ai.tracking = !!enabled;
    },
    setAiMovement(enabled: boolean): void {
      state.ai.movement = !!enabled;
    },

    // --- Audio ---
    setMuted(muted: boolean): void {
      deps.setMuted(!!muted);
      state.muted = !!muted;
    },

    // --- Readings ---
    snapshot,
    menuItemRect(index: number) {
      return menuItemRect(state.screen, index);
    },
  };
}

export type DebugSurface = ReturnType<typeof createDebugSurface>;
