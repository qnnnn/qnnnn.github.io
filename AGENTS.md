# AGENTS.md — Battle City (坦克大战)

Single-file HTML5 Canvas game (~198KB in `index.html`). No build, no bundler, no dependencies. Open `index.html` in a browser to play.

## Commands

| Command | What |
|---------|------|
| `npx playwright test` | Run all 38 tests headless |
| `npx playwright test --headed` | Run with browser visible |
| `npx playwright test -g "test name"` | Run single test by name |

`npm test` is a dummy (`echo "Error: no test specified" && exit 1`) — use `npx playwright test` for everything.

**There is no CI** (no `.github/` directory), no linter, no typechecker, no formatter config. Tests are the only automated verification.

## Testing quirks

- Tests load the game via `file://` protocol — no server needed.
- Config: `playwright.config.mjs` (headless, 800×800 viewport, 30s timeout). If Playwright's bundled Chromium is not installed (e.g. offline, so `npx playwright install` can't run), the config automatically falls back to the system Google Chrome via `channel: 'chrome'`.
- Test file: `battle-city.spec.mjs` — ESM (`.mjs`) despite `"type": "commonjs"` in `package.json`.
- All 38 tests are **flat top-level** (no `describe()` blocks).
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

Enemy spawn pacing is deliberately capped: `maxAliveFor(lv)` limits how many enemies may exist at once (3 at level 1, +1 every 2 levels, hard cap 8 / 10 in endless), and the per-tick spawn batch only grows to 2 at level 5 and 3 at level 8. Both were introduced because the enemy count used to be unbounded — spawns doubled from level 3 onward and the backlog of enemies could snowball into an unwinnable base rush. Keep the cap in place when tuning; raise it only together with player damage output.

`gameOver(win, reason)` takes a second argument (`'base'` when the base is destroyed, omit for losing all lives) that the game-over screen renders as the loss reason. Base hits also set `baseWarn` for the full-screen flash/banner.

## AI allies

`allies` (an array, near the top of the script) holds the AI teammates. `allyCountFor(lv)` decides how many a level gets — none before level 3, then +1 every 3 levels, capped at 3 (4 in hard mode) — and `ensureAllyTeam()` refills the roster at `startGame` / `nextLevel` / `reloadLevel`. Airdrop allies (`spawnAirdrop`) are one-shot and never respawn; standing allies respawn 480 ticks after dying.

Their AI is deliberately two-stage: if an enemy is inside the base guard radius (`guardR = TILE * 7`, widened to `TILE * 10` for `suicide`/`scout`) they move to an intercept point between the base and the threat; otherwise they actively hunt the nearest enemy anywhere on the map. Do not shrink the hunt stage back to the guard radius — the allies exist to take pressure off the player in later levels.

Ally bullets are tagged `from: 'p'` (so they damage enemies, not teammates) but carry `isAlly` so `shoot()` skips the player's `laserCharges` / `tripleCharges` / `apCharges` and uses its own cooldown and speed. Keep that split when touching `shoot()` — before it was fixed, allies silently drained the player's buff charges.

## Level debuffs

`DEBUFF_EFFECTS` holds the pool: `slow`, `blind`, `drain`, `vuln`. Reverse-controls was removed (it made the game feel broken rather than hard) — do not re-add it to the array; `addLevelDebuff()` rejects names that are not in the pool, and test `I` asserts that.

## Boss movement

The boss is 2×2 tiles, so the generic `canMove()` (which samples only the four corners) is not used for it — one-tile-wide walls in the middle of its footprint went undetected and the boss would embed itself in the map. `bossRectBlocked(nx, ny)` walks every tile the boss covers; `bossCanGo(dir)` probes a short step ahead; `pickBossDir()` only returns directions that pass that probe (player/base direction first, then random). Moving into brick crushes it via `crushBricksUnderBoss()` (steel, water, and the base's protective walls are exempt), and `relocateBoss()` is the last resort after ~150 stuck frames. Enemies never block the boss. Keep the boss on this path — routing it back through `canMove()` reintroduces the stuck-in-wall bug, which test `U` guards against.

## Page must never scroll

Desktop scaling applies `transform: scale()` to `#game`, so its layout box can be taller than the viewport even though the painted result fits. `.wrap` clips that overflow and `html, body` set `overflow: hidden` + `overscroll-behavior: none`, which keeps `document.scrollingElement.scrollHeight === clientHeight`. A `keydown` handler calls `preventDefault()` for every key in `GAME_KEYS` (WASD, J/K, Space, arrows, P/R/O/I/L/M) so arrow keys and Space cannot scroll the page, and clicking any button blurs it so Space cannot retrigger it. Test `T` asserts both. Re-check `scrollHeight` whenever the panel grows or a new overlay is added.

## The panel must not move the canvas

`.wrap` centers `#game` vertically, so anything that changes `#game`'s height shifts the whole canvas up or down. The right-hand panel has several rows that appear and disappear mid-game (`#diffRow`, `#comboRow`, `#levelDebuffRow`, `#cheatRow`, P2), and each extra row used to grow the panel by ~16px and shove the canvas up 13–14px.

The fix pins the desktop panel to the canvas height and lets only the top info card absorb growth:

```css
body:not(.is-touch) #game  { align-items: stretch; }
body:not(.is-touch) #panel { height: 512px; max-height: 512px; }
body:not(.is-touch) #panel > * { flex: 0 0 auto; }
body:not(.is-touch) #hudBox { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
```

`#hudBox` is the score/level/HP card. Keep the panel's fixed height and the bottom items (mute button, hint) pinned: making `#panel` itself scroll instead hid the mute button. Horizontal spacing in the panel is deliberately tight (`.box` padding, `.row` padding, `.key-row` padding, `.mute-icon` padding) so all four dynamic rows fit — with everything open the HUD card overflows by 1px, which is the room you have. Verify with `gameTop` in `page.evaluate()` across window sizes and row combinations after touching panel CSS.

## Visual language: flat, off-kilter, no gradients

The look is deliberately hand-built rather than "shiny UI kit": **zero gradients anywhere** (`background`, `box-shadow`, text, canvas — `grep gradient(` must stay at 0) and **no glow** (`ctx.shadowBlur` stays 0; use `shadowOffsetX/Y` for hard drop shadows, `box-shadow: Npx Npx 0 color` in CSS).

Depth comes from three things instead: flat colour steps, hard offset shadows, and ~2px solid borders.

Two canvas helpers exist because of this:

- `midColor(stops)` / `linGrad()` / `radGrad()` — `linGrad` and `radGrad` no longer create a `CanvasGradient`; they return the middle stop's flat colour so shading is a single value. Lighting is applied by drawing explicit highlight/shade blocks on top (the brick, steel, tank and base draw functions each add their own). If you need more depth, add another flat block — do not reach for `createLinearGradient`.
- `shapeA(g, x, y, w, h, [tl, tr, br, bl], fill, stroke, lw)` — a rounded rect with four *different* corner radii. Use it for cards and panels so nothing looks template-rounded.

Asymmetry is intentional and should be preserved: the two panel cards are offset horizontally, their corner radii differ, even `#hudBox` rows are indented, menu buttons each have their own `--tilt` (rotation) and uneven `margin-top`, and headings are rotated a degree or two. Blanket-regularising this (one radius, one gap, everything centered) is exactly what made it look generated.

The canvas HUD text (combo, level intro, boss warning, pause card) uses the same rules: flat fills, hard 2–3px offset shadows, `shapeA` panels. The `blind` debuff is a hard-edged rectangular viewport (four flat rects), not a radial vignette.

## Deployment

GitHub Pages at `qnnnn.github.io` (packaged as a subpath of the `qnnnn/qnnnn.github.io` repo). Push to `main` to deploy — the site serves `index.html` at the repo root.
