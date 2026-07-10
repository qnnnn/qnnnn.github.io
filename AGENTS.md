# AGENTS.md — Battle City (坦克大战)

Single-file HTML5 Canvas game (~64KB in `index.html`). No build, no bundler, no dependencies. Open `index.html` in a browser to play.

## Commands

| Command | What |
|---------|------|
| `npx playwright test` | Run all 17 tests headless |
| `npx playwright test --headed` | Run with browser visible |
| `npx playwright test -g "test name"` | Run single test by name |

`npm test` is a dummy (`echo "Error: no test specified" && exit 1`) — use `npx playwright test` for everything.

**There is no CI** (no `.github/` directory), no linter, no typechecker, no formatter config. Tests are the only automated verification.

## Testing quirks

- Tests load the game via `file://` protocol — no server needed.
- Config: `playwright.config.mjs` (headless, 800×800 viewport, 30s timeout).
- Test file: `battle-city.spec.mjs` — ESM (`.mjs`) despite `"type": "commonjs"` in `package.json`.
- All 17 tests are **flat top-level** (no `describe()` blocks).
- Tests use `page.waitForTimeout()` (time-based waits for game state), not Playwright auto-waiting selectors. If a test is flaky, increasing these timeouts is the typical fix.
- `node_modules/` and `test-results/` are gitignored.

## Dev cheat keys (for testing without driving game UI)

| Key | Action |
|-----|--------|
| O | Toggle invincibility |
| I | Kill all enemies |
| L | Skip level |
| R | Restart level |
| P | Pause/unpause |
| M | Menu (shows Resume button) |

All cheat keys use `keydown` listeners on `document`. Typing into the page while a test runs may trigger unwanted game actions — tests press keys via `page.keyboard.press()`.

## Architecture

All logic, rendering, audio, and UI are inside `<script>` in `index.html`. The game loop uses delta-time normalization:

```js
const dt = lastTime ? Math.min((time - lastTime) / 16.667, 3) : 1;
```

This means all movement, timers, and animations are framerate-independent. When modifying speeds or durations, the unit is "ticks at 60fps" (1 dt ≈ 1 frame at 60fps). The cap at 3 prevents spiral-of-death on lag spikes.

Key DOM elements tests rely on: `#overlay`, `#btn1p`, `#btn2p`, `#btnEndless`, `#btnResume`, `#screen` (416×512 canvas), `#panel`, `#lives`, `#level`, `#enemies`, `#hpDisplay`, `#muteBox`.

## Deployment

GitHub Pages at `qnnnn.github.io` (packaged as a subpath of the `qnnnn/qnnnn.github.io` repo). Push to `main` to deploy — the site serves `index.html` at the repo root.
