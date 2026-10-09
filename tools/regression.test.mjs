/**
 * Regression harness. Runs the real modules in a stub DOM, no dependencies.
 *   node tools/regression.test.mjs
 *
 * 1. DOM cache latching: the first tick can see a module as an empty React
 *    shell. A cache that never re-probes latched the missing <video> and the
 *    tick did nothing for the whole first video.
 * 2. Boot cleanup: ui.installStyles() removed every matching element, which
 *    detached the panel that had just been built - the debug panel silently
 *    stopped opening and updating.
 * 3. Entry contract: @version matches VERSION, no @require is left, and MODULES
 *    lists every src/ file in load order.
 * 4. The loader: fetches, evaluates, caches for offline, and the sync button
 *    cache-busts and reloads.
 * 5. The merged seek group: one RG.bm table (no RG.jm/RG.jp), the old jump
 *    setting migrates to a seek profile, every profile builds a usable plan.
 * 6. A push that touches src/ must bump @version, or Tampermonkey keeps
 *    serving the installed copy.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const check = async (name, ok, detail) => {
    const v = await ok;
    results.push({ name, ok: !!v, detail });
    console.log(`${v ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};
const settle = () => new Promise(r => setTimeout(r, 30));

/* -- 1. per-module DOM cache --------------------------------------------- */

const realNow = Date.now;
let now = 1_700_000_000_000;
Date.now = () => now;
const sleep = ms => { now += ms; };

const connected = new Set();
const documentStub = { contains: el => connected.has(el) };

function makeEl(children = []) {
    return {
        children,
        childElementCount: 0,
        isConnected: true,
        querySelector(sel) {
            for (const c of this.children) if (c.matches(sel)) return c;
            return null;
        },
        matches() { return false; },
        refresh() { this.childElementCount = this.children.length; }
    };
}

const video = Object.assign(makeEl(), { matches: s => s === 'video' });
const countdown = Object.assign(makeEl(), { matches: s => s === '.countdown' });
const module_ = Object.assign(makeEl(), { matches: () => true });
connected.add(module_);
connected.add(video);
connected.add(countdown);

/* the pre-fix cache: invalidated only by an element swap */
function oldGetDomCached() {
    let _dEl = null, _dV = null, _dCd = null;
    return e => {
        if (e !== _dEl || (_dV && !_dV.isConnected) || (_dCd && !documentStub.contains(_dCd))) {
            _dEl = e; _dV = e.querySelector('video'); _dCd = e.querySelector('.countdown');
        }
        return { v: _dV, cd: _dCd };
    };
}

/* the current cache: src/10-dom.js, mirrored so both variants can be timed */
function newGetDomCached() {
    const REPROBE_MS = 250;
    let _dEl = null, _dV = null, _dCd = null, _t = 0;
    return e => {
        if (!e) return { v: null, cd: null };
        const t = Date.now();
        if (e !== _dEl || !_dV || !_dV.isConnected ||
            (_dCd && !documentStub.contains(_dCd)) || t - _t > REPROBE_MS) {
            _dEl = e; _dV = e.querySelector('video'); _dCd = e.querySelector('.countdown'); _t = t;
        }
        return { v: _dV, cd: _dCd };
    };
}

/* one tick drives the video only when the cache hands back a <video> */
function driveTimed(getDomCached) {
    now = 1_700_000_000_000;
    module_.children = []; module_.refresh();
    const cache = getDomCached(module_);

    for (let i = 0; i < 4; i++) { sleep(50); cache(module_); }

    module_.children = [video, countdown]; module_.refresh();
    const hydrateAt = now;
    let driven = 0, pickupMs = null;
    for (let i = 0; i < 40; i++) {
        sleep(50);
        if (cache(module_).v) { driven++; if (pickupMs === null) pickupMs = now - hydrateAt; }
    }
    return { driven, pickupMs };
}

const before = driveTimed(oldGetDomCached);
const after = driveTimed(newGetDomCached);
Date.now = realNow;

await check('first video is driven after hydration (0.2.1 -> 0.2.2)',
    before.driven === 0 && after.driven > 30 && after.pickupMs !== null,
    `before: ${before.driven}/40 ticks, after: ${after.driven}/40 ticks, picked up in ${after.pickupMs}ms`);

/* -- module harness ------------------------------------------------------ */

function loadModules(files, store = {}) {
    const sandbox = {};
    sandbox.window = sandbox;
    sandbox.addEventListener = () => { };
    sandbox.localStorage = {
        _v: { ...store },
        getItem(k) { return k in this._v ? this._v[k] : null; },
        setItem(k, v) { this._v[k] = String(v); }
    };
    sandbox.requestAnimationFrame = cb => cb();
    sandbox.document = {
        addEventListener() { },
        createElement: () => ({ dataset: {}, style: {} }),
        head: { appendChild() { } },
        querySelectorAll: () => []
    };
    vm.createContext(sandbox);
    for (const f of files) {
        vm.runInContext(readFileSync(join(root, f), 'utf8'), sandbox, { filename: f });
    }
    return { RG: sandbox.window.RG, sandbox };
}

/* vm intrinsics (Math/Date) are not properties of the sandbox object, so the
 * clock and the RNG have to be replaced from inside the context. */
function deterministic(ctx) {
    vm.runInContext(`
        window.__rand = () => 0;
        window.__clock = 1700000000000;
        window.__advance = ms => { window.__clock += ms; Date.now = () => window.__clock; };
        Math.random = window.__rand;
        Date.now = () => window.__clock;
    `, ctx);
    return ctx;
}

/* -- 2. boot cleanup must not eat live UI -------------------------------- */

{
    const { RG, sandbox } = loadModules(['src/00-core.js', 'src/40-ui.js']);
    const removed = [];

    const leftover = { dataset: {}, remove() { removed.push('leftover'); } };          // previous injection
    const livePanel = { dataset: { rgRun: RG.runId }, remove() { removed.push('panel'); } };
    const liveMenu = { dataset: { rgRun: RG.runId }, remove() { removed.push('menu'); } };
    const liveSidebar = { dataset: { rgRun: RG.runId }, remove() { removed.push('sidebar'); } };
    sandbox.document.querySelectorAll = () => [leftover, livePanel, liveMenu, liveSidebar];

    RG.ui.installStyles();

    await check('installStyles keeps this run\'s panel, menu and sidebar button',
        removed.length === 1 && removed[0] === 'leftover',
        removed.length ? `removed: ${removed.join(', ')}` : 'nothing removed');

    removed.length = 0;
    [leftover, livePanel, liveMenu, liveSidebar].forEach(el => el.remove());
    await check('unfiltered cleanup would have removed the live panel (the bug)',
        removed.includes('panel'), 'the old rule deleted #rg-debug-panel');

    await check('RG.version is exposed for the panel header',
        typeof RG.version === 'string' && RG.version.length > 0, `version=${RG.version}`);
}

/* -- 3. the entry file contract ------------------------------------------ */

{
    const entry = readFileSync(join(root, 'redgifs.user.js'), 'utf8');
    const meta = (entry.match(/@version\s+(\S+)/) || [])[1];
    const ver = (entry.match(/const VERSION\s*=\s*'([^']+)'/) || [])[1];
    await check('entry @version matches the VERSION the panel shows', !!meta && meta === ver,
        `@version=${meta}, VERSION=${ver}`);

await check('no @require in the metadata block',
        !/@require\b/.test(entry.slice(0, entry.indexOf('// ==/UserScript=='))),
        '@require lines: ' + (entry.slice(0, entry.indexOf('// ==/UserScript==')).match(/@require\b/g) || []).length);

    const listed = [...entry.matchAll(/'([0-9]{2}-[a-z-]+\.js)'/g)].map(m => m[1]);
    const onDisk = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
    await check('MODULES lists every src/ file, in load order',
        listed.join() === onDisk.join(), `listed ${listed.length}: ${listed.join(', ')}`);
}

/* -- 4. the loader ------------------------------------------------------- */

const ENTRY_CODE = (() => {
    const e = readFileSync(join(root, 'redgifs.user.js'), 'utf8');
    return e.slice(e.indexOf('/* ===='));
})();

function makeLoaderCtx({ fail = null, store = {} } = {}) {
    const ctx = { console };
    ctx.window = ctx;
    ctx.addEventListener = () => { };
    ctx.setTimeout = () => 0;
    ctx.location = { reload() { ctx.__reloaded = true; } };
    ctx.localStorage = {
        _v: { ...store },
        getItem(k) { return k in this._v ? this._v[k] : null; },
        setItem(k, v) { this._v[k] = String(v); }
    };
    ctx.document = {
        addEventListener() { },
        querySelectorAll: () => [],
        createElement: () => ({ style: {}, remove() { } }),
        body: { appendChild() { } }
    };
    ctx.__fetched = [];
    ctx.__banners = [];
    ctx.fetch = url => {
        ctx.__fetched.push(url);
        const name = url.split('/').pop().split('?')[0];
        if (name === 'redgifs.user.js') {
            return Promise.resolve({ ok: true, text: () => Promise.resolve('// @version 9.9.9\n') });
        }
        if (fail && name === fail) return Promise.reject(new Error('offline'));
        let src;
        try { src = readFileSync(join(root, 'src', name), 'utf8'); } catch (_) { return Promise.reject(new Error('404')); }
        return Promise.resolve({ ok: true, text: () => Promise.resolve(src) });
    };
    vm.createContext(ctx);
    vm.runInContext(ENTRY_CODE, ctx, { filename: 'redgifs.user.js' });
    return ctx;
}

{
    const ctx = makeLoaderCtx();
    const moduleCount = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).length;
    await settle();

    await check('loader fetches every module from src/',
        ctx.__fetched.length === moduleCount, `${ctx.__fetched.length} requests`);

    await check('boot fetches without a cache-buster',
        !ctx.__fetched.some(u => u.includes('?t=')), 'HTTP cache is used on a normal load');

    await check('loader evaluates the modules into window.RG',
        !!(ctx.RG && ctx.RG.start && ctx.RG.computeBulletSegments && ctx.RG.performSkip && ctx.RG.ensurePanel),
        `RG keys: ${Object.keys(ctx.RG || {}).length}`);

    await check('loader caches the sources for the offline fallback',
        (ctx.localStorage.getItem('rg_mod_cache') || '').includes('00-core.js'), 'rg_mod_cache written');

await check('sync cache-busts every module and reloads',
        ctx.RG.syncAndReload().then(() => {
            const synced = ctx.__fetched.slice(-moduleCount);
            return synced.length === moduleCount &&
                synced.every(u => u.includes('?t=')) &&
                !!ctx.__reloaded;
        }), '?t= on all ' + moduleCount + ' + location.reload()');

    const seeded = JSON.parse(ctx.localStorage.getItem('rg_mod_cache'));
    const offline = makeLoaderCtx({ fail: '30-skip.js', store: { rg_mod_cache: JSON.stringify(seeded) } });
    await settle();
    await check('an unreachable module falls back to the cached copy',
        !!(offline.RG && offline.RG.performSkip), 'boots from rg_mod_cache with one module down');
}

{
    const empty = makeLoaderCtx({ fail: '30-skip.js' });
    await settle();
    await check('no cache and no network does not half-start the script',
        !empty.RG || !empty.RG.performSkip, 'RG stays empty instead of throwing');
}

/* -- 5. the merged seek group -------------------------------------------- */

{
    const { RG } = loadModules(['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'],
        { 'rg_bullet_mode': '0', 'rg_time_jump_val': '2' });
    const S = RG.S;

    await check('jump and bullet are one table now',
        RG.jm === undefined && RG.jp === undefined && !!RG.bm[12] && !!RG.bm[13] && !!RG.bm[14],
        `profiles: ${Object.keys(RG.bm).length}`);

    await check('a saved jump mode migrates to the matching seek profile',
        S.bulletMode === 12, `rg_time_jump_val=2 -> bulletMode=${S.bulletMode}`);

    const { RG: winner } = loadModules(['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'],
        { 'rg_bullet_mode': '7', 'rg_time_jump_val': '4' });
    await check('an existing bullet mode wins over the stale jump key',
        winner.S.bulletMode === 7, `rg_bullet_mode=7 + rg_time_jump_val=4 -> ${winner.S.bulletMode}`);

    const dur = 20;
    const segs = p => RG.computeBulletSegments(p, dur);
    const covers = p => { const s = segs(p); return s.length > 0 && s.every(x => x.s >= 0 && x.t <= dur && x.t > x.s); };
    const allProfiles = Object.keys(RG.bm).map(Number).filter(v => v !== 0 && v !== 5);

    await check('every seek profile yields a valid segment plan', allProfiles.every(covers),
        `profiles checked: ${allProfiles.join(',')}`);

    await check('dive starts at the dive point and runs to the end',
        (() => { const s = segs(13)[0]; return Math.abs(s.s - Math.min(5, dur * 0.15)) < 0.01 && Math.abs(s.t - (dur - 0.08)) < 0.01; })(),
        JSON.stringify(segs(13)[0]));

    await check('tail starts in the last 20% and runs to the end',
        (() => { const s = segs(14)[0]; return s.s >= dur * 0.8 && Math.abs(s.t - (dur - 0.08)) < 0.01; })(),
        JSON.stringify(segs(14)[0]));
}

{
    const ctx = deterministic(loadModules(['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'],
        { 'rg_bullet_mode': '12' }).sandbox);
    const RG = ctx.RG, S = RG.S, dur = 20;
    S.isAutoNavEnabled = true;
    S.runtimeBulletProfile = 12;
    S.bulletJumped = true;
    S.jumpsRemaining = RG.mc.jumpBudget;
    S.lastTimeJump = 0;
    const v = { duration: dur, currentTime: 1, seeking: false };

    let jumps = 0, backwards = 0, prev = v.currentTime;
    for (let i = 0; i < 20; i++) {
        RG.maybeRngSeek(v);
        if (v.currentTime !== prev) { jumps++; if (v.currentTime < prev) backwards++; }
        prev = v.currentTime;
        ctx.__advance(RG.mc.rngSeek.cd + 1);
    }
    ctx.__advance(RG.mc.rngSeek.cd + 1);
    RG.maybeRngSeek(v);
    const parked = v.currentTime === prev;

    await check('rng seek only moves forward, at most jumpBudget times',
        jumps === RG.mc.jumpBudget && !backwards && parked,
        `${jumps} jumps, cooldown ${RG.mc.rngSeek.cd}ms, forward-only`);
}

{
    const ctx = deterministic(loadModules(['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'],
        { 'rg_bullet_mode': '1' }).sandbox);
    const RG = ctx.RG, S = RG.S;
    S.isAutoNavEnabled = true;
    S.runtimeBulletProfile = 1;
    S.jumpsRemaining = 9;
    S.lastTimeJump = 0;
    const v = { duration: 20, currentTime: 1, seeking: false };
    RG.maybeRngSeek(v);
    ctx.__advance(RG.mc.rngSeek.cd + 1);
    RG.maybeRngSeek(v);

    await check('rng seek is inert for every other profile', v.currentTime === 1,
        'profile 1 leaves currentTime untouched');
}

/* -- 6. a push without a version bump is invisible to Tampermonkey -------- */

{
    const git = (...args) => {
        try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }); }
        catch (_) { return null; }
    };
    const changed = git('diff', '--name-only', 'HEAD~1', 'HEAD');
    if (changed === null) {
        console.log('SKIP  last commit bumps @version (no git history here)');
    } else {
        const srcChanged = changed.split(/\r?\n/).filter(f => /^src\//.test(f));
        const versionAt = ref => {
            const s = git('show', `${ref}:redgifs.user.js`);
            return s && (s.match(/@version\s+(\S+)/) || [])[1];
        };
        const cmp = (a, b) => {
            const pa = String(a || '').split('.').map(Number), pb = String(b || '').split('.').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                const d = (pa[i] || 0) - (pb[i] || 0);
                if (d) return Math.sign(d);
            }
            return 0;
        };
        const before = versionAt('HEAD~1'), after = versionAt('HEAD');
        await check('last commit bumps @version, or Tampermonkey never installs it',
            srcChanged.length === 0 || cmp(after, before) > 0,
            `src files in HEAD: ${srcChanged.length}, @version ${before} -> ${after}`);
    }
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);