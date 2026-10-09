# Architecture

## Why this shape

The userscript runs as one shared global scope, and two constraints follow:

1. **Order is load order.** The `MODULES` array in `redgifs.user.js` is
   evaluated top to bottom. Filename prefixes (`00-`, `10-`, ... `90-`) encode
   that order so the repo stays readable and a new file can be slotted in
   without touching the meaning of anything else.
2. **One namespace, many modules.** Each file is an IIFE that takes `window.RG`
   and publishes only what later files need. Everything is reachable from the
   console as `RG.*` for debugging, but nothing leaks as a bare global.

The entry file fetches `src/*.js` itself and evaluates each one with an indirect
`eval` instead of declaring `@require`. That is deliberate: Tampermonkey caches
`@require`d files until it installs a new script version, so a pushed fix can sit
in that cache and a reload keeps running yesterday's code. Fetching at runtime
means the newest `main` is what runs, and the AUTONAV panel's sync button can
cache-bust and reload. The last good copy of every module is kept in
`localStorage` (`rg_mod_cache`) so an offline start still works.

Consequences to keep in mind:

- The loader is inline in `redgifs.user.js`, not in `src/` — `src/00-core.js` is
  itself fetched, so nothing in `src/` can exist before it runs.
- redgifs.com sends no CSP, so `eval` is allowed. If that ever changes the
  loader breaks first and loudest.
- `tools/regression.test.mjs` fails if `MODULES` and `src/` drift apart, so a new
  module cannot be added and forgotten.

For local testing, `tools/bundle.mjs` concatenates `src/*` into a single file
instead, skipping the loader entirely.

## Layers

```
90-boot     policy / tick        depends on everything
60-menu     control center UI    50-panel, 40-ui, 20-player, 10-dom
50-panel    debug panel UI       40-ui, 00-core
40-ui       presentational kit   00-core
30-skip     navigation action    00-core, 10-dom
20-player   playback control     00-core, 10-dom
10-dom      page probes          00-core
00-core     config/state/utils   nothing
```

Direction of dependencies is strictly downward. The only exceptions are lazy
`RG.*` lookups made at click/tick time (e.g. `50-panel` calling
`RG.updateDebugPanel`), which is why `00-core` defines `RG.refresh` as an
optional hook (`RG.refresh && RG.refresh()`) instead of importing the UI.

## The `RG` namespace

| Key | Meaning |
|---|---|
| `RG.cfg` | timing tunables in ms |
| `RG.mc` | mode config that isn't a dropdown list (dive seconds, binge cap, pass skip, rng-seek chance/cd, jump budget) |
| `RG.bm` / `RG.lm` / `RG.pm` | seek / loop / photo mode tables |
| `RG.S` | all state — persisted settings plus runtime fields |
| `RG.st` | `localStorage` wrapper: `get`, `set`, `num`, `int`, `bool`, `json` |
| `RG.bset`, `RG.blk` | blocked-user Set + add/remove/toggleFiller |
| `RG.u` | `debounce`, `clamp`, `rnd`, `rint`, `tag`, `on`, `click`, `css` |
| `RG.$` | `getElementById` |
| `RG.modules`, `RG.syncAndReload`, `RG.fetchRemoteVersion` | entry-file loader: module list, cache-busted sync + reload, remote `@version` probe |
| `RG.version` | script version, from `VERSION` next to the `@version` in the entry |
| `RG.runId` | per-run token; every element this run owns carries it as `data-rg-run` |
| `RG.ui` | icons, stylesheet, `show`, `flashUpdate`, `drag`, `clampToViewport`, `showDropdown`, `closeDropdown` |
| `RG.panel`, `RG.ensurePanel`, `RG.syncModules`, `RG.updateDebugPanel`, `RG.setDebug`, `RG.resetDebugPosition` | debug panel |
| `RG.menu`, `RG.getOrCreateMenu`, `RG.refresh`, `RG.refreshMenu` | control center |
| `RG.getActiveEl*`, `RG.getMediaId`, `RG.extractUser*`, `RG.getDomCached`, `RG.isImageEl`, `RG.checkFillerBlocked`, `RG.ensureUIExists` | DOM probes |
| `RG.setRate`, `RG.applyActiveSpeed`, `RG.handleNewVideo`, `RG.commitBullet`, `RG.tryBulletJump`, `RG.maybeRngSeek`, `RG.bulletFinished`, `RG.loopShouldContinue`, `RG.applyLoopEffects`, `RG.setLoopMode`, `RG.applyBulletMode`, `RG.setPhotoMode` | playback |
| `RG.performSkip` | navigation action |
| `RG.start` | boot |

## State layout

`RG.S` mixes two lifetimes on purpose, and each group is commented in
`00-core.js`:

- **Persisted settings** mirror `rg_*` keys. Write them through `RG.setLoopMode`
  and friends, never directly — those setters also update the panel.
- **Runtime fields** (`currentVideoId`, `bulletSegments`, `globalCooldownEnd`,
  `stats`, ...) are never persisted and are reset by `RG.handleNewVideo` when
  the active media changes. `handleNewVideo` is the single place new media is
  initialised.

## The tick

`90-boot.js` runs `tick()` every 50ms and is intentionally policy-only. Order
matters and is fixed:

1. resolve active module (`RG.getActiveElCached`, invalidated on scroll/resize)
2. filler check → blocked-user check (both may skip and return)
3. inject sidebar button if missing
4. photo branch, or video branch
5. video branch: rate → bullet jump → dive → finished detection → safety locks →
   time jump → loop-or-skip

Early `return` after a skip is what keeps cooldowns from stacking. Don't add
work before step 2; it's the hot path and runs 20x a second.

## Caching

Two caches exist because the selectors are expensive at 20Hz:

- `_actEl` (`RG.getActiveElCached`) — the active module, re-resolved at most
  once per second, or immediately on scroll/resize or after a skip
  (`RG.invalidateActive`).
- `RG.getDomCached` — `<video>` and `.countdown` for one module at a time,
  invalidated by `isConnected`, by a missing `<video>`, and by a 250ms
  re-probe timer.
- `isImageEl` uses a `WeakMap` keyed by element and only memoizes hydrated
  modules (an element with no children stays uncached); `extractUserCached`
  memoizes the last (element, result) pair.

React hydrates a module in place, so a probe can legitimately run against an
empty shell before `<video>`/`.countdown` exist. Any cache keyed on a module
element must re-probe while the answer would be "not there yet", otherwise it
latches the pre-hydration answer — that is what made the first video of a
session undrivable until the user skipped manually.

If you add a probe, cache it the same way or accept the layout cost.

## UI conventions

- All UI is prefixed `rg-` and scoped to a panel element; no global CSS.
- The panel is built on first use (`RG.ensurePanel`) and rebuilt if it leaves the
  document, so nothing may cache the node — `RG.panel` is a getter for that
  reason. `RG.getOrCreateMenu` follows the same rule for the control center.
- Every element matched by the boot-time cleanup in `ui.installStyles` carries
  `data-rg-run = RG.runId`. The cleanup only removes untagged leftovers from a
  previous injection; deleting tagged nodes detaches the live panel and the
  panel silently stops updating.
- Both panels share `rg-panel` / `rg-panel-anim` / `rg-card` / `rg-row` /
  `rg-badge` / `rg-switch` / `rg-icobtn` from the single stylesheet in
  `40-ui.js`.
- The control center is built lazily on first sidebar click (`RG.getOrCreateMenu`)
  and refreshes via an updater array: each widget pushes a function that reads
  state and writes the DOM. State changes never poke the DOM directly — they
  call `RG.refresh()`.
- `RG.updateDebugPanel` is throttled to 200ms via `RG.setDebug`; call
  `RG.updateDebugPanel` directly only for user-initiated changes.
- Position persistence is always `ui.savePos(key)(el)` or
  `ui.clampToViewport(el, key)` so the JSON shape stays `{top, left}`.

## Adding a module

1. Name it `<NN>-name.js` with the right `NN` prefix.
2. IIFE over `window.RG`, `'use strict'`, publish a `RG.*` name.
3. Add it to the `MODULES` array in `redgifs.user.js` in the right position —
   the regression suite fails if `src/` and `MODULES` disagree.
4. Re-run `node tools/bundle.mjs` and `node tools/regression.test.mjs`.

Adding a mode is cheaper: add an entry to the relevant table in `00-core.js`
(`RG.bm` / `RG.lm` / `RG.pm`), then add a `case` in
`RG.computeBulletSegments` if it's a seek profile. The dropdowns, badges,
sanitisation and last-active memory all read from the table.

## Seeking is one group

Jump and bullet were two dropdowns doing the same thing — "show part of this
video, then move on" — so they were merged into the single `RG.bm` table
(0.2.5). Every profile is now a segment plan; there is no separate jump state,
setter or key.

| Was | Now |
|---|---|
| Jump `Low Chance` / `Regular` / `RNG Jump Chance` | `12` RNG Seek — a random head start plus chance-based forward jumps (`RG.mc.rngSeek`) |
| Jump `Dive Skip` | `13` Dive — one segment starting at `RG.mc.dive.seconds` |
| Jump `Tail Preview` | `14` Tail — one segment at the end of the video |

Old `rg_time_jump_val` / `rg_last_jump_val` are read once by the migration in
`00-core.js` and cleared, so an existing jump setting becomes the matching seek
profile instead of silently turning off. `RG.jm`, `RG.jp`, `RG.applyJumpMode`
and `RG.attemptTimeJump` are gone; `RG.maybeRngSeek` runs inside
`RG.tryBulletJump`, which the tick already calls.
