// Shared test helpers for driving the simulation without a browser.

import type { FrameInput } from "./update.js";

/** An input frame with nothing held and no menu edges. */
export function noInput(): FrameInput {
  return {
    actions: { "p1-up": 0, "p1-down": 0, "p2-up": 0, "p2-down": 0 },
    edges: {
      "p1-up": false,
      "p1-down": false,
      "p2-up": false,
      "p2-down": false,
      confirm: false,
      back: false,
      pause: false,
      mute: false,
    },
    pointer: { move: null, confirm: null },
  };
}

/** An input frame carrying a single press edge for the named action. */
export function edge(name: keyof FrameInput["edges"]): FrameInput {
  const f = noInput();
  f.edges[name] = true;
  return f;
}

/** An input frame holding the named movement actions. */
export function hold(...names: (keyof FrameInput["actions"])[]): FrameInput {
  const f = noInput();
  for (const n of names) f.actions[n] = 1;
  return f;
}
