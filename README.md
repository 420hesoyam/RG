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

## Auto-update (no re-pasting)

`redgifs.user.js` already carries the two keys that let Tampermonkey pull
changes on its own:

```
// @updateURL    .../main/redgifs.user.js   <- polled by the extension
// @downloadURL  .../main/redgifs.user.js   <- installed when @version is newer
```

Two rules decide whether you ever touch the block again:

- **Every push that changes `src/` bumps `@version`** (and the `RG.version`
  line right below the block). Tampermonkey installs a remote script *only*
  when its `@version` is higher than the installed one — a bump-less push is
  invisible to the extension, and re-pasting is then the only fix.
  `node tools/regression.test.mjs` fails the build when a commit touched
  `src/` without bumping it.
- **The polling frequency lives in the extension, not in metadata** — no
  metadata key can shorten it. In Tampermonkey: Settings → update interval
  (*daily* is fine), enable *Automatic installation* (TM 5.5+ splits the check
  from the install), and while iterating set Config Mode → *Advanced* →
  `Externals > Update Interval` to *always*, otherwise the `@require`d
  `src/*.js` files stay cached even after the script itself updates.

Afterwards just reload the redgifs.com tab. The debug panel header shows the
running version (`v0.2.4`), so you can tell at a glance whether the update
landed.

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

- The debug panel (`AUTONAV`, top-left) shows live status, speed, media id, loop
  state and skip statistics. Its header carries the script version.
- `@version` in `redgifs.user.js` is the single source of truth: the entry file
  passes it to `RG.version` for the panel, and `tools/bundle.mjs` injects the
  same value into the local bundle.

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
- DOM-cache and panel regression check: `node tools/regression.test.mjs` — runs
  the real modules in a stub DOM (no dependencies) and covers the first-video
  bug plus the boot cleanup that used to detach the debug panel.

## License

MIT — see [LICENSE](LICENSE).
