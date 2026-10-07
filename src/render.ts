// The renderer. Everything is drawn in the field's logical units; the caller sets
// up the fit transform (translate + scale) and the device pixel ratio before
// calling `renderGame`. Every shape here is drawn in code — no assets.

import {
  BALL_R,
  FIELD_CX,
  FIELD_H,
  FIELD_W,
  MATCHOVER_ITEMS,
  NET_X,
  OBSTACLE_H,
  OBSTACLE_W,
  PADDLE_H,
  PADDLE_W,
  PAUSE_ITEMS,
  P1_X0,
  P2_X0,
  TITLE_ITEMS,
  TITLE_TEXT,
  TRAIL_TIME,
} from "./config.js";
import type { GameState } from "./types.js";
import { menuItemRect } from "./sim/menuLayout.js";

// --- Palette -------------------------------------------------------------
const COL_BG = "#0b1020";
const COL_FIELD_EDGE = "#1a2138";
const COL_NET = "#2a3350";
const COL_P1 = "#38e8ff"; // cyan — player one
const COL_P2 = "#ff5d8f"; // magenta — player two / AI
const COL_BALL = "#ffe66d"; // warm yellow
const COL_OBSTACLE = "#9d7bff"; // violet
const COL_TEXT = "#e8ecff";
const COL_TEXT_DIM = "#6b7694";
const COL_HILITE = "#ffe66d";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function glowBody(
  ctx: CanvasRenderingContext2D,
  color: string,
  draw: () => void,
  blur = 18,
): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  draw();
  ctx.restore();
}

/** Fills the whole canvas (including the letterbox) with the field background. */
export function clearBackground(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
): void {
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawFieldFrame(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.strokeStyle = COL_FIELD_EDGE;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, FIELD_W - 4, FIELD_H - 4);
}

function drawNet(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = COL_NET;
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 18]);
  ctx.beginPath();
  ctx.moveTo(NET_X, 10);
  ctx.lineTo(NET_X, FIELD_H - 10);
  ctx.stroke();
  ctx.restore();
}

function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const o of state.obstacles) {
    glowBody(ctx, COL_OBSTACLE, () => {
      roundRect(
        ctx,
        o.cx - OBSTACLE_W / 2,
        o.cy - OBSTACLE_H / 2,
        OBSTACLE_W,
        OBSTACLE_H,
        8,
      );
      ctx.fill();
    });
  }
}

function drawPaddle(
  ctx: CanvasRenderingContext2D,
  x0: number,
  cy: number,
  color: string,
): void {
  glowBody(ctx, color, () => {
    roundRect(ctx, x0, cy - PADDLE_H / 2, PADDLE_W, PADDLE_H, 7);
    ctx.fill();
  });
}

function drawTrail(ctx: CanvasRenderingContext2D, state: GameState): void {
  const ball = state.ball;
  if (!ball || ball.trail.length < 2) return;
  const now = state.simTime;
  ctx.save();
  for (let i = 1; i < ball.trail.length; i++) {
    const a = ball.trail[i - 1];
    const b = ball.trail[i];
    const age = now - b.t;
    const alpha = Math.max(0, 1 - age / TRAIL_TIME) * 0.5;
    if (alpha <= 0) continue;
    ctx.strokeStyle = `rgba(255, 230, 109, ${alpha})`;
    ctx.lineWidth = BALL_R * 2 * (0.3 + 0.7 * alpha);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, state: GameState): void {
  const ball = state.ball;
  if (!ball) return;
  glowBody(
    ctx,
    COL_BALL,
    () => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    },
    22,
  );
}

function drawScores(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.font = "bold 72px 'Segoe UI', Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillStyle = COL_P1;
  ctx.fillText(String(state.score.p1), FIELD_CX - 120, 28);
  ctx.fillStyle = COL_P2;
  ctx.fillText(String(state.score.p2), FIELD_CX + 120, 28);

  // Mode label.
  ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = COL_TEXT_DIM;
  const label =
    state.mode === "solo" ? "SOLO — YOU vs CPU" : "VERSUS — P1 vs P2";
  ctx.fillText(label, FIELD_CX, 16);
  ctx.restore();
}

/** Draws the full live field: furniture, scores, ball and trail. */
function drawField(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  dim: boolean,
): void {
  drawFieldFrame(ctx);
  drawNet(ctx);
  drawObstacles(ctx, state);
  drawPaddle(ctx, P1_X0, state.paddles.left.cy, COL_P1);
  drawPaddle(ctx, P2_X0, state.paddles.right.cy, COL_P2);
  drawTrail(ctx, state);
  drawBall(ctx, state);
  if (!dim) drawScores(ctx, state);
}

function drawMenuItems(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  items: readonly string[],
): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  items.forEach((label, i) => {
    const rect = menuItemRect(state.screen, i);
    if (!rect) return;
    const selected = i === state.menuIndex;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    if (selected) {
      ctx.save();
      ctx.shadowColor = COL_HILITE;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = COL_HILITE;
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
      ctx.stroke();
      ctx.restore();
    }
    ctx.font = selected
      ? "bold 34px 'Segoe UI', Arial, sans-serif"
      : "28px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = selected ? COL_HILITE : COL_TEXT_DIM;
    ctx.fillText(label, cx, cy);
  });
  ctx.restore();
}

function drawOverlayBackdrop(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(6, 9, 20, 0.72)";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
}

function drawTitle(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawField(ctx, state, true);
  drawOverlayBackdrop(ctx);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = COL_P1;
  ctx.shadowBlur = 30;
  ctx.fillStyle = COL_TEXT;
  ctx.font = "bold 140px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(TITLE_TEXT, FIELD_CX, 200);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = COL_TEXT_DIM;
  ctx.font = "22px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("a top-down paddle duel with spin", FIELD_CX, 290);
  ctx.restore();

  drawMenuItems(ctx, state, TITLE_ITEMS);

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = COL_TEXT_DIM;
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(
    "W/S move · Arrows move · Enter select · M mute · ` overlay",
    FIELD_CX,
    FIELD_H - 36,
  );
  ctx.restore();
}

function drawHowto(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawField(ctx, state, true);
  drawOverlayBackdrop(ctx);
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = COL_TEXT;
  ctx.font = "bold 56px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("HOW TO PLAY", FIELD_CX, 90);

  ctx.textAlign = "left";
  ctx.font = "22px 'Segoe UI', Arial, sans-serif";
  const lines = [
    "CONTROLS",
    "  Player 1 — W (up) / S (down)      Player 2 — ↑ / ↓",
    "  Enter or Space confirm · Escape pause/back · P pause · M mute",
    "",
    "SPIN",
    "  Strike the ball with a moving paddle and your motion curves its",
    "  flight. Sweep downward for clockwise spin, upward for counter.",
    "  Spin bends the ball through the field and fades over time.",
    "",
    "OBSTACLES",
    "  Two violet bars stand mid-field. Bank the ball off them to thread",
    "  shots your opponent cannot read. First to 11, win by two.",
  ];
  const x = FIELD_CX - 440;
  let y = 170;
  for (const line of lines) {
    const header = line === line.toUpperCase() && line.trim() !== "";
    ctx.fillStyle = header ? COL_HILITE : COL_TEXT;
    ctx.font = header
      ? "bold 26px 'Segoe UI', Arial, sans-serif"
      : "22px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(line, x, y);
    y += 36;
  }
  ctx.restore();

  drawMenuItems(ctx, state, ["BACK"]);
}

function drawPaused(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawField(ctx, state, false);
  drawOverlayBackdrop(ctx);
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = COL_TEXT;
  ctx.font = "bold 72px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("PAUSED", FIELD_CX, 250);
  ctx.restore();
  drawMenuItems(ctx, state, PAUSE_ITEMS);
}

function drawCountdown(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawField(ctx, state, false);
  const ball = state.ball;
  if (ball && ball.held) {
    const remaining = Math.max(0, Math.ceil(ball.holdTimer));
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.85;
    ctx.shadowColor = COL_BALL;
    ctx.shadowBlur = 24;
    ctx.fillStyle = COL_TEXT;
    ctx.font = "bold 120px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(String(remaining), FIELD_CX, FIELD_H / 2 - 120);
    ctx.restore();
  }
}

function drawMatchover(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawField(ctx, state, false);
  drawOverlayBackdrop(ctx);
  ctx.save();
  ctx.textAlign = "center";
  const winnerIsLeft = state.winner === "left";
  const winnerName =
    state.mode === "solo"
      ? winnerIsLeft
        ? "YOU WIN"
        : "CPU WINS"
      : winnerIsLeft
        ? "PLAYER 1 WINS"
        : "PLAYER 2 WINS";
  ctx.fillStyle = winnerIsLeft ? COL_P1 : COL_P2;
  ctx.shadowColor = winnerIsLeft ? COL_P1 : COL_P2;
  ctx.shadowBlur = 28;
  ctx.font = "bold 80px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(winnerName, FIELD_CX, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COL_TEXT;
  ctx.font = "bold 56px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`${state.score.p1} — ${state.score.p2}`, FIELD_CX, 320);
  ctx.restore();
  drawMenuItems(ctx, state, MATCHOVER_ITEMS);
}

/** Renders the current screen, in logical units. */
export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  switch (state.screen) {
    case "title":
      drawTitle(ctx, state);
      break;
    case "howto":
      drawHowto(ctx, state);
      break;
    case "playing":
      drawField(ctx, state, false);
      break;
    case "countdown":
      drawCountdown(ctx, state);
      break;
    case "paused":
      drawPaused(ctx, state);
      break;
    case "matchover":
      drawMatchover(ctx, state);
      break;
  }
}
