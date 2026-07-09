# AGENTS.md — Battle City (坦克大战)

Single-file HTML5 Canvas game. No build, no dependencies. Just open `index.html` in a browser.

## Dev commands

| Command | What |
|---------|------|
| `npx playwright test` | Run all 17 tests headless |
| `npx playwright test --headed` | Run with browser visible |
| `npx playwright test -g "test name"` | Run single test by name |

`npm test` is a dummy — use `npx playwright test` instead.

## Testing quirks

- Tests load the game via `file://` protocol — no server needed
- Config: `playwright.config.mjs` (headless, 800×800 viewport, 30s timeout)
- Test file: `battle-city.spec.mjs` (ESM `.mjs` despite `"type": "commonjs"` in `package.json`)
- `node_modules/` and `test-results/` are gitignored

## Dev cheat keys (for testing without driving game UI)

| Key | Action |
|-----|--------|
| O | Toggle invincibility |
| I | Kill all enemies |
| L | Skip level |
| R | Restart level |
| P | Pause/unpause |
| M | Menu (shows Resume button) |

## Game structure

All logic, rendering, audio, and UI are inside `<script>` in `index.html`. Key DOM elements tests rely on: `#overlay`, `#btn1p`, `#btn2p`, `#btnEndless`, `#btnResume`, `#screen` (canvas), `#panel`, `#lives`, `#level`, `#enemies`, `#hpDisplay`, `#muteBox`.

## Deployment

GitHub Pages at `qnnnn.github.io`. Push to `main` to deploy.
