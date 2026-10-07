import { describe, expect, it } from "vitest";
import { createInitialState } from "./state.js";
import { update } from "./update.js";
import { edge, noInput } from "./testUtil.js";
import { menuItemCount, menuItemRect } from "./menuLayout.js";
import type { FrameInput } from "./update.js";

function pointerMove(x: number, y: number): FrameInput {
  const f = noInput();
  f.pointer.move = { x, y };
  return f;
}

function pointerConfirm(x: number, y: number): FrameInput {
  const f = noInput();
  f.pointer.confirm = { press: { x, y }, release: { x, y } };
  return f;
}

describe("menu navigation", () => {
  it("wraps the title cursor up and down", () => {
    const s = createInitialState(false);
    expect(s.menuIndex).toBe(0);
    update(s, edge("p1-up"), 1 / 60);
    expect(s.menuIndex).toBe(2); // wrapped to last
    update(s, edge("p1-down"), 1 / 60);
    expect(s.menuIndex).toBe(0);
  });

  it("confirm on SOLO starts a solo match and remembers the selection", () => {
    const s = createInitialState(false);
    s.menuIndex = 0;
    update(s, edge("confirm"), 1 / 60);
    expect(s.mode).toBe("solo");
    expect(s.screen).toBe("countdown");
    expect(s.titleIndex).toBe(0);
  });

  it("confirm on VERSUS starts a versus match", () => {
    const s = createInitialState(false);
    s.menuIndex = 1;
    update(s, edge("confirm"), 1 / 60);
    expect(s.mode).toBe("versus");
    expect(s.screen).toBe("countdown");
    expect(s.titleIndex).toBe(1);
  });

  it("HOW TO PLAY opens the help screen and returns on confirm", () => {
    const s = createInitialState(false);
    s.menuIndex = 2;
    update(s, edge("confirm"), 1 / 60);
    expect(s.screen).toBe("howto");
    expect(s.menuIndex).toBe(0);
    update(s, edge("confirm"), 1 / 60);
    expect(s.screen).toBe("title");
  });

  it("an up edge and a down edge together move up only", () => {
    const s = createInitialState(false);
    s.menuIndex = 1;
    const f = noInput();
    f.edges["p1-up"] = true;
    f.edges["p1-down"] = true;
    update(s, f, 1 / 60);
    expect(s.menuIndex).toBe(0);
  });

  it("a movement edge and a confirm edge together move only", () => {
    const s = createInitialState(false);
    s.menuIndex = 0;
    const f = noInput();
    f.edges["p1-down"] = true;
    f.edges.confirm = true;
    update(s, f, 1 / 60);
    expect(s.screen).toBe("title");
    expect(s.menuIndex).toBe(1);
  });
});

describe("pause flow", () => {
  it("a single Escape on playing opens the pause menu and leaves it open", () => {
    const s = createInitialState(false);
    s.screen = "playing";
    const f = noInput();
    f.edges.pause = true;
    f.edges.back = true; // Escape raises both
    update(s, f, 1 / 60);
    expect(s.screen).toBe("paused");
    expect(s.resumeScreen).toBe("playing");
  });

  it("a single Escape on paused resumes once", () => {
    const s = createInitialState(false);
    s.screen = "paused";
    s.resumeScreen = "playing";
    const f = noInput();
    f.edges.pause = true;
    f.edges.back = true;
    update(s, f, 1 / 60);
    expect(s.screen).toBe("playing");
  });

  it("RESTART from pause starts a fresh match", () => {
    const s = createInitialState(false);
    s.screen = "paused";
    s.mode = "versus";
    s.score = { p1: 5, p2: 3 };
    s.menuIndex = 1; // RESTART
    update(s, edge("confirm"), 1 / 60);
    expect(s.screen).toBe("countdown");
    expect(s.score).toEqual({ p1: 0, p2: 0 });
    expect(s.mode).toBe("versus");
  });

  it("QUIT TO MENU returns to the title restoring menuIndex to titleIndex", () => {
    const s = createInitialState(false);
    s.screen = "paused";
    s.titleIndex = 1;
    s.menuIndex = 2; // QUIT TO MENU
    update(s, edge("confirm"), 1 / 60);
    expect(s.screen).toBe("title");
    expect(s.menuIndex).toBe(1);
  });
});

describe("pointer and touch menus", () => {
  it("a pointer move selects the item under it", () => {
    const s = createInitialState(false);
    const rect = menuItemRect("title", 1)!;
    update(s, pointerMove(rect.x + 10, rect.y + 10), 1 / 60);
    expect(s.menuIndex).toBe(1);
  });

  it("a press and release in one region confirms it", () => {
    const s = createInitialState(false);
    const rect = menuItemRect("title", 1)!;
    update(s, pointerConfirm(rect.x + 10, rect.y + 10), 1 / 60);
    expect(s.mode).toBe("versus");
    expect(s.screen).toBe("countdown");
  });

  it("a confirm outside every region confirms nothing", () => {
    const s = createInitialState(false);
    update(s, pointerConfirm(5, 5), 1 / 60);
    expect(s.screen).toBe("title");
  });
});

describe("menu layout", () => {
  it("reports no menu on playing and countdown", () => {
    expect(menuItemCount("playing")).toBe(0);
    expect(menuItemRect("playing", 0)).toBeNull();
    expect(menuItemRect("countdown", 0)).toBeNull();
  });

  it("returns null for an index naming no item", () => {
    expect(menuItemRect("title", -1)).toBeNull();
    expect(menuItemRect("title", 3)).toBeNull();
  });
});
