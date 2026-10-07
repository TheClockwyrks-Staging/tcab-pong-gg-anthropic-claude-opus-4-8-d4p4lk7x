// Canvas fit: sizes the canvas to the window at the device pixel ratio, and maps
// between client (CSS) coordinates and the field's logical units through the one
// uniform scale, letterboxed and centered.

import { FIELD_H, FIELD_W } from "../config.js";

export interface Fit {
  /** Uniform logical-to-CSS scale. */
  scale: number;
  /** CSS-pixel offset of the field's top-left within the canvas. */
  offsetX: number;
  offsetY: number;
  /** The device pixel ratio the backing store is sized at. */
  dpr: number;
  /** The canvas CSS size in pixels. */
  cssW: number;
  cssH: number;
}

/**
 * Resizes the canvas backing store to fill its CSS box at the current DPR and
 * returns the fit describing the letterboxed, centered logical field within it.
 */
export function fitCanvas(canvas: HTMLCanvasElement): Fit {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || window.innerWidth;
  const cssH = canvas.clientHeight || window.innerHeight;

  const backingW = Math.round(cssW * dpr);
  const backingH = Math.round(cssH * dpr);
  if (canvas.width !== backingW) canvas.width = backingW;
  if (canvas.height !== backingH) canvas.height = backingH;

  const scale = Math.min(cssW / FIELD_W, cssH / FIELD_H);
  const offsetX = (cssW - FIELD_W * scale) / 2;
  const offsetY = (cssH - FIELD_H * scale) / 2;

  return { scale, offsetX, offsetY, dpr, cssW, cssH };
}

/**
 * Maps a client position (relative to the canvas element) into logical units
 * through the given fit.
 */
export function clientToLogical(
  fit: Fit,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: (clientX - fit.offsetX) / fit.scale,
    y: (clientY - fit.offsetY) / fit.scale,
  };
}
