# Carom

Carom is a top-down paddle duel that runs entirely in the browser. Two paddles
face off across a dashed net, a bright ball accelerates between them with every
return, and two obstacles in the open court turn the middle of the field into a
gallery of bank shots. Catch the ball with a moving paddle to put spin on it and
curve its flight past your opponent. First to **11**, win by **2**.

Everything is drawn in code on a canvas — there are no art or audio assets, and
the game fetches nothing at runtime.

## Controls

| Action | Player 1 (left) | Player 2 (right) |
| --- | --- | --- |
| Move paddle up | `W` | `↑` |
| Move paddle down | `S` | `↓` |

| Menu / global | Keys |
| --- | --- |
| Select / confirm | `Enter` or `Space` |
| Pause / resume | `Esc` or `P` |
| Back | `Esc` |
| Mute / unmute | `M` |
| Toggle diagnostics overlay | `` ` `` (backtick) |

Menus also respond to the mouse and to touch: move the pointer over an item to
highlight it, and tap or click to confirm.

## Modes

- **Solo** — play the left paddle against a CPU opponent.
- **Versus** — two players share one keyboard, `W`/`S` against `↑`/`↓`.

## Spin and banks

Hitting the ball with a paddle that is sliding puts spin on it, and spin curves
the ball's path in flight — the trail behind the ball shows the curve. The two
obstacles and the top and bottom walls all bank the ball at fresh angles, so a
spinning shot can arrive from a direction nobody expected.

## Running it

Dependencies are managed with npm.

```sh
npm ci          # install dependencies
npm run dev     # run locally with hot reload (Vite dev server)
npm run build   # produce the static production site into dist/
npm run preview # serve the built dist/ locally
```

`npm run build` writes a self-contained static site to `dist/`, with
`dist/index.html` as the entry point. Serve that directory from the root of any
static file server to play.

## Development

| Command | Does |
| --- | --- |
| `npm run typecheck` | Type-checks with `tsc --noEmit`. |
| `npm run lint` | Runs ESLint. |
| `npm run format` | Checks formatting with Prettier. |
| `npm test` | Runs the Vitest unit tests with coverage over `src/`. |

The game logic lives in `src/sim/` as a pure simulation driven by a delta time,
so the tests run in Node over a counted number of frames without a browser. The
browser runtime — the frame loop, canvas fit, input, audio, and the diagnostics
overlay — lives in `src/runtime/`, and rendering is in `src/render.ts`.
