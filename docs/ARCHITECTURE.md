# Architecture

## Why this shape

A userscript that is `@require`d is not a module system — every file shares one
global scope and runs top to bottom. Two constraints follow:

1. **Order is load order.** `@require` executes in header order. Filename
   prefixes (`00-`, `10-`, ... `90-`) encode that order so the repo stays
   readable and a new file can be slotted in without touching the header's
   meaning.
2. **One namespace, many modules.** Each file is an IIFE that takes `window.RG`
   and publishes only what later files need. Everything is reachable from the
   console as `RG.*` for debugging, but nothing leaks as a bare global.

Modules never require a build step. If `@require` breaks, the bundle is a
concatenation fallback (`tools/bundle.mjs`).

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
| `RG.mc` | mode config that isn't a dropdown list (dive seconds, binge cap, pass skip) |
| `RG.jp` | time-jump profiles: cooldown, chance, min/max fraction of duration |
| `RG.bm` / `RG.jm` / `RG.lm` / `RG.pm` | bullet / jump / loop / photo mode tables |
| `RG.S` | all state — persisted settings plus runtime fields |
| `RG.st` | `localStorage` wrapper: `get`, `set`, `num`, `int`, `bool`, `json` |
| `RG.bset`, `RG.blk` | blocked-user Set + add/remove/toggleFiller |
| `RG.u` | `debounce`, `clamp`, `rnd`, `rint`, `tag`, `on`, `click`, `css` |
| `RG.$` | `getElementById` |
| `RG.ui` | icons, stylesheet, `show`, `flashUpdate`, `drag`, `clampToViewport`, `showDropdown`, `closeDropdown` |
| `RG.panel`, `RG.updateDebugPanel`, `RG.setDebug`, `RG.resetDebugPosition` | debug panel |
| `RG.menu`, `RG.getOrCreateMenu`, `RG.refresh`, `RG.refreshMenu` | control center |
| `RG.getActiveEl*`, `RG.getMediaId`, `RG.extractUser*`, `RG.getDomCached`, `RG.isImageEl`, `RG.checkFillerBlocked`, `RG.ensureUIExists` | DOM probes |
| `RG.setRate`, `RG.applyActiveSpeed`, `RG.handleNewVideo`, `RG.commitBullet`, `RG.tryBulletJump`, `RG.bulletFinished`, `RG.attemptTimeJump`, `RG.loopShouldContinue`, `RG.applyLoopEffects`, `RG.setLoopMode`, `RG.applyBulletMode`, `RG.applyJumpMode`, `RG.setPhotoMode` | playback |
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
  invalidated by `isConnected`.
- `isImageEl` uses a `WeakMap` keyed by element; `extractUserCached` memoizes
  the last (element, result) pair.

If you add a probe, cache it the same way or accept the layout cost.

## UI conventions

- All UI is prefixed `rg-` and scoped to a panel element; no global CSS.
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
3. Add one `@require` line to `redgifs.user.js` in the matching position.
4. Re-run `node tools/bundle.mjs` and `node --check` on the new file.

Adding a mode is cheaper: add an entry to the relevant table in `00-core.js`
(`RG.bm` / `RG.jm` / `RG.lm` / `RG.pm`), then add a `case` in
`RG.computeBulletSegments` if it's a bullet profile. The dropdowns, badges,
sanitisation and last-active memory all read from the table.
