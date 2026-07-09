# AGENTS.md — Battle City (坦克大战)

Single-file HTML5 Canvas game. No build, no dependencies.

**File**: `index.html` (deployed on GitHub Pages at `qnnnn.github.io`)

## Controls

| P1 | P2 | Action |
|----|----|--------|
| W A S D | ↑ ↓ ← → | Move |
| J / Space | K | Shoot |
| P | | Pause |
| R | | Restart level |
| O | | Toggle invincibility |
| I | | Kill all enemies |
| L | | Skip level |

Mobile: touch d-pad + fire button auto-detected.

## Game Modes

- **Single / Dual** — classic, score gate `level×1500`
- **Endless** — infinite waves, clear all enemies to advance, difficulty keeps scaling

## Power-ups

| Type | Effect |
|------|--------|
| shield | 5s invincibility (blue aura) |
| bullet | bigger/faster bullets |
| doubleshot | fires 2 parallel |
| baseshield | 10s base immunity (green border) |
| freeze | 3s freeze all enemies |
| bomb | kill all enemies on screen |
| apbullet | 5s bullets pierce steel walls |
| repair | restore 2 base HP + repair surrounding brick walls |

Drop chance on enemy kill: 30%. Max 3 on screen.

## Permanent Upgrades (level clear)

❤ +1HP | ✚ +1 life | ⚡ +15% speed

## Enemy Types

Normal (1HP), Scout (fast/lateral/no shoot), Armored (2HP), Suicide (rushes/explodes on contact, 2 base dmg), Rapid (2HP/double shot), Elite (3HP/rapid).

## Boss (every 5th level)

2×2 tile boss with HP bar. HP: `10+floor(L/5)×4`. Enrages at ≤50% HP. Spawns AI ally (cyan, 3HP).

## Terrain

0=empty 1=brick 2=steel 3=base 4=grass 5=water 6=ice
Random grass≥L1, water≥L3, ice≥L5. 6 preset map layouts cycle by level.

## Audio

8-bit via Web Audio (`mbeep()` wrapper respects `muted` flag). BGM: looping square-wave melody.
