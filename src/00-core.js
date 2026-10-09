/* ==========================================================================
 * RG · 00 CORE
 * Namespace, tunables, mode tables, persistent state, storage, tiny utils.
 * Loads first. No DOM access, no side effects besides building RG.cfg/state.
 * ========================================================================== */
window.RG = window.RG || {};
(function (RG) {
    'use strict';

    /* -- identity -------------------------------------------------------- */
    /* @version lives in the entry file; redgifs.user.js sets it next to
     * RG.start() and tools/bundle.mjs injects it from the same metadata block.
     * 'dev' only shows up when the modules are loaded without an entry file. */
    RG.version = RG.version || 'dev';
    /* Tags every element this run owns, so boot-time cleanup can drop the
     * leftovers of a previous injection without eating our own UI. */
    RG.runId = 'r' + Math.random().toString(36).slice(2, 9);

    /* -- tunables (ms unless noted) ------------------------------------- */
    RG.cfg = {
        minWatchTime: 1000, photoWatchTime: 3500, bufferTime: 200,
        skipCooldown: 800, blockedCooldown: 300, stuckRetryDelay: 4000,
        bulletMin: 1.5, bulletMax: 3.5, newVideoSettleTime: 600, minSkipInterval: 800
    };

    /* -- mode config that isn't a dropdown list ---------------------------- */
    RG.mc = {
        dive: { seconds: 5 },
        tail: { window: 0.15 },
        jumpBudget: 2,
        binge: { cap: 60 },
        pass: { skipSec: 5 },
        rngSeek: { cd: 6000, chance: 0.02, min: 0.15, max: 0.35 }
    };

    /* -- mode tables (dropdown items) ----------------------------------- */
    RG.bm = {                                     // seek profiles (bullet + jump, merged in 0.2.5)
        0: { text: 'Off', code: 'OFF' },
        1: { text: 'Burst (Highlight)', code: 'BRST' },
        2: { text: 'Climax (Peak End)', code: 'CLMX' },
        3: { text: 'Mid-Peak (50%-70%)', code: 'MID' },
        4: { text: 'Quad-Hop (4x Montage)', code: 'HOP' },
        5: { text: 'RNG Roulette', code: 'RNG' },
        6: { text: 'Slow-Mo Replay', code: 'SLOW' },
        7: { text: 'Build-Up (Speed Ramp)', code: 'RAMP' },
        8: { text: 'Trailer Hook (Tease & Climax)', code: 'HOOK' },
        9: { text: 'Bullet-Time (Matrix Climax)', code: 'MTRX' },
        10: { text: 'Double-Take (Echo Replay)', code: 'ECHO' },
        11: { text: 'Trio-Hop (3x Fast Scan)', code: 'TRIO' },
        12: { text: 'RNG Seek (Chance Jump)', code: 'RND' },
        13: { text: 'Dive Skip (First 5s)', code: 'DIVE' },
        14: { text: 'Tail Preview (Late)', code: 'TAIL' }
    };
    RG.lm = {                                     // loop modes
        1: { text: '1x (No Loop)', code: '1x' },
        2: { text: '2x Loops', code: '2x' },
        3: { text: '3x Loops', code: '3x' },
        5: { text: 'RNG (1-4x)', code: 'RNG' },
        11: { text: 'Binge (Infinite)', code: 'BIEG' },
        14: { text: 'Timed Loop 30s', code: 'TM30' },
        15: { text: 'Timed Loop 60s', code: 'TM60' },
        18: { text: 'Pass & Skip', code: 'PASK' }
    };
    RG.pm = {                                     // photo modes
        0: { text: 'Skip Photos', code: 'SKP' },
        1: { text: 'Instant Skip', code: 'INS' },
        2: { text: 'Watch 3.5s', code: 'DLY' }
    };

    /* -- storage -------------------------------------------------------- */
    const st = RG.st = {
        get: (k, d) => { const v = localStorage.getItem(k); return v === null ? d : v; },
        set: (k, v) => localStorage.setItem(k, v),
        num: (k, d) => parseFloat(st.get(k, d)),
        int: (k, d) => parseInt(st.get(k, d)),
        bool: (k, d) => st.get(k, String(d)) === 'true',
        json: (k, d) => {
            try {
                const v = localStorage.getItem(k);
                return v === null ? JSON.parse(d) : JSON.parse(v);
            } catch (_) { return {}; }
        }
    };

    /* -- normalization -------------------------------------------------- */
    const norm = u => String(u || '').toLowerCase().trim().replace(/^@/, '');
    RG.norm = norm;

    const loadBlocked = () => {
        try { return st.json('rg_blocked_users', '[]').map(norm).filter(Boolean); }
        catch (_) { return []; }
    };

    /* -- persistent + runtime state ------------------------------------- */
    RG.S = {
        isAutoNavEnabled: st.bool('rg_auto_enabled', true),
        blockMasterEnabled: st.bool('rg_block_master_enabled', true),
        isBlocklistExpanded: st.bool('rg_blocklist_menu_expanded', false),

        fillers: {
            niches: st.bool('rg_block_niches', true),
            creators: st.bool('rg_block_creators', true),
            streams: st.bool('rg_block_streams', true),
            ads: st.bool('rg_block_ads', true)
        },

        blockedUsers: loadBlocked(),
        photoSkipMode: st.int('rg_photo_skip_mode', 1),
        bulletMode: st.int('rg_bullet_mode', 0),
        lastActiveBulletMode: st.int('rg_last_bullet_mode', 1),
        loopSetting: st.int('rg_loop_setting', 1),
        lastActiveLoopSetting: st.int('rg_last_loop_setting', 2),
        speedValue: st.num('rg_speed_val', 1.0),
        speedRng: st.bool('rg_speed_rng', false),
        showDebug: st.bool('rg_debug_enabled', true),
        panelPos: st.json('rg_panel_pos', '{"top":"70px","left":"16px"}'),
        isStatsExpanded: st.bool('rg_stats_expanded', false),
        isBlockedExpanded: st.bool('rg_blocked_expanded', false),

        // runtime (never persisted)
        lastSkippedId: null, lastSkipActionTime: 0, globalCooldownEnd: 0,
        currentVideoId: null, currentVideoStartTime: 0, finishCommitmentStart: 0,
        currentLoop: 1, previousFrameTime: 0,
        runtimeLoopTarget: 1, runtimeSpeedTarget: st.num('rg_speed_val', 1.0), lastTimeJump: 0,
        runtimeBulletProfile: 0, bulletJumped: false, bulletTargetTime: 0, bulletStartTime: 0,
        bulletDuration: 2.5, bulletSegments: [], bulletSegIdx: 0,
        bulletSegLanded: false, bulletJumpTime: 0,
        jumpsRemaining: 0, loopTimedStart: 0, baseSpeed: 1,

        debug: { status: 'Initializing...', time: '--' },
        stats: { total: 0, blocked: 0, bullet: 0, standard: 0, blockedBreakdown: {} }
    };

    const S = RG.S;
    const san = (map, v, d) => (map[v] ? v : d);
    S.bulletMode = san(RG.bm, S.bulletMode, 0);
    S.lastActiveBulletMode = san(RG.bm, S.lastActiveBulletMode, 1);
    S.loopSetting = san(RG.lm, S.loopSetting, 1);
    S.lastActiveLoopSetting = san(RG.lm, S.lastActiveLoopSetting, 2);
    S.photoSkipMode = san(RG.pm, S.photoSkipMode, 1);

    /* -- one-time migration: jump modes became seek profiles in 0.2.5 ----- */
    /* old Low/Regular/RNG chance jumps all collapse into the RNG Seek profile */
    const JUMP_TO_SEEK = { 1: 12, 2: 12, 3: 12, 4: 13, 5: 14 };
    if (st.get('rg_time_jump_val', '')) {
        const seek = JUMP_TO_SEEK[st.int('rg_time_jump_val', 0)];
        if (seek && !S.bulletMode) {
            S.bulletMode = seek;
            S.lastActiveBulletMode = seek;
            st.set('rg_bullet_mode', seek);
            st.set('rg_last_bullet_mode', seek);
        }
        st.set('rg_time_jump_val', '');
        st.set('rg_last_jump_val', '');
    }

    /* -- blocklist ------------------------------------------------------ */
    RG.bset = new Set(S.blockedUsers);
    RG.blk = {
        has: u => !!u && RG.bset.has(norm(u)),
        save() {
            st.set('rg_blocked_users', JSON.stringify(S.blockedUsers));
            RG.bset = new Set(S.blockedUsers);
        },
        add(user) {
            const n = norm(user);
            if (!n || RG.bset.has(n)) return false;
            S.blockedUsers.push(n);
            RG.blk.save();
            RG.refresh && RG.refresh();
            RG.updateDebugPanel && RG.updateDebugPanel();
            return true;
        },
        remove(user) {
            const n = norm(user);
            S.blockedUsers = S.blockedUsers.filter(u => u !== n);
            RG.blk.save();
            RG.refresh && RG.refresh();
            RG.updateDebugPanel && RG.updateDebugPanel();
        },
        toggleFiller(key) {
            S.fillers[key] = !S.fillers[key];
            st.set('rg_block_' + key, S.fillers[key]);
        }
    };

    /* -- utils ---------------------------------------------------------- */
    RG.u = {
        debounce: (fn, d) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }; },
        clamp: (v, lo, hi) => Math.max(lo, Math.min(v, hi)),
        rnd: (lo, hi) => Math.random() * (hi - lo) + lo,
        rint: (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo,
        tag: (tag, cls, html) => {
            const n = document.createElement(tag);
            if (cls) n.className = cls;
            if (html != null) n.innerHTML = html;
            return n;
        },
        on: (el, ev, fn, opts) => { el && el.addEventListener(ev, fn, opts); return el; },
        click: (el, fn) => { if (el) el.onclick = fn; return el; },
        css: (el, obj) => { Object.assign(el.style, obj); return el; }
    };
    RG.$ = id => document.getElementById(id);
})(window.RG);
