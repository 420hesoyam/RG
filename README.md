# RedGifs Auto Production

Tampermonkey userscript that automates navigation on redgifs.com: creative
bullet-time sequencing, time jumps, loop modes, speed control, and one blocklist
that handles both creators and feed filler modules.

## Install (multi-file, via @require)

1. This repo is `github.com/420hesoyam/RG` and must stay **public** —
   Tampermonkey fetches `@require` over plain HTTPS with no auth token, so a
   private repo returns 404 and every module silently fails to load
   (`RG is not defined`).
2. Open `redgifs.user.js`, copy the whole contents.
3. Tampermonkey → Create new script → paste → Save. Reload redgifs.com.

While testing, use the `main` branch. Once it works, switch the `@require` lines
to a pinned tag (`.../refs/tags/v0.2.0/...`) so a broken push can't break a
working install. raw.githubusercontent serves tags fine.

## Install (single file, no GitHub)

Build a bundle and paste that:

```bash
node tools/bundle.mjs
# -> dist/redgifs.local.user.js  (paste into Tampermonkey)
```

The bundle is self-contained and needs no `@require` lines.

## Layout

```
redgifs.user.js     entry: metadata + @require list + RG.start()
src/
  00-core.js        config, mode tables, state, storage, utils, blocklist
  10-dom.js         page probes (active module, media id, creator, fillers), sidebar button
  20-player.js      playback: rate, bullet sequencer, time jumps, loop policy, mode setters
  30-skip.js        stats + the actual next-video action
  40-ui.js          UI kit: icons, stylesheet, show/hide, drag, dropdowns
  50-panel.js       AUTONAV debug panel
  60-menu.js        CONTROL CENTER overlay (lazy-built)
  90-boot.js        listeners + the 50ms tick
tools/bundle.mjs    dev-only bundler
docs/ARCHITECTURE.md
```

Filename prefixes are the load order (`@require` executes top to bottom), so
insertion is trivial: `25-something.js` lands between player and skip.

Shared state lives on one namespace: `window.RG`. Modules publish a short name
and consume it (`RG.S` state, `RG.cfg` tunables, `RG.bm/jm/lm/pm` mode tables,
`RG.u` utils). Nothing is global besides `RG` itself.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the contract between
modules and the rules for adding one.

## Modes

| Group | Modes |
|---|---|
| Bullet | Off, Burst, Climax, Mid-Peak, Quad-Hop, RNG Roulette, Slow-Mo Replay, Build-Up Ramp, Trailer Hook, Bullet-Time, Double-Take, Trio-Hop |
| Jump | Off, Low Chance, Regular, RNG, Dive Skip, Tail Preview |
| Loops | 1x, 2x, 3x, RNG (1-4x), Binge (infinite), Timed 30s, Timed 60s, Pass & Skip |
| Photos | Skip Photos, Instant Skip, Watch 3.5s |

Click a grid tile to toggle it on/off (returns to your last active mode), or
click its badge to open the full picker.

## Blocklist & fillers

`BLOCKLIST & FILLERS` in the control center handles both:

- **Creator blocklist** — add by username, or block whoever is on screen.
- **Feed fillers** — toggle skipping of trending niches, trending creators,
  live-cam modules and OnlyFans promo modules. A `Block` tile is the master
  off-switch for all skipping.

## Settings storage

Everything persists in `localStorage` under `rg_*` keys (`rg_bullet_mode`,
`rg_loop_setting`, `rg_blocked_users`, ...). `RG.st` wraps it, so a reset is
deleting those keys from devtools.

## Development

- Edit modules in `src/`, rebuild with `node tools/bundle.mjs`, reload the page.
- No build step, no dependencies, no framework. Plain ES5-compatible IIFE
  modules that attach to `window.RG`.
- Syntax check all modules: `for f in src/*.js; do node --check "$f"; done`
  (Git Bash) or `node --check src\00-core.js` per file on PowerShell.
- DOM-cache regression check: `node tools/cache-regression.test.mjs` — simulates
  a module that hydrates after the tick first saw it (the first-video bug).

## License

MIT — see [LICENSE](LICENSE).
