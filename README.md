# RedGifs Auto Production

Tampermonkey userscript that automates navigation on redgifs.com: creative
bullet-time sequencing, time jumps, loop modes, speed control, and one blocklist
that handles both creators and feed filler modules.

## Install

1. This repo is `github.com/420hesoyam/RG` and must stay **public** — the loader
   fetches the modules over plain HTTPS with no auth token, so a private repo
   returns 404 and nothing loads.
2. Open `redgifs.user.js`, copy the whole contents.
3. Tampermonkey → Create new script → paste → Save. Reload redgifs.com.

## Updating

The `src/*.js` modules are **fetched at runtime**, not `@require`d, so a plain
reload already runs the newest `main`. That is deliberate: Tampermonkey caches
`@require`d files until it installs a new script version, which is how a pushed
fix ends up invisible until you re-paste.

- **The sync button** in the AUTONAV panel header is the only click you need:
  it re-fetches every module with a cache-busted request, stores them and
  reloads. It reports the remote `@version` first; the header then shows the
  version that is actually running.
- The last good copy of every module is kept in `localStorage`
  (`rg_mod_cache`), so an offline start still works.
- Tampermonkey's own update now only keeps its copy of the entry file current.
  It polls `@updateURL` on its own schedule (Settings → update interval); no
  metadata key can shorten that. It installs only when `@version` is higher
  than the installed one, so every push that changes `src/` must bump
  `@version` and `VERSION` in the entry — `node tools/regression.test.mjs`
  fails when a commit touched `src/` without it.

While testing, point `REPO` in the entry at a tag
(`.../refs/tags/v0.2.6/...`) so a broken push can't break a working install.
raw.githubusercontent serves tags fine.

## Install (single file, no GitHub)

Build a bundle and paste that:

```bash
node tools/bundle.mjs
# -> dist/redgifs.local.user.js  (paste into Tampermonkey)
```

The bundle concatenates `src/*` and skips the loader, so it needs no network.

## Layout

```
redgifs.user.js     entry: metadata + module loader (fetch/eval/cache) + sync
src/
  00-core.js        config, mode tables, state, storage, utils, blocklist
  10-dom.js         page probes (active module, media id, creator, fillers), sidebar button
  20-player.js      playback: rate, seek sequencer, rng seek, loop policy, mode setters
  30-skip.js        stats + the actual next-video action
  40-ui.js          UI kit: icons, stylesheet, show/hide, drag, dropdowns
  50-panel.js       AUTONAV debug panel
  60-menu.js        CONTROL CENTER overlay (lazy-built)
  90-boot.js        listeners + the 50ms tick
tools/bundle.mjs    dev-only bundler
tools/regression.test.mjs  regression checks (node, no dependencies)
docs/ARCHITECTURE.md
```

Filename prefixes are the load order — the `MODULES` array in the entry
evaluates top to bottom, so insertion is trivial: `25-something.js` lands
between player and skip (and must be added to `MODULES`; the regression suite
fails if the two drift apart).

Shared state lives on one namespace: `window.RG`. Modules publish a short name
and consume it (`RG.S` state, `RG.cfg` tunables, `RG.bm/lm/pm` mode tables,
`RG.u` utils). Nothing is global besides `RG` itself.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the contract between
modules and the rules for adding one.

## Modes

| Group | Modes |
|---|---|
| Bullet (seek) | Off, Burst, Climax, Mid-Peak, Quad-Hop, RNG Roulette, Slow-Mo Replay, Build-Up Ramp, Trailer Hook, Bullet-Time, Double-Take, Trio-Hop, RNG Seek, Dive Skip, Tail Preview |
| Loops | 1x, 2x, 3x, RNG (1-4x), Binge (infinite), Timed 30s, Timed 60s, Pass & Skip |
| Photos | Skip Photos, Instant Skip, Watch 3.5s |

Jump and Bullet used to be separate dropdowns and are now one `Bullet` group:
RNG Seek is the old chance-based jump, Dive Skip and Tail Preview are the old
jump seeks. An existing jump setting migrates to the matching profile on the
first load after the update.

Click a grid tile to toggle it on/off (returns to your last active mode), or
click its badge to open the full picker.

## Blocklist & fillers

`BLOCKLIST & FILLERS` in the control center handles both:

- **Creator blocklist** — add by username, or block whoever is on screen.
- **Feed fillers** — toggle skipping of trending niches, trending creators,
  live-cam modules and OnlyFans promo modules. A `Block` tile is the master
  off-switch for all skipping.

## Debug panel

The `AUTONAV` panel (top-left) shows live status, speed, media id, loop state
and skip statistics. Its header carries the running version and the sync /
reset / close buttons. `@version` in `redgifs.user.js` is the single source of
truth: the entry passes it to `RG.version` for the panel, and `tools/bundle.mjs`
injects the same value into the local bundle.

## Settings storage

Everything persists in `localStorage` under `rg_*` keys (`rg_bullet_mode`,
`rg_loop_setting`, `rg_blocked_users`, `rg_mod_cache`, ...). `RG.st` wraps it,
so a reset is deleting those keys from devtools.

## Development

- Edit modules in `src/`, then run `node tools/regression.test.mjs`. Reload the
  page (or press sync) — no build step needed for the shipped path.
- No dependencies, no framework. Plain ES5-compatible IIFE modules that attach
  to `window.RG`.
- `node tools/bundle.mjs` produces the single-file local build.
- Syntax check all modules: `for f in src/*.js; do node --check "$f"; done`
  (Git Bash) or `node --check src\00-core.js` per file on PowerShell.
- Regression suite: `node tools/regression.test.mjs` — runs the real modules and
  the real loader in a stub DOM (no dependencies). Covers the first-video cache
  bug, the boot cleanup that used to detach the panel, the entry/module-list
  contract, the loader's fetch/eval/cache/reload behaviour and the merged seek
  group.

## License

MIT — see [LICENSE](LICENSE).