// Menu layout: the hit regions for the items on each menu screen, in logical
// units. Rendering draws items at these same regions, so the layout the build
// reports (via `menuItemRect`) is the layout the player sees.

import {
  FIELD_CX,
  MATCHOVER_ITEMS,
  PAUSE_ITEMS,
  TITLE_ITEMS,
} from "../config.js";
import type { GameState, Rect } from "../types.js";

/** Item height and vertical gap used for every vertical menu. */
const ITEM_H = 56;
const ITEM_GAP = 18;
const ITEM_W = 420;

/** The number of menu items the given screen shows, or 0 for none. */
export function menuItemCount(screen: GameState["screen"]): number {
  switch (screen) {
    case "title":
      return TITLE_ITEMS.length;
    case "howto":
      return 1;
    case "paused":
      return PAUSE_ITEMS.length;
    case "matchover":
      return MATCHOVER_ITEMS.length;
    default:
      return 0;
  }
}

/** The top y of the first item for a menu of `count` items, centered as drawn. */
function menuTop(screen: GameState["screen"], count: number): number {
  const block = count * ITEM_H + (count - 1) * ITEM_GAP;
  switch (screen) {
    case "title":
      // Title sits below the big wordmark.
      return 360;
    case "howto":
      // The single "back" item sits low on the help screen.
      return 600;
    case "paused":
      return 360 - block / 2 + 40;
    case "matchover":
      return 420;
    default:
      return 360 - block / 2;
  }
}

/** The hit region of item `index` on `screen`, or null if it names no item. */
export function menuItemRect(
  screen: GameState["screen"],
  index: number,
): Rect | null {
  const count = menuItemCount(screen);
  if (count === 0) return null;
  if (!Number.isInteger(index) || index < 0 || index >= count) return null;
  const top = menuTop(screen, count);
  const y = top + index * (ITEM_H + ITEM_GAP);
  return { x: FIELD_CX - ITEM_W / 2, y, w: ITEM_W, h: ITEM_H };
}
