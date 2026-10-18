# AGENTS.md — Battle City (坦克大战)

Single-file HTML5 Canvas game (~240KB in `index.html`). No build, no bundler, no dependencies. Open `index.html` in a browser to play.

## Commands

| Command | What |
|---------|------|
| `npx playwright test` | Run all 51 tests headless |
| `npx playwright test --headed` | Run with browser visible |
| `npx playwright test -g "test name"` | Run single test by name |

`npm test` is a dummy (`echo "Error: no test specified" && exit 1`) — use `npx playwright test` for everything.

**There is no CI** (no `.github/` directory), no linter, no typechecker, no formatter config. Tests are the only automated verification.

## Testing quirks

- Tests load the game via `file://` protocol — no server needed.
- Config: `playwright.config.mjs` (headless, 800×800 viewport, 30s timeout). If Playwright's bundled Chromium is not installed (e.g. offline, so `npx playwright install` can't run), the config automatically falls back to the system Google Chrome via `channel: 'chrome'`.
- Test file: `battle-city.spec.mjs` — ESM (`.mjs`) despite `"type": "commonjs"` in `package.json`.
- All 51 tests are **flat top-level** (no `describe()` blocks).
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

Key DOM elements tests rely on: `#overlay`, `#btn1p`, `#btn2p`, `#btnEndless`, `#btnHard`, `#btnResume`, `#tankPicks`, `#screen` (416×512 canvas), `#panel`, `#wpnTank`, `#lives`, `#level`, `#enemies`, `#hpDisplay`, `#muteBox`.

## Difficulty tiers

Gameplay balance lives in two objects near the top of the script: `DIFFS.normal` / `DIFFS.hard`, selected by `diff()`. `hardMode` is flipped by `startGame('hard')` from the `#btnHard` menu button (mutually exclusive with `endlessMode`) and is cleared on the next `startGame()` call, so per-mode state never leaks between runs.

Never hard-code difficulty numbers in gameplay code — read them from `diff()` (`lives`, `maxHP`, `enemySpeedMul`, `enemyBulletSpeed`, `shootBase`/`shootStep`/`shootMul`, `rapidCd`/`normalCd`, `typeShift`, `debuffLevel`/`debuffMul`/`debuffBonus`, `dropRate`, `pickupFactor`, `bossHpMul`, `spawnTimer`/`spawnFloor`). The per-level enemy quota is centralized in `enemiesForLevel(lv)`; boss levels (`lv % 5 === 0`) and endless mode keep their own formulas inside it.

Enemy spawn pacing is deliberately capped: `maxAliveFor(lv)` limits how many enemies may exist at once (2 at level 1, +1 every 3 levels, hard cap 6 / 8 in endless), and the per-tick spawn batch only grows to 2 at level 5 and 3 at level 8. Both were introduced because the enemy count used to be unbounded — spawns doubled from level 3 onward and the backlog of enemies could snowball into an unwinnable base rush. Keep the cap in place when tuning; raise it only together with player damage output.

Late-game pressure comes from **shields, not headcount** (`enemyShieldFor(lv)`). The per-level quota also grows slowly on purpose (`totalStep` 1.5 normal / 2 hard, rounded in `enemiesForLevel`), so level 14 fields ~38 enemies instead of the old 46. If a late level feels too empty, add shield layers or tougher enemy types first — do not raise `maxAliveFor`.

`gameOver(win, reason)` takes a second argument (`'base'` when the base is destroyed, omit for losing all lives) that the game-over screen renders as the loss reason. Base hits also set `baseWarn` for the full-screen flash/banner.

## Playable tanks

Three selectable player tanks live in `PLAYER_TANKS` (near `DIFFS`), chosen on the menu (`#tankPicks`, persisted in `playerTank`, read through `tankSpec()`):

| key | build | speed | cd | dmg | pierce | magazine / reload (full-magazine ticks) | role |
|-----|-------|-------|----|-----|--------|--------------------------------------|------|
| `standard` | medium | 1.2 | 28 | 2 | 1 | 6 / 90 | baseline, two shots kill a light tank |
| `heavy` | heavy | 0.82 | 46 | 4 | 2 | 3 / 70 | breaks a shield layer *and* deals 4 damage to the hull in one shot |
| `scout` | light | 1.5 | 18 | 1 | 1 | 10 / 60 | fastest movement and fire rate, lowest per-shot damage |

Each player tank has a **magazine**: firing consumes shells (`t.ammo`), and an empty magazine triggers a full-magazine reload (`t.reloading = true`). While reloading, `shoot()` is blocked entirely — the ammo/reload check runs *before* buff charges are spent. `reloadTank(t, dt)` accumulates `t.reloadTimer`; when it reaches `reloadTicks` (the full reload duration, not per-shell), the magazine is refilled to `ammoMax` and `reloading` flips to false. The reload duration is ~1–1.5s per tank (90 / 70 / 60 ticks) so it throttles sustained spam, not ordinary play. `ammoBuffTimer` (from the ammoCrate pickup) multiplies the reload duration by 0.65. Test `AC` locks the drain → reload-trigger → full-refill flow and the per-tank differences.

`dmg` is measured in **enemy hull points**, not shots: a light enemy has 2 hp, so `standard` kills it in one hit and `scout` needs exactly two. Test `Y` asserts that `scout.dmg * 2 === light.hp`.

`makeTank(isPlayer)` reads the speed and colour from `tankSpec()`, and `shoot()` reads cooldown / bullet speed / `dmg` / `pierce`. Both the player and P2 use the selected tank; allies (`spawnAlly`) override speed and colour so the AI squad is unaffected, and enemies never read `PLAYER_TANKS`. The panel shows the current tank in `#wpnTank`.

## Enemy shields

`enemyShieldFor(lv)` rolls a shield layer count per spawn: none before level 6, then a rising chance (capped at 80%, multiplied by `diff().shieldMul`), with a second layer from level 13. Shields render as the hexagon ring in `drawShieldRing()` (`rad = 9.2 + k * 2.6` — the ring must sit *outside* the 16px hull, so keep the base radius above 8).

## Enemy builds (light / medium / heavy)

`ENEMY_KINDS` gives each enemy tier its hp and a speed multiplier, and `TANK_BUILD` maps a `build` key to the drawing dimensions:

| kind | hp | speed | build (bodyW × bodyH) | notes |
|------|----|-------|------------------------|-------|
| `light` | 2 | ×1.00 | 6.4 × 11.6 | narrow hull, thin barrel |
| `medium` | 4 | ×1.00 | 8.8 × 13.8 | the old default |
| `heavy` | 8 | ×0.66 | 11.2 × 15.2 | widest hull, armoured skirts, three road wheels |

`spawnEnemy()` assigns a `kind` per type table entry (never raw `hp:`), `makeTank()` sets `t.kind` / `t.build` / `t.hp` / `t.maxHp`, and `drawTank(t)` reads every dimension from `buildOf(t)` — so a bigger enemy is only a table edit. `TYPE_SPEED_MUL` (`scout` 1.5, `suicide` 1.25, `splitter` 1.1) multiplies on top of the kind's `speedMul`.

Damaged enemies draw a small bar above the hull via `drawEnemyHp(e)` (green → amber → red by remaining fraction); full-hp enemies show nothing. Do not fall back to a single shared tank size — test `Y` guards the differences.

Damage order matters: a bullet first spends its `pierce` on the shield, and only the leftover `pierce` applies `dmg` to `e.hp`. That is why `heavy` (pierce 2, dmg 2) one-shots a single-layer shield while `standard`/`scout` (pierce 1) need two hits. Test `W` asserts all three cases — keep the "overflow pierce hits the hull" behaviour when touching the bullet-vs-enemy block.

## Enemy base aggression

Enemies must actually push the base — that is the pressure this game is built on. `enemyBaseRushChance(lv)` gives the weight (`0.50` at level 1 rising to `0.85`, multiplied by `diff().baseRush`, which is `1.3` in hard mode). Ordinary enemies pick their goal from a weighted roll: base > player > wander, and any enemy that can see the base within 13 tiles commits to it outright unless a player is right on top of it (3.5 tiles).

Two things make the behaviour visible rather than theoretical:

- Each enemy records `e.aiGoal` (`'base' | 'player' | 'random'`). Stuck/facing-obstacle detours consult it and prefer the base too.
- Firing no longer requires seeing the player. `aimBase` (goal is the base, `canSeeBase`, within 14 tiles) both boosts the fire chance (`×1.8`) and satisfies the "may shoot" gate — before this, enemies that reached the base just stood next to it, because the fire check was `canSeePlayer` only. Enemies also turn to fire at the base whenever they share a row/column with it and have line of sight.

Suicide tanks now charge the base half the time regardless of the player. Test `Z` asserts the weight curve, the goal distribution (more than 28% base) and that enemies parked next to the base actually chip its hp — keep those three properties when touching enemy AI.

## Base defenses

The base is not a passive target. Three layers stack in this order (`hurtBase()` mirrors it exactly):

1. `baseShieldCharges` — the pick-up/upgrade "基地加固" charges, `BASE_SHIELD_MAX` of them. Spend these first so collected pick-ups never become dead weight.
2. `base.eshield` — two regenerating energy layers. A hit sets `base.eshieldTimer = 480`; after that the base refills one layer every 180 ticks while untouched. Do not let the recharge run during `levelIntroTimer`.
3. `base.hp` — now `8` (it used to be `5`, which could not survive the base rush). Bullets take 1, suicide tanks take 2.

After any hit lands — whether it was soaked by an item shield, an energy layer or the hull — the base enters `BASE_INV_TICKS` (45) ticks of invincibility. `base.invTimer` is decremented at the top of `updateBase()` (before the `levelIntroTimer` early-return, so it keeps counting during the level card). Bullets that arrive during that window are bounced (`explode(..., '#dff4ff')` + an `无敌` floater) instead of being silently dropped, and a suicide tank that reaches the base during it explodes without dealing damage. Do not make the invincibility window longer than the turret cooldown (110) — the generous 45/110 ratio is what keeps a surround from erasing several hp in one volley.

`base` also carries a turret: `updateBase(dt)` scans for the nearest enemy (or boss) within `BASE_TURRET_RANGE` (7 tiles) and fires every 110 ticks for `dmg: 1, pierce: 1`. Turret bullets are pushed with `from: 'p'` and `ghost: true` — friendly fire through the base tile is skipped in the bullet loop (`if (v===3 && b.from !== 'e') continue;`) and `ghost` keeps brick walls from being eaten from the inside. `baseTurretEnabled` / `__test.stripBaseDefense()` exist so test `Z` can measure enemy aggression without the base shooting back; test `AA` covers the hurt order and that the turret actually damages an adjacent enemy.

## AI allies

`allies` (an array, near the top of the script) holds the AI teammates. `allyCountFor(lv)` decides how many a level gets — none before level 3, then +1 every 3 levels, capped at 3 (4 in hard mode) — and `ensureAllyTeam()` refills the roster at `startGame` / `nextLevel` / `reloadLevel`. Airdrop allies (`spawnAirdrop`) are one-shot and never respawn; standing allies respawn 480 ticks after dying.

Their AI is deliberately two-stage: if an enemy is inside the base guard radius (`guardR = TILE * 7`, widened to `TILE * 10` for `suicide`/`scout`) they move to an intercept point between the base and the threat; otherwise they actively hunt the nearest enemy anywhere on the map. Do not shrink the hunt stage back to the guard radius — the allies exist to take pressure off the player in later levels.

Ally bullets are tagged `from: 'p'` (so they damage enemies, not teammates) but carry `isAlly` so `shoot()` skips the player's `laserCharges` / `tripleCharges` / `apCharges` and uses its own cooldown and speed. Keep that split when touching `shoot()` — before it was fixed, allies silently drained the player's buff charges.

## Level debuffs

`DEBUFF_EFFECTS` holds the pool: `slow`, `blind`, `drain`, `vuln`. Reverse-controls was removed (it made the game feel broken rather than hard) — do not re-add it to the array; `addLevelDebuff()` rejects names that are not in the pool, and test `I` asserts that.

## Boss movement

The boss is 2×2 tiles, so the generic `canMove()` (which samples only the four corners) is not used for it — one-tile-wide walls in the middle of its footprint went undetected and the boss would embed itself in the map. `bossRectBlocked(nx, ny)` walks every tile the boss covers; `bossCanGo(dir)` probes a short step ahead; `pickBossDir()` only returns directions that pass that probe (player/base direction first, then random). Moving into brick crushes it via `crushBricksUnderBoss()` (steel, water, and the base's protective walls are exempt), and `relocateBoss()` is the last resort after ~150 stuck frames. Enemies never block the boss. Keep the boss on this path — routing it back through `canMove()` reintroduces the stuck-in-wall bug, which test `U` guards against.

## Boss bullet budget

The boss has three overlapping attack timers; in the final-rage phase (hp ≤ ¼) all three fire at once, which is where it used to become undodgeable. Current numbers, all in ticks at 60fps:

| Attack | Cooldown | Volley |
|--------|----------|--------|
| main shot (`boss.cooldown`) | 38 enraged / 56 calm | `(finalRage ? 3 : 1) + min(2, floor(level / 12))` |
| fan burst (`boss.phaseBurstCooldown`, phase 2+) | 72 final-rage / 88 | fixed 3 bullets, 0.30 rad apart, speed 2.7 |
| ring barrage (`boss.ringCooldown`, phase 3) | 80 | 6 directions, speed 2.0 |
| summon (`boss.summonCooldown`, phase 3) | 360 | one `spawnEnemy()` |

The main-shot bullet count is **capped at +2** on purpose — it used to be `floor(level / 10)` unbounded, so a level-30 boss vomited six bullets per volley. The fan burst is a fixed 3 bullets for the same reason (final rage used to widen it to 5). Measured final-rage density after the nerf: peak 12 / average 6.4 enemy bullets on screen, down from 38 / 27.1. Test `AB` asserts peak ≤ 40 and average ≤ 22, so raising any cooldown or widening a volley will fail it — adjust the assertion deliberately if a buff is intended. The wider tolerances compensate for parallel-run frame drops in headless Chromium (single-run peak/avg are 12/6.4).

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

## Changelog keeps only the big items expanded

`CHANGELOG` entries in `index.html` render mostly-collapsed. `renderChangelog()` splits each entry's `desc` into "major" (listed) and "minor" (wrapped in a `<details class="cl-minor">` labelled `其余 N 项小改动`).

The split is driven by an optional `minor: [index, …]` field on an entry: indices listed there are folded, everything else stays expanded. When `minor` is absent and the entry has more than 3 items, everything from index 3 onward is folded automatically — so old entries shrink without touching them, and new entries fold their tail by default.

Do not rework this into "newest version expands, old ones collapse" — the requirement is per-change importance, not recency. When adding a changelog entry, put the headline changes first and either let the 3-item rule fold the rest or set `minor` explicitly.

## Pickup catalog

`PICKUP_TYPES` lists 19 drop types. The first 14 (the original 14) cover the core combat loop; v1.35-beta added 5 strategy drops that hook into systems the original set did not touch. All five use the same pick-up pipeline (`PICKUP_ICON` / `PICKUP_COLOR` / `PICKUP_NAMES`, `spawnPickup` available-array, the two `if (p.type === '…')` blocks in the update loop), so adding another one later is a 5-line change in the same five places.
| key | effect | system | notes |
|-----|--------|--------|-------|
| `ammoCrate` | `player.ammo = player.ammoMax; ammoBuffTimer = 240` | magazine (v1.34) | `reloadTank` reads `ammoBuffTimer` and multiplies `reloadTicks` by 0.65 (clamped to ≥8) while it is > 0. Does not raise the magazine cap — keeps the three-tank differentiation intact. |
| `medic` | every living ally `a.hp = a.maxHp`; `allyRegenTimer = 360` | AI allies | `allyRegenTimer` is read in the ally update loop and adds `dt/60` hp per second to every living ally. First pick-up that actually helps the squad. |
| `magnet` | `magnetTimer = 480` | pickups | the magnet pull section reads `magnetTimer` once per frame: pull radius `TILE²×25` (5 tile²) instead of `×6.25`, pull speed 4.5 instead of 2.2. P2 picks up the same buff. |
| `slowField` | `slowFieldTimer = 360` | all tanks | `moveTank(t, dt)` multiplies `t.speed` by 0.6 while the timer is > 0 — applies to player, P2, allies, enemies **and** the boss. This is the only mechanism that slows the boss, so it is the counter-pick for the boss's final-rage speed-up. Stacks with `freezeTimer` being > 0 by skipping the entire enemy update (`if (freezeTimer > 0) continue;`), but freeze does *not* stop the boss — slowField is what does. |
| `blast` | `blastCharges += 3` | bullets | the bullet-vs-enemy block runs the 2.5-tile-radius splash once per hit *and* only when the bullet is friendly (`b.from === 'p'`). Each charge does 1 hull damage to every other enemy inside the radius; kills follow the same `e.hp <= 0` path as a normal hit, including `spawnDrop` and `splitEnemy` for splitters. |

All timers are reset in the three reset points (`nextLevel`, `startGame`, `showUpgradeScreen`) alongside the existing charge counters. `__test.buffCharges` reports all five values, so a single page.evaluate can read the whole buff state. Tests `AD`–`AH` cover each pick-up in isolation.

## Performance: keep the frame budget under 6ms

`index.html` runs the entire game + UI inside a single 416×512 canvas, but the rendering surface is twice that (`SS = 2` super-sampling), so a sloppy draw function still hurts at 60fps. The hot path is `loop() → update() → draw()` once per `requestAnimationFrame`; nothing else in the page steals frames. v1.36-beta shaved the worst offenders — keep them shaved:

- `__now` (a `performance.now()` snapshot taken once at the top of `loop()`) replaces every `Date.now()` call. `Date.now()` is a syscall; calling it 14× per frame is measurable. Use `__now / 380` and similar in animations.
- Particles cap at 80 alive (was unbounded ~200+). `explode()` pushes 20 for a boss and 10 for a tank (was 46 / 22), and the update loop trims with `splice(0, length - 80)` *before* the `life > 0` filter so the filter still works on the trimmed array.
- The particle layer no longer uses `ctx.globalCompositeOperation = 'lighter'`. The additive blend forced a composite-layer promotion that cost more than the glow was worth — `particles.length` was the real culprit, and 80 solid fills render in well under a millisecond.
- Bullet trails are gone (each one was a `beginPath` + 2-point `stroke` per frame). Tank status lights, heavy road wheels, turret rings, Boss armour plate split, Boss barrel highlights and pickup top-highlights are also gone. The hull, barrel, turret, tread teeth, turret highlight, base / pickup / bullet shells and shadows are still drawn.
- Pickup halo collapsed from two rings (stroke + fill) to a single ring. The bob + pulse animation still uses `__now`, so motion is preserved.

Measured in `channel: 'chrome'` headless with 12 medium enemies firing and the boss in final rage: p95 frame time 5.8–5.9ms (≈170fps), worst frame 9–13ms. Idle scene is 5.6ms. Do not re-add any per-frame `shadowBlur`, `globalCompositeOperation`, or `Date.now()` — those are the things that made pause cards turn into multi-second hangs.

## Deployment

GitHub Pages at `qnnnn.github.io` (packaged as a subpath of the `qnnnn/qnnnn.github.io` repo). Push to `main` to deploy — the site serves `index.html` at the repo root.
