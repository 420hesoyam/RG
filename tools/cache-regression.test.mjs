/**
 * Regression harness for the first-video bug: the per-module DOM cache used to
 * latch `null` when the active module was still an empty React shell, so the
 * <video> that appeared a tick or two later was never picked up and the tick
 * bailed out (`if (!v) return`) for the entire first video.
 *
 * Run: node tools/cache-regression.test.mjs
 */

const realNow = Date.now;
let now = 1_700_000_000_000;
Date.now = () => now;
const sleep = ms => { now += ms; };

const connected = new Set();
const document = { contains: el => connected.has(el) };

function makeEl(children = []) {
    const e = {
        children,
        childElementCount: 0,
        isConnected: true,
        find(sel) {
            for (const c of this.children) if (c.matches(sel)) return c;
            return null;
        },
        querySelector(sel) { return this.find(sel); },
        matches(sel) { return sel === this.tag && (!sel.startsWith('.') || sel === '.' + this.cls); }
    };
    e.refresh = () => { e.childElementCount = e.children.length; };
    return e;
}

const video = Object.assign(makeEl(), { tag: 'video', matches: s => s === 'video' });
const countdown = Object.assign(makeEl(), { tag: 'span', cls: 'countdown', matches: s => s === '.countdown' });

const module = Object.assign(makeEl(), { tag: 'div', cls: 'GifPreview', matches: s => s === 'div' || s === '.GifPreview' });
connected.add(module);
connected.add(video);
connected.add(countdown);

const hydrate = () => { module.children = [video, countdown]; module.refresh(); };

/* the old cache: only element change / isConnected invalidated it */
function oldGetDomCached(el) {
    let _dEl = null, _dV = null, _dCd = null;
    return e => {
        if (e !== _dEl || (_dV && !_dV.isConnected) || (_dCd && !document.contains(_dCd))) {
            _dEl = e; _dV = e.querySelector('video'); _dCd = e.querySelector('.countdown');
        }
        return { v: _dV, cd: _dCd };
    };
}

/* the fixed cache: also re-probes while the video is absent and on a timer */
function newGetDomCached(el) {
    const REPROBE_MS = 250;
    let _dEl = null, _dV = null, _dCd = null, _t = 0;
    return e => {
        if (!e) return { v: null, cd: null };
        const t = Date.now();
        if (e !== _dEl || !_dV || !_dV.isConnected ||
            (_dCd && !document.contains(_dCd)) || t - _t > REPROBE_MS) {
            _dEl = e; _dV = e.querySelector('video'); _dCd = e.querySelector('.countdown'); _t = t;
        }
        return { v: _dV, cd: _dCd };
    };
}

/* drives one tick: the tick does nothing at all unless a <video> comes back */
function run(label, getDomCached) {
    now = 1_700_000_000_000;
    module.children = []; module.refresh();

    const cache = getDomCached(module);
    let drivenTicksBeforeHydrate = 0;
    for (let i = 0; i < 4; i++) { sleep(50); if (cache(module).v) drivenTicksBeforeHydrate++; }

    hydrate();                                            // React fills the module
    const hydrateAt = now;
    let drivenTicksAfterHydrate = 0;
    let firstDrivenAt = null;
    for (let i = 0; i < 40; i++) {
        sleep(50);
        if (cache(module).v) { drivenTicksAfterHydrate++; if (firstDrivenAt === null) firstDrivenAt = now - hydrateAt; }
    }
    return { label, drivenTicksBeforeHydrate, drivenTicksAfterHydrate, pickupMs: firstDrivenAt };
}

const results = [run('before (0.2.1)', oldGetDomCached), run('after  (0.2.2)', newGetDomCached)];
Date.now = realNow;

for (const r of results) {
    console.log(`${r.label.padEnd(16)} driven before hydrate: ${r.drivenTicksBeforeHydrate}` +
        ` | driven in 2s after hydrate: ${String(r.drivenTicksAfterHydrate).padStart(2)}` +
        ` | picked up video after: ${r.pickupMs === null ? 'NEVER' : r.pickupMs + 'ms'}`);
}

const before = results[0], after = results[1];
const ok = before.drivenTicksAfterHydrate === 0 && after.drivenTicksAfterHydrate > 30 && after.pickupMs !== null;
console.log(ok ? '\nPASS: the first video is now driven after hydration.' : '\nFAIL');
process.exit(ok ? 0 : 1);