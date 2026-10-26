/* ==========================================================================
 * RG · 20 PLAYER
 * Playback control: rate, bullet sequencer, time jumps, loop policy.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, cfg = RG.cfg, u = RG.u;

    /* -- rate ------------------------------------------------------------ */
    function setRate(v) {
        if (v && Math.abs(v.playbackRate - S.runtimeSpeedTarget) > 0.01) v.playbackRate = S.runtimeSpeedTarget;
    }
    function applyActiveSpeed(val) {
        val = u.clamp(parseFloat(val) || 1, 0.5, 3);
        S.speedValue = val;
        if (!S.speedRng || !S.isAutoNavEnabled) S.runtimeSpeedTarget = val;
        S.baseSpeed = S.runtimeSpeedTarget;
        setRate(RG.getActiveElCached()?.querySelector('video') || document.querySelector('video'));
        RG.updateDebugPanel();
    }
    RG.setRate = setRate;
    RG.applyActiveSpeed = applyActiveSpeed;

    /* Central pause/resume so the menu, panel and future hotkeys all restore
     * normal playback instead of leaving a slowed bullet segment behind. */
    function setAutoNav(on) {
        S.isAutoNavEnabled = !!on;
        RG.st.set('rg_auto_enabled', S.isAutoNavEnabled);
        if (!S.isAutoNavEnabled) {
            S.runtimeSpeedTarget = S.speedValue;
            S.baseSpeed = S.speedValue;
            S.bulletJumped = false;
            S.bulletSegments = [];
            S.bulletSegIdx = 0;
            S.bulletSegLanded = false;
            S.bulletTargetTime = 0;
            S.finishCommitmentStart = 0;
            const v = RG.getActiveElCached()?.querySelector('video') || document.querySelector('video');
            setRate(v);
        }
        RG.updateDebugPanel && RG.updateDebugPanel();
        RG.refresh && RG.refresh();
    }
    RG.setAutoNav = setAutoNav;

    /* -- new media lifecycle --------------------------------------------- */
    const RNG_SEEK = 12;
    const RNG_BULLETS = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11];

    function loopTargetFor(ls) {
        if (ls === 5) return u.rint(1, 4);
        if (ls === 11) return RG.mc.binge.cap;
        if (ls === 14 || ls === 15) return 999;
        if (ls === 18) return 2;
        return RG.lm[ls] ? ls : 1;
    }

    function handleNewVideo(id) {
        const now = Date.now();
        if (id !== S.lastSkippedId && S.globalCooldownEnd > 0 &&
            now - S.lastSkipActionTime > cfg.skipCooldown + 200) S.globalCooldownEnd = 0;

        /* Dwell is measured between media detections, which is the closest
         * stable proxy for "how long did we actually spend on that item". */
        if (S.stats.mediaStartedAt > 0) {
            S.stats.dwellTotalMs += Math.min(now - S.stats.mediaStartedAt, 10 * 60 * 1000);
            S.stats.dwellSamples++;
        }
        S.stats.mediaStartedAt = now;
        S.stats.mediaTime = 0;
        S.stats.mediaDuration = 0;

        S.currentVideoId = id;
        S.currentVideoStartTime = now;
        S.currentLoop = 1;
        S.lastTimeJump = 0;
        S.previousFrameTime = 0;
        S.lastSkippedId = null;
        S.finishCommitmentStart = 0;

        S.runtimeBulletProfile = S.bulletMode === 5
            ? RNG_BULLETS[u.rint(0, RNG_BULLETS.length - 1)]
            : S.bulletMode;
        S.bulletJumped = false;
        S.bulletTargetTime = 0;
        S.bulletStartTime = 0;
        S.bulletSegments = [];
        S.bulletSegIdx = 0;
        S.bulletSegLanded = false;
        S.bulletJumpTime = 0;
        S.bulletDuration = u.rnd(cfg.bulletMin, cfg.bulletMax);

        S.runtimeSpeedTarget = S.speedRng && S.isAutoNavEnabled
            ? parseFloat(u.rnd(0.75, 2.5).toFixed(2))
            : S.speedValue;
        S.baseSpeed = S.runtimeSpeedTarget;
        S.loopTimedStart = now;
        S.runtimeLoopTarget = loopTargetFor(S.loopSetting);
        S.jumpsRemaining = RG.mc.jumpBudget;
    }
    RG.handleNewVideo = handleNewVideo;

    /* -- bullet sequencer -------------------------------------------------- */
    function addSeg(segs, start, segDur, rate = 1.0, maxDur = 0) {
        const s = Math.max(0.05, Math.min(start, maxDur - 0.35));
        const t = Math.min(maxDur - 0.08, s + Math.max(0.35, segDur));
        if (t > s + 0.1) segs.push({ s, t, rate });
    }

    const RAMP = [0.35, 0.85, 1.30, 1.80];
    const HOPS = [0.15, 0.40, 0.65, 0.85];

    function computeBulletSegments(p, dur) {
        const segs = [];
        const hop = () => Math.max(0.6, Math.min(1.2, dur * 0.12));

        switch (p) {
            case 1: {                                        // burst
                const bDur = Math.min(S.bulletDuration, Math.max(1.0, dur * 0.5));
                const minS = dur * 0.15, maxS = Math.max(minS, dur - bDur - 0.2);
                addSeg(segs, Math.min(maxS, u.rnd(minS, maxS)), bDur, 1.0, dur);
                break;
            }
            case 2: addSeg(segs, dur * 0.76, 3.5, 1.0, dur); break;              // climax
            case 3: addSeg(segs, dur * 0.52, 3.0, 1.0, dur); break;              // mid-peak
            case 4: HOPS.forEach(f => addSeg(segs, dur * f, hop(), 1.0, dur)); break;  // quad-hop
            case 6: {                                        // slow-mo replay
                const s = dur * 0.75, len = Math.min(3.2, Math.max(1.2, dur * 0.22));
                addSeg(segs, s, len, 1.0, dur);
                addSeg(segs, s, len, 0.5, dur);
                break;
            }
            case 7: {                                        // build-up ramp
                const step = Math.max(0.8, Math.min(2.0, dur * 0.15));
                addSeg(segs, dur * 0.35, step, 0.85, dur);
                addSeg(segs, dur * 0.60, step, 1.30, dur);
                addSeg(segs, dur * 0.80, step * 1.5, 1.80, dur);
                break;
            }
            case 8: {                                        // trailer hook
                const hook = Math.max(0.6, Math.min(1.0, dur * 0.1));
                const main = Math.max(2.5, Math.min(5.0, dur * 0.45));
                addSeg(segs, dur * 0.82, hook, 1.15, dur);
                addSeg(segs, dur * 0.45, main, 1.0, dur);
                break;
            }
            case 9: {                                        // bullet-time
                const lead = Math.max(0.9, Math.min(1.8, dur * 0.15));
                const mx = Math.max(1.4, Math.min(2.8, dur * 0.22));
                const peak = dur * 0.78;
                addSeg(segs, Math.max(0.1, peak - lead), lead, 1.0, dur);
                addSeg(segs, peak, mx, 0.45, dur);
                break;
            }
            case 10: {                                       // double-take
                const c = dur * 0.74, imp = Math.max(1.2, Math.min(2.2, dur * 0.18));
                addSeg(segs, c, imp, 1.0, dur);
                addSeg(segs, Math.max(0.1, c + 0.3), imp * 1.1, 0.7, dur);
                break;
            }
            case 11: {                                       // trio-hop
                const scan = Math.max(0.7, Math.min(1.4, dur * 0.14));
                addSeg(segs, dur * 0.18, scan, 1.0, dur);
                addSeg(segs, dur * 0.52, scan, 1.0, dur);
                addSeg(segs, dur * 0.82, scan * 1.6, 1.0, dur);
                break;
            }
            case 12: {                                       // rng seek (chance jumps on top)
                addSeg(segs, dur * u.rnd(0.05, 0.25), dur * 0.75, 1.0, dur);
                break;
            }
            case 13: {                                       // dive
                const s = Math.min(RG.mc.dive.seconds, dur * 0.15);
                addSeg(segs, s, dur - s, 1.0, dur);
                break;
            }
            case 14: {                                       // tail
                const s = dur * (0.8 + u.rnd(0, RG.mc.tail.window));
                addSeg(segs, s, dur - s, 1.0, dur);
                break;
            }
            default: addSeg(segs, Math.max(0.2, Math.min(dur * 0.5, dur - 1.5)), S.bulletDuration, 1.0, dur);
        }
        return segs;
    }

    function seekToSeg(v, seg) {
        S.bulletStartTime = seg.s;
        S.bulletTargetTime = seg.t;
        S.bulletSegLanded = false;
        S.bulletJumpTime = Date.now();
        S.previousFrameTime = seg.s;
        S.runtimeSpeedTarget = (seg.rate || 1.0) * S.baseSpeed;
        setRate(v);
        v.currentTime = seg.s;
    }

    function commitBullet(v, p) {
        const dur = v.duration;
        if (!dur || !isFinite(dur) || dur <= 0.5) return;
        let segs = computeBulletSegments(p, dur);
        if (!segs.length) segs = [{ s: Math.max(0.1, Math.min(dur * 0.5, dur - 0.6)), t: dur - 0.05, rate: 1.0 }];
        S.bulletSegments = segs;
        S.bulletSegIdx = 0;
        const f = segs[0];
        S.bulletJumped = true;
        S.previousFrameTime = f.s;
        S.runtimeSpeedTarget = (f.rate || 1.0) * S.baseSpeed;
        setRate(v);
        if (Math.abs(v.currentTime - f.s) > 0.15) {
            S.bulletStartTime = f.s;
            S.bulletTargetTime = f.t;
            S.bulletJumpTime = Date.now();
            S.bulletSegLanded = false;
            v.currentTime = f.s;
        } else {
            S.bulletStartTime = f.s;
            S.bulletTargetTime = f.t;
            S.bulletJumpTime = Date.now();
            S.bulletSegLanded = true;
        }
    }

    function tryBulletJump(v) {
        if (!S.bulletMode || !S.isAutoNavEnabled) return;
        const dur = v.duration;
        if (!dur || !isFinite(dur) || dur <= 0.5) return;

        if (!S.bulletJumped) return commitBullet(v, S.runtimeBulletProfile);
        maybeRngSeek(v);
        if (v.seeking) return;

        if (!S.bulletSegLanded) {
            if (v.currentTime >= S.bulletStartTime - 0.5 || Date.now() - S.bulletJumpTime > 600) S.bulletSegLanded = true;
            else return;
        }
        if (v.currentTime >= S.bulletTargetTime && S.bulletSegIdx < S.bulletSegments.length - 1) {
            S.bulletSegIdx++;
            seekToSeg(v, S.bulletSegments[S.bulletSegIdx]);
        }
    }

    function bulletFinished(v) {
        if (!S.bulletMode || !S.bulletJumped || !S.bulletSegments.length) return false;
        return S.bulletSegIdx >= S.bulletSegments.length - 1 &&
            S.bulletSegLanded && !v.seeking && v.currentTime >= S.bulletTargetTime;
    }
    RG.computeBulletSegments = computeBulletSegments;
    RG.commitBullet = commitBullet;
    RG.tryBulletJump = tryBulletJump;
    RG.bulletFinished = bulletFinished;

    /* -- RNG seek: chance-based forward jumps (the old jump modes) -------- */
    function maybeRngSeek(v) {
        if (S.runtimeBulletProfile !== RNG_SEEK || !S.isAutoNavEnabled) return;
        const dur = v.duration;
        if (!dur || dur <= 5 || v.seeking || S.jumpsRemaining <= 0) return;
        const p = RG.mc.rngSeek, now = Date.now();
        if (now - S.lastTimeJump < p.cd || Math.random() >= p.chance) return;
        const j = dur * u.rnd(p.min, p.max);
        if (v.currentTime + j >= dur - 1) return;
        v.currentTime += j;
        S.jumpsRemaining--;
        S.lastTimeJump = now;
    }
    RG.maybeRngSeek = maybeRngSeek;

    /* -- loop policy -------------------------------------------------------- */
    function loopShouldContinue() {
        const ls = S.loopSetting;
        if (S.currentLoop >= S.runtimeLoopTarget) return false;
        if (ls === 14 || ls === 15) {
            const lim = ls === 14 ? 30000 : 60000;
            if (Date.now() - S.loopTimedStart >= lim) return false;
        }
        return !(ls === 11 && S.currentLoop >= RG.mc.binge.cap);
    }

    function applyLoopEffects(v) {
        const ls = S.loopSetting;
        S.stats.loops++;
        S.finishCommitmentStart = 0;
        if (S.bulletMode > 0) {
            S.bulletSegIdx = 0;
            const f = S.bulletSegments[0];
            if (f) seekToSeg(v, f);
            else {
                S.runtimeSpeedTarget = S.baseSpeed;
                setRate(v);
                v.currentTime = S.bulletStartTime || 0;
            }
        } else if (ls === 18 && v.duration) {
            S.runtimeSpeedTarget = S.baseSpeed;
            setRate(v);
            const t = Math.min(RG.mc.pass.skipSec, v.duration * 0.15);
            v.currentTime = t;
        } else {
            S.runtimeSpeedTarget = S.baseSpeed;
            setRate(v);
            v.currentTime = 0;
        }
        /* This must follow the seek: isFinished() compares the previous frame
         * with the current one, and a stale near-end value made the tick treat
         * the just-restarted replay as already finished (so loops flashed by). */
        S.previousFrameTime = v.currentTime || 0;
    }
    RG.loopShouldContinue = loopShouldContinue;
    RG.applyLoopEffects = applyLoopEffects;

    /* -- mode setters ------------------------------------------------------- */
    function setLoopMode(v) {
        /* 1 is the table's "no loop" mode. Never store 0: it used to happen
         * when the grid tile was clicked off and produced "1/0" in the UI. */
        v = RG.lm[v] ? v : 1;
        S.loopSetting = v;
        if (v > 1) {
            S.lastActiveLoopSetting = v;
            RG.st.set('rg_last_loop_setting', v);
        }
        /* Restart the timed window when one is selected, and keep the visible
         * counter inside the new target (for example 2/1 -> 1/1 when looping
         * is turned off mid-replay). */
        if (v === 14 || v === 15) S.loopTimedStart = Date.now();
        S.runtimeLoopTarget = loopTargetFor(v);
        S.currentLoop = Math.max(1, Math.min(S.currentLoop || 1, S.runtimeLoopTarget));
        RG.st.set('rg_loop_setting', v);
        RG.updateDebugPanel && RG.updateDebugPanel();
    }
    function applyBulletMode(v) {
        v = RG.bm[v] ? v : 0;
        S.bulletMode = v;
        S.runtimeBulletProfile = v;
        S.bulletJumped = false;
        S.bulletSegments = [];
        S.bulletSegIdx = 0;
        S.bulletSegLanded = false;
        S.bulletTargetTime = 0;
        if (!v) {
            S.runtimeSpeedTarget = S.baseSpeed || S.speedValue;
            setRate(RG.getActiveElCached()?.querySelector('video') || document.querySelector('video'));
        }
        if (v > 0) {
            S.lastActiveBulletMode = v;
            RG.st.set('rg_last_bullet_mode', v);
        }
        RG.st.set('rg_bullet_mode', v);
        RG.updateDebugPanel && RG.updateDebugPanel();
    }
    function setPhotoMode(v) {
        S.photoSkipMode = RG.pm[v] ? v : 0;
        if (S.photoSkipMode > 0) {
            S.lastActivePhotoMode = S.photoSkipMode;
            RG.st.set('rg_last_photo_mode', S.lastActivePhotoMode);
        }
        RG.st.set('rg_photo_skip_mode', S.photoSkipMode);
        RG.updateDebugPanel && RG.updateDebugPanel();
        RG.refresh && RG.refresh();
    }
    RG.setLoopMode = setLoopMode;
    RG.applyBulletMode = applyBulletMode;
    RG.setPhotoMode = setPhotoMode;
})(window.RG);
