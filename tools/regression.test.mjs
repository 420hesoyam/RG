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
 */

import { readFileSync } from 'node:fs';
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

function loadModules(files) {
    const removed = [];
    const sandbox = {};
    sandbox.window = sandbox;
    sandbox.localStorage = { getItem: () => null, setItem: () => { } };
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
    return { RG: sandbox.window.RG, document: sandbox.document, removed };
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

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);