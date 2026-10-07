// The top-level per-frame update: reads input, runs menus, moves paddles,
// advances and serves the ball, scores points, and records the trail. All cues
// raised during the frame are collected and emitted once each at the end.

import {
  FIELD_W,
  HOLD_TIME,
  SERVE_ANGLE,
  SERVE_SPEED,
  TRAIL_TIME,
  WIN_LEAD,
  WIN_SCORE,
} from "../config.js";
import type {
  Ball,
  Cue,
  GameState,
  InputActions,
  MenuEdges,
  PointerEvent2D,
  Side,
} from "../types.js";
import { advanceBall } from "./ball.js";
import { applyMenu } from "./menu.js";
import { aiVy, humanVy, integratePaddle } from "./paddles.js";
import { otherSide, parkBall } from "./state.js";

export interface FrameInput {
  actions: InputActions;
  edges: MenuEdges;
  pointer: PointerEvent2D;
}

/**
 * Moves both paddles one frame. Each paddle takes its velocity from its driver
 * (driven override, else player input, else — for the right paddle in solo — the
 * AI) and is then integrated and clamped the one shared way.
 */
function movePaddles(
  state: GameState,
  actions: InputActions,
  dt: number,
): void {
  const left = state.paddles.left;
  if (left.driven) {
    left.vy = left.drivenVy;
  } else if (state.mode === "solo") {
    left.vy = humanVy(
      Math.max(actions["p1-up"], actions["p2-up"]),
      Math.max(actions["p1-down"], actions["p2-down"]),
    );
  } else {
    left.vy = humanVy(actions["p1-up"], actions["p1-down"]);
  }
  integratePaddle(left, dt);

  const right = state.paddles.right;
  if (right.driven) {
    right.vy = right.drivenVy;
  } else if (state.mode === "solo") {
    right.vy = aiVy(right, state.ball, state.ai, state.screen, dt);
  } else {
    right.vy = humanVy(actions["p2-up"], actions["p2-down"]);
  }
  integratePaddle(right, dt);
}

/** Serves the ball toward `receiver` at the serve angle. */
function serveBall(ball: Ball, receiver: Side): void {
  ball.holdTimer = 0;
  ball.held = false;
  ball.trail = [];
  const dir = receiver === "left" ? -1 : 1;
  ball.vx = dir * SERVE_SPEED * Math.cos(SERVE_ANGLE);
  ball.vy = ball.serveSign * SERVE_SPEED * Math.sin(SERVE_ANGLE);
}

/** True when the win rule holds for `scorer`. */
function winRuleHolds(state: GameState, scorer: Side): boolean {
  const { p1, p2 } = state.score;
  if (scorer === "left") return p1 >= WIN_SCORE && p1 - p2 >= WIN_LEAD;
  return p2 >= WIN_SCORE && p2 - p1 >= WIN_LEAD;
}

/** Appends a trail sample and drops any older than TRAIL_TIME. */
function recordTrail(ball: Ball, simTime: number): void {
  ball.trail.push({ x: ball.x, y: ball.y, t: simTime });
  const cutoff = simTime - TRAIL_TIME;
  let i = 0;
  while (i < ball.trail.length && ball.trail[i].t < cutoff) i++;
  if (i > 0) ball.trail.splice(0, i);
}

/**
 * Handles scoring after the ball has been advanced and resolved. Returns true
 * if a point was scored this frame.
 */
function handleScoring(state: GameState, cues: Set<Cue>): boolean {
  const ball = state.ball;
  if (!ball) return false;
  let scorer: Side | null = null;
  if (ball.x - 11 > FIELD_W)
    scorer = "left"; // BALL_R = 11
  else if (ball.x + 11 < 0) scorer = "right";
  if (!scorer) return false;

  if (scorer === "left") state.score.p1 += 1;
  else state.score.p2 += 1;
  cues.add("score");

  if (winRuleHolds(state, scorer)) {
    state.winner = scorer;
    state.screen = "matchover";
    state.menuIndex = 0;
  } else {
    parkBall(ball);
    state.receiver = otherSide(scorer);
    ball.holdTimer = HOLD_TIME;
    state.screen = "countdown";
  }
  return true;
}

/**
 * Advances one frame. `dt` is the elapsed simulation time. Returns the set of
 * cues to play this frame (each at most once).
 */
export function update(
  state: GameState,
  input: FrameInput,
  dt: number,
): Set<Cue> {
  const cues = new Set<Cue>();

  // simTime accumulates on every update, whatever the screen.
  state.simTime += dt;

  // Input (menus) is read first, on the screen the update began on.
  applyMenu(state, input);

  const screen = state.screen;
  if (screen === "countdown" || screen === "playing") {
    movePaddles(state, input.actions, dt);
  }

  if (screen === "countdown") {
    const ball = state.ball;
    if (ball && ball.held) {
      ball.holdTimer -= dt;
      if (ball.holdTimer <= 0) {
        serveBall(ball, state.receiver);
        state.screen = "playing";
      }
    }
    if (ball) recordTrail(ball, state.simTime);
  } else if (screen === "playing") {
    const ball = state.ball;
    if (ball && !ball.held) {
      const sink = (cue: Cue): void => {
        cues.add(cue);
      };
      advanceBall(ball, state, dt, sink);
      handleScoring(state, cues);
    }
    if (state.ball) recordTrail(state.ball, state.simTime);
  }

  return cues;
}
