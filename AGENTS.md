# AGENTS.md — Battle City (坦克大战)

Single-file HTML5 Canvas game (~180KB in `index.html`). No build, no bundler, no dependencies. Open `index.html` in a browser to play.

## Commands

| Command | What |
|---------|------|
| `npx playwright test` | Run all 34 tests headless |
| `npx playwright test --headed` | Run with browser visible |
| `npx playwright test -g "test name"` | Run single test by name |

`npm test` is a dummy (`echo "Error: no test specified" && exit 1`) — use `npx playwright test` for everything.

**There is no CI** (no `.github/` directory), no linter, no typechecker, no formatter config. Tests are the only automated verification.

## Testing quirks

- Tests load the game via `file://` protocol — no server needed.
- Config: `playwright.config.mjs` (headless, 800×800 viewport, 30s timeout). If Playwright's bundled Chromium is not installed (e.g. offline, so `npx playwright install` can't run), the config automatically falls back to the system Google Chrome via `channel: 'chrome'`.
- Test file: `battle-city.spec.mjs` — ESM (`.mjs`) despite `"type": "commonjs"` in `package.json`.
- All 34 tests are **flat top-level** (no `describe()` blocks).
- Tests mix `page.waitForTimeout()` (time-based waits for game state) with explicit Playwright assertions. If a test is flaky, increasing these timeouts is the typical fix — **but not when the flake is a read race.** When a test spawns an entity that can die almost immediately, the "before" baseline (`score`, `killedCount`) must be read inside the *same* `page.evaluate()` as the spawn. A separate round-trip read can land after the death frame, so the assertion overshoots and no amount of extra waiting helps. Tests N and O hit this; see `battle-city.spec.mjs` for the atomic-baseline pattern.
- Newer tests use the `window.__test` debug API (e.g. `triggerPlayerDeath`, `applyBuff`, `addLevelDebuff`, `hitPlayer`, `setBaseHp`) to set up deterministic game states.
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

Key DOM elements tests rely on: `#overlay`, `#btn1p`, `#btn2p`, `#btnEndless`, `#btnHard`, `#btnResume`, `#screen` (416×512 canvas), `#panel`, `#lives`, `#level`, `#enemies`, `#hpDisplay`, `#muteBox`.

## Difficulty tiers

Gameplay balance lives in two objects near the top of the script: `DIFFS.normal` / `DIFFS.hard`, selected by `diff()`. `hardMode` is flipped by `startGame('hard')` from the `#btnHard` menu button (mutually exclusive with `endlessMode`) and is cleared on the next `startGame()` call, so per-mode state never leaks between runs.

Never hard-code difficulty numbers in gameplay code — read them from `diff()` (`lives`, `maxHP`, `enemySpeedMul`, `enemyBulletSpeed`, `shootBase`/`shootStep`/`shootMul`, `rapidCd`/`normalCd`, `typeShift`, `debuffLevel`/`debuffMul`/`debuffBonus`, `dropRate`, `pickupFactor`, `bossHpMul`, `spawnTimer`/`spawnFloor`). The per-level enemy quota is centralized in `enemiesForLevel(lv)`; boss levels (`lv % 5 === 0`) and endless mode keep their own formulas inside it.

## Deployment

GitHub Pages at `qnnnn.github.io` (packaged as a subpath of the `qnnnn/qnnnn.github.io` repo). Push to `main` to deploy — the site serves `index.html` at the repo root.
