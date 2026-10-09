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
 * 3. Version plumbing: @version and RG.version must agree, and the last commit
 *    must have bumped @version when it touched src/, otherwise Tampermonkey
 *    silently keeps serving the installed copy and re-pasting is the only fix.
 * 4. The merged seek group: one RG.bm table (no RG.jm/RG.jp), the old jump
 *    setting migrates to a seek profile, and every profile builds a usable
 *    segment plan.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};

/* -- 1. per-module DOM cache ------------------------------------------- */

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

check('first video is driven after hydration (0.2.1 -> 0.2.2)',
    before.driven === 0 && after.driven > 30 && after.pickupMs !== null,
    `before: ${before.driven}/40 ticks, after: ${after.driven}/40 ticks, picked up in ${after.pickupMs}ms`);

/* -- 2. boot cleanup must not eat live UI ------------------------------ */

function loadModules(files, store = {}) {
    const removed = [];
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
    sandbox.document.__removed = removed;
    vm.createContext(sandbox);
    for (const f of files) {
        vm.runInContext(readFileSync(join(root, f), 'utf8'), sandbox, { filename: f });
    }
    return { RG: sandbox.window.RG, document: sandbox.document, removed, sandbox };
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

{
    const { RG, document, removed } = loadModules(['src/00-core.js', 'src/40-ui.js']);

    const leftover = { dataset: {}, remove() { removed.push('leftover'); } };          // previous injection
    const livePanel = { dataset: { rgRun: RG.runId }, remove() { removed.push('panel'); } };
    const liveMenu = { dataset: { rgRun: RG.runId }, remove() { removed.push('menu'); } };
    const liveSidebar = { dataset: { rgRun: RG.runId }, remove() { removed.push('sidebar'); } };
    document.querySelectorAll = () => [leftover, livePanel, liveMenu, liveSidebar];

    RG.ui.installStyles();

    check('installStyles keeps this run\'s panel, menu and sidebar button',
        removed.length === 1 && removed[0] === 'leftover',
        removed.length ? `removed: ${removed.join(', ')}` : 'nothing removed');

    check('boot cleanup would have removed the live panel (the reported bug)',
        (() => {
            removed.length = 0;
            const old = 'old behaviour';
            [leftover, livePanel, liveMenu, liveSidebar].forEach(el => el.remove());
            return removed.includes('panel');
        })(), 'unfiltered cleanup deletes #rg-debug-panel');

    const v = RG.version;
    check('RG.version is exposed for the panel header', typeof v === 'string' && v.length > 0, `version=${v}`);
}

/* -- 3. the one hand-synced pair in the repo ---------------------------- */

{
    const entry = readFileSync(join(root, 'redgifs.user.js'), 'utf8');
    const meta = (entry.match(/@version\s+(\S+)/) || [])[1];
    const boot = (entry.match(/RG\.version\s*=\s*'([^']+)'/) || [])[1];
    check('entry @version matches the RG.version the panel shows', !!meta && meta === boot, `@version=${meta}, RG.version=${boot}`);
}

/* -- 4. a push without a @version bump is invisible to Tampermonkey ----- */

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
        check('last commit bumps @version, or Tampermonkey never installs it',
            srcChanged.length === 0 || cmp(after, before) > 0,
            `src files in HEAD: ${srcChanged.length}, @version ${before} -> ${after}`);
    }
}

/* -- 4. jump + bullet merged into one seek table ------------------------ */

{
    const { RG, sandbox } = loadModules(['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'], {
        'rg_bullet_mode': '0', 'rg_time_jump_val': '2'
    });
    const S = RG.S;

    check('jump and bullet are one table now',
        RG.jm === undefined && RG.jp === undefined && !!RG.bm[12] && !!RG.bm[13] && !!RG.bm[14],
        `profiles: ${Object.keys(RG.bm).length}`);

    check('a saved jump mode migrates to the matching seek profile',
        S.bulletMode === 12 && sandbox.localStorage.getItem('rg_bullet_mode') === '12',
        `rg_time_jump_val=2 -> bulletMode=${S.bulletMode}`);

    check('an existing bullet mode wins over the stale jump key',
        (() => {
            const b = loadModules(['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'], {
                'rg_bullet_mode': '7', 'rg_time_jump_val': '4'
            });
            return b.RG.S.bulletMode === 7 && b.sandbox.localStorage.getItem('rg_time_jump_val') === '';
        })(), 'rg_bullet_mode=7 + rg_time_jump_val=4 -> bulletMode 7, jump key cleared');

    const dur = 20;
    const segs = p => RG.computeBulletSegments(p, dur);
    const covers = p => { const s = segs(p); return s.length > 0 && s.every(x => x.s >= 0 && x.t <= dur && x.t > x.s); };
    const allProfiles = Object.keys(RG.bm).map(Number).filter(v => v !== 0 && v !== 5);

    check('every seek profile yields a valid segment plan',
        allProfiles.every(covers),
        `profiles checked: ${allProfiles.join(',')}`);

    check('dive starts at the dive point and runs to the end',
        (() => { const s = segs(13)[0]; return Math.abs(s.s - Math.min(5, dur * 0.15)) < 0.01 && Math.abs(s.t - (dur - 0.08)) < 0.01; })(),
        JSON.stringify(segs(13)[0]));

    check('tail starts in the last 20% and runs to the end',
        (() => { const s = segs(14)[0]; return s.s >= dur * 0.8 && Math.abs(s.t - (dur - 0.08)) < 0.01; })(),
        JSON.stringify(segs(14)[0]));

    check('rng seek only moves forward, at most jumpBudget times',
        (() => {
            const t = deterministic(loadModules(
                ['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'],
                { 'rg_bullet_mode': '12' }
            ).sandbox);
            const s = t.RG.S;
            s.isAutoNavEnabled = true;
            s.runtimeBulletProfile = 12;
            s.bulletJumped = true;
            s.jumpsRemaining = RG.mc.jumpBudget;
            s.lastTimeJump = 0;
            const v = { duration: dur, currentTime: 1, seeking: false };

            let jumps = 0, backwards = 0, prev = v.currentTime;
            for (let i = 0; i < 20; i++) {
                t.RG.maybeRngSeek(v);
                if (v.currentTime !== prev) { jumps++; if (v.currentTime < prev) backwards++; }
                prev = v.currentTime;
                t.__advance(RG.mc.rngSeek.cd + 1);        // cooldown elapsed
            }
            t.__advance(RG.mc.rngSeek.cd + 1);
            t.RG.maybeRngSeek(v);
            const parked = v.currentTime === prev;         // budget exhausted -> stays put
            t.__advance(RG.mc.rngSeek.cd + 1);
            t.RG.maybeRngSeek(v);

            return jumps === RG.mc.jumpBudget && !backwards && parked && v.currentTime === prev;
        })(), `budget ${RG.mc.jumpBudget}, cooldown ${RG.mc.rngSeek.cd}ms, forward-only`);

    check('rng seek is inert for every other profile',
        (() => {
            const t = deterministic(loadModules(
                ['src/00-core.js', 'src/10-dom.js', 'src/20-player.js'],
                { 'rg_bullet_mode': '1' }
            ).sandbox);
            const s = t.RG.S;
            s.isAutoNavEnabled = true;
            s.runtimeBulletProfile = 1;
            s.jumpsRemaining = 9;
            s.lastTimeJump = 0;
            const v = { duration: dur, currentTime: 1, seeking: false };
            t.RG.maybeRngSeek(v);
            t.__advance(RG.mc.rngSeek.cd + 1);
            t.RG.maybeRngSeek(v);
            return v.currentTime === 1;
        })(), 'profile 1 leaves currentTime untouched');
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);