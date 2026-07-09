# AGENTS.md — tank.html

Single-file HTML5 Canvas game (Battle City / 坦克大战 clone). No build step, no dependencies.

## How to run

Open `tank.html` in a browser (double-click or `file://` URL). No server needed.

## Architecture

All game logic, rendering, and assets live inside one `<script>` tag (~600 lines IIFE).

Key globals: `player`, `player2`, `enemies`, `bullets`, `base`, `pickups`, `particles`, `map[][]`.

Game loop: `requestAnimationFrame(loop)` → `update()` → `draw()`.

Canvas is 26×26 tiles, each 16px (416×416 total). Map values: `0=empty 1=brick-wall 2=steel-wall 3=base`.

## Controls

| Player | Move | Shoot |
|--------|------|-------|
| P1     | W A S D | J / Space |
| P2 (dual) | ↑ ↓ ← → | K |

`P` to pause. `R` to restart current level.

## Power-ups (stage pickups)

4 types, spawned randomly on empty tiles, max 1 on screen, only spawned if the buff is not already active:
- **shield** — 5s invincibility (blue aura)
- **bullet** — bigger/faster bullets
- **doubleshot** — fires 2 parallel bullets
- **baseshield** — 10s base immunity (green border)

All stage buffs reset on level transition.

## Permanent upgrades (choose at level clear)

After clearing each level, pick one:
- ❤ **+1 HP** — extra hit per life (`permHP`), absorbs one enemy bullet without dying
- ✚ **+1 life** (`permLives`)
- ⚡ **+15% speed** (`permSpeed`)

Persist across levels, reset on new game.

## Enemy types (by level)

| Level | Types |
|-------|-------|
| 1-2   | Normal (1 HP, single shot) |
| 3-4   | + Armored (2 HP, darker red) |
| 5-6   | + Rapid (2 HP, pink, double shot) |
| 7+    | + Elite (3 HP, rapid) |

Enemy `hp` field decrements on hit; only killed when `hp <= 0`. Hitting armored/elite gives 20 pts, kill gives 100.

## Difficulty scaling

Per level: enemy speed = `0.4 + (level - 1) * 0.14`, shoot chance = `0.004 + (level - 1) * 0.005`, max enemies = `min(1 + (level - 1), 5)`, spawn interval decreases.

## Audio

8-bit sounds via Web Audio API (square/sawtooth oscillators, no external files). Requires user gesture to init AudioContext.

## Known patterns / gotchas

- Enemy spawn is position-aware (tries 3 shuffled spots, skips occupied).
- Player/P2 spawn areas are cleared of bricks on map gen and on respawn.
- Bullet cancellation: opposing bullets that collide are both removed.
- Game over when both players (in dual) are out of lives, or base is destroyed.
- `canMove()` checks map tiles + all living tanks. Must pass a stub `{w:16, h:16}` for position checks.
- Bullet `from` field: `'p'` (player) vs `'e'` (enemy). Both players use `'p'`. No friendly fire.
- Player hit: if `playerExtraHP > 0`, consume it and quick-respawn (300ms) instead of losing a life.
- Spawn pickup only generates buffs not currently active (`shieldTimer`, `bulletUpgraded`, `doubleShot`, `baseShieldTimer`).
- Level complete triggers upgrade overlay (`upgradePending = true`, `paused = true`).
- `reloadLevel()` resets map/spawns but keeps score/level/lives/buffs. Bound to `R`.
