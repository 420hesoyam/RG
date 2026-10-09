/* ==========================================================================
 * RG · 90 BOOT
 * Global listeners + the 50ms tick that drives every decision.
 * Keep this file thin: policy only, mechanics live in the other modules.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, cfg = RG.cfg, u = RG.u, ui = RG.ui;

    const MEDIA_EVENTS = ['loadedmetadata', 'play', 'playing', 'durationchange'];
    const TICK_MS = 50;

    /* -- media events: keep the active video in sync ----------------------- */
    function onMediaEvent(e) {
        const v = e.target;
        if (v.tagName !== 'VIDEO') return;
        const el = v.closest('.FeedModule, .GifPreview, [data-feed-module-type]');
        if (!el) return;
        const mid = window.innerHeight / 2;
        const rect = el.getBoundingClientRect();
        if (!(rect.top <= mid && rect.bottom >= mid)) return;
        if (S.currentVideoId !== RG.getMediaId(el, v)) RG.handleNewVideo(RG.getMediaId(el, v));
        RG.setRate(v);
        RG.tryBulletJump(v);
    }

    /* -- window events ------------------------------------------------------- */
    function onKeyDown(e) {
        if (e.key !== 'Escape') return;
        const m = RG.$('rg-settings-menu');
        if (m && m.classList.contains('rg-visible')) ui.show(m, false);
        ui.closeDropdown();
    }

    function onResize() {
        ui.clampToViewport(RG.panel, 'rg_panel_pos');
        const m = RG.$('rg-settings-menu');
        ui.clampToViewport(m, 'rg_menu_pos');
        RG.menu && RG.menu.syncHeight();
    }

    /* -- blocked-item handling (shared by fillers + users) ------------------- */
    /* returns true when the item is claimed and the tick must stop */
    function handleBlocked(el, label, lockId) {
        if (!S.blockMasterEnabled) return false;          // filter off: keep watching
        const tag = label.startsWith('[') ? `Filler: ${label}` : `Blocked: @${label}`;

        if (!S.isAutoNavEnabled) { RG.setDebug(tag, '--'); return true; }
        if (S.lastSkippedId === lockId && Date.now() < S.globalCooldownEnd) {
            RG.setDebug(tag, 'WAIT');
            return true;
        }
        RG.setDebug(`SKIP: ${label}`, 'INSTANT');
        RG.performSkip(el, lockId, 'blocked', label);
        return true;
    }

    /* -- photo branch --------------------------------------------------------- */
    function handlePhoto(el, curId) {
        if (S.currentVideoId !== curId) RG.handleNewVideo(curId);
        if (Date.now() < S.globalCooldownEnd) { RG.setDebug('Nav Cooldown', 'WAIT'); return; }
        if (!S.isAutoNavEnabled) return;

        if (S.photoSkipMode === 1) {
            const lock = `BLOCK_PHOTO_${curId}`;
            if (S.lastSkippedId === lock && Date.now() < S.globalCooldownEnd) return;
            RG.setDebug('SKIP: Photo', 'INSTANT');
            RG.performSkip(el, lock, 'blocked', 'Photo');
        } else if (S.photoSkipMode === 2) {
            const wt = Date.now() - S.currentVideoStartTime;
            if (wt >= cfg.photoWatchTime) RG.performSkip(el, curId, 'standard');
            else RG.setDebug('Watching Photo', `${Math.ceil((cfg.photoWatchTime - wt) / 1000)}s`);
        }
    }

    /* -- end-of-media detection ----------------------------------------------- */
    function isFinished(v, cdText) {
        if (cdText === '00:00' || cdText === '0:00' || v.ended) return true;
        if (v.duration > 0 && v.currentTime >= v.duration - 0.05) return true;
        return !v.seeking && S.previousFrameTime > v.duration * 0.8 && v.currentTime < v.duration * 0.1;
    }

    const timedSkipDue = () =>
        S.isAutoNavEnabled && (S.loopSetting === 14 || S.loopSetting === 15) &&
        Date.now() - S.loopTimedStart >= (S.loopSetting === 14 ? 30000 : 60000);

    function bulletLabel() {
        const code = RG.bm[S.runtimeBulletProfile]?.code || 'ON';
        return S.bulletSegments.length > 1
            ? `[${code}] ${S.bulletSegIdx + 1}/${S.bulletSegments.length}`
            : `Bullet [${code}]`;
    }

    /* -- video branch ----------------------------------------------------------- */
    function handleVideo(el, v, cd, curId) {
        if (S.currentVideoId !== curId) RG.handleNewVideo(curId);
        if (Date.now() < S.globalCooldownEnd) { RG.setDebug('Nav Cooldown', 'WAIT'); return; }

        RG.setRate(v);
        RG.tryBulletJump(v);

        if (S.pendingDive && !S.bulletMode && v.duration > 0) {
            const d = Math.min(RG.mc.dive.seconds, v.duration * 0.15);
            v.currentTime = d;
            S.previousFrameTime = d;
            S.pendingDive = false;
            S.lastTimeJump = Date.now();
        }

        const cdText = cd?.textContent.trim() || '';
        const finished = isFinished(v, cdText);
        S.previousFrameTime = v.currentTime;
        const bFin = RG.bulletFinished(v);

        // safety locks
        if (!S.bulletMode && finished && S.isAutoNavEnabled && Date.now() - S.currentVideoStartTime < 200) {
            v.currentTime = 0;
            v.play().catch(() => { });
            return;
        }
        if ((finished || bFin) && Date.now() - S.currentVideoStartTime < cfg.newVideoSettleTime) {
            RG.setDebug('Settling...', cdText);
            return;
        }

        if (curId !== S.lastSkippedId) {
            if (!finished && !bFin && Date.now() - S.currentVideoStartTime < cfg.minWatchTime) {
                RG.setDebug('Safety Lock', cdText);
                return;
            }

            RG.attemptTimeJump(v, S.timeJumpMode);

            if ((finished || bFin || timedSkipDue()) && S.isAutoNavEnabled) {
                if (RG.loopShouldContinue()) {
                    S.currentLoop++;
                    S.previousFrameTime = 0;
                    RG.applyLoopEffects(v);
                    v.play().catch(() => { });
                    RG.setDebug('Replay Loop', cdText);
                } else {
                    if (!S.finishCommitmentStart) S.finishCommitmentStart = Date.now();
                    if (Date.now() - S.finishCommitmentStart > cfg.bufferTime) {
                        RG.performSkip(el, curId, S.bulletMode ? 'bullet' : 'standard');
                        S.finishCommitmentStart = 0;
                    } else RG.setDebug('Finishing...', cdText);
                }
            } else {
                S.finishCommitmentStart = 0;
                RG.setDebug(
                    S.bulletMode > 0 ? bulletLabel() : (S.isAutoNavEnabled ? 'Watching' : 'Manual'),
                    cdText
                );
            }
        } else if (S.isAutoNavEnabled && Date.now() - S.lastSkipActionTime > cfg.stuckRetryDelay) {
            RG.performSkip(el, curId, 'standard');
        }
    }

    /* -- tick -------------------------------------------------------------------- */
    function tick() {
        try {
            const el = RG.getActiveElCached();
            if (!el) { RG.setDebug('No Content', '--'); return; }

            const filler = RG.checkFillerBlocked(el);
            if (filler) return handleBlocked(el, filler, `FILLER_${RG.getMediaId(el) || filler}`);

            const user = RG.extractUserCached(el);
            if (RG.blk.has(user)) return handleBlocked(el, user, `BLOCKED_USER_${user}`);

            RG.ensureUIExists(el);
            const { v, cd } = RG.getDomCached(el);
            const curId = RG.getMediaId(el, v);

            if (RG.isImageEl(el)) return handlePhoto(el, curId);
            if (!v) return;
            handleVideo(el, v, cd, curId);
        } catch (e) {
            RG.setDebug(`Error: ${e.message}`, '--');
        }
    }

    /* -- start ------------------------------------------------------------------- */
    function start() {
        ui.installStyles();
        MEDIA_EVENTS.forEach(ev => u.on(document, ev, onMediaEvent, true));
        u.on(document, 'keydown', onKeyDown);
        u.on(window, 'resize', u.debounce(onResize, 150));
        setInterval(tick, TICK_MS);
        RG.updateDebugPanel();
    }

    RG.tick = tick;
    RG.start = start;
})(window.RG);
