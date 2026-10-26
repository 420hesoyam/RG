/* ==========================================================================
 * RG · 50 PANEL
 * The floating AUTONAV debug/status panel: build, bind, update.
 * Live status + skip statistics + folded session metrics.
 * Built on first use, rebuilt if it ever leaves the document.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, ui = RG.ui, u = RG.u, ICO = RG.ICONS, T = RG.TONES;

    let panel = null, R = null, metricsTimer = 0, shownState = null;

    /* -- build ------------------------------------------------------------- */
    function build() {
        const p = u.tag('div', 'rg-panel rg-panel-anim');
        p.id = 'rg-debug-panel';
        p.dataset.rgRun = RG.runId;
        p.setAttribute('role', 'dialog');
        p.setAttribute('aria-label', 'AutoNav debug panel');
        u.css(p, {
            top: S.panelPos.top, left: S.panelPos.left, width: '300px',
            maxHeight: 'calc(100vh - 16px)', display: S.showDebug ? 'block' : 'none'
        });
        if (S.showDebug) p.classList.add('rg-visible');
        shownState = S.showDebug;
        p.innerHTML = `
            <div id="rg-debug-hdr" class="rg-hdr">
                <div class="rg-hdr-l">
                    ${ICO.grip}<div id="rg-dot" class="rg-dot" aria-hidden="true"></div>
                    <span class="rg-hdr-title">AUTONAV</span>
                    <span class="rg-hdr-ver">v${u.esc(RG.version)}</span>
                </div>
                <div class="rg-hdr-r">
                    <button type="button" id="rg-copy-btn" class="rg-icobtn" aria-label="Copy diagnostics" title="Copy diagnostics">${ICO.copy}</button>
                    <button type="button" id="rg-sync-btn" class="rg-icobtn" aria-label="Sync modules and reload" title="Sync modules + reload">${ICO.sync}</button>
                    <button type="button" id="rg-rst-btn" class="rg-icobtn" aria-label="Reset panel position" title="Reset position">${ICO.reset}</button>
                    <button type="button" id="rg-cls-btn" class="rg-icobtn" aria-label="Close debug panel" title="Close">✕</button>
                </div>
            </div>
            <div id="rg-debug-body" class="rg-scroll" style="max-height:calc(100vh - 76px); overflow-y:auto; overscroll-behavior:contain;">
                <div class="rg-body">
                    <div class="rg-card">
                        <div class="rg-card-pad" style="display:grid; grid-template-columns:1fr 1fr; gap:10px 12px;">
                            <div style="grid-column:1/-1;">
                                <span class="rg-lbl">Status</span>
                                <span id="rg-status" class="rg-val" aria-live="polite">--</span>
                            </div>
                            <div>
                                <span class="rg-lbl">Speed</span>
                                <span id="rg-spd" class="rg-val rg-val-mono" style="color:${T.accent};">1.00x</span>
                            </div>
                            <div class="rg-val-right">
                                <span class="rg-lbl">Media ID</span>
                                <span id="rg-id" class="rg-val rg-val-mono rg-ellipsis" style="color:${T.info}; max-width:130px; display:inline-block; vertical-align:bottom;">--</span>
                            </div>
                            <div>
                                <span class="rg-lbl">Loop &amp; Bullet</span>
                                <span id="rg-loop" class="rg-val rg-val-mono" style="color:${T.muted};">1x</span>
                            </div>
                            <div class="rg-val-right">
                                <span class="rg-lbl">Timer</span>
                                <span id="rg-tmr" class="rg-val rg-val-mono">--</span>
                            </div>
                        </div>
                    </div>

                    <div class="rg-card">
                        <button type="button" id="rg-stats-hdr" class="rg-tglhdr" aria-expanded="false" aria-controls="rg-stats-cnt">
                            <span class="rg-sec">Statistics</span>
                            <span style="display:flex; align-items:center; gap:8px;">
                                <span id="rg-stat-tot" class="rg-val-mono" style="color:${T.muted};">0</span>
                                <span id="rg-stat-chv" class="rg-chev" aria-hidden="true">▼</span>
                            </span>
                        </button>
                        <div id="rg-stats-cnt" style="display:none; padding:0 10px 10px;">
                            <div class="rg-stats">
                                <div class="rg-stat">
                                    <div class="rg-stat-k">STD / BULLET</div>
                                    <div class="rg-stat-v"><span id="rg-stat-std" style="color:${T.success};">0</span><span style="opacity:0.25;">/</span><span id="rg-stat-bul" style="color:${T.warning};">0</span></div>
                                </div>
                                <div class="rg-stat">
                                    <div class="rg-stat-k">Blocked</div>
                                    <div id="rg-stat-fil" class="rg-stat-v" style="color:${T.error};">0</div>
                                </div>
                                <div class="rg-stat">
                                    <div class="rg-stat-k">Photos</div>
                                    <div id="rg-stat-pho" class="rg-stat-v" style="color:${T.info};">0</div>
                                </div>
                                <div class="rg-stat">
                                    <div class="rg-stat-k">Loops</div>
                                    <div id="rg-stat-lop" class="rg-stat-v" style="color:${T.accent};">0</div>
                                </div>
                            </div>
                            <button type="button" id="rg-blk-hdr" class="rg-tglhdr" aria-expanded="false" aria-controls="rg-fil-lst" style="padding:10px 2px 2px;">
                                <span class="rg-sec">Blocked Breakdown</span>
                                <span id="rg-blk-chv" class="rg-chev" aria-hidden="true">▼</span>
                            </button>
                            <div id="rg-fil-lst" class="rg-list rg-scroll" style="display:none; padding-top:6px;"></div>
                        </div>
                    </div>

                    <div class="rg-card" style="margin-bottom:0;">
                        <button type="button" id="rg-met-hdr" class="rg-tglhdr" aria-expanded="false" aria-controls="rg-met-cnt">
                            <span class="rg-sec">Session Metrics</span>
                            <span style="display:flex; align-items:center; gap:8px;">
                                <span id="rg-met-hdr-val" class="rg-mini" style="font-family:var(--rg-mono); color:${T.dim};">LIVE</span>
                                <span id="rg-met-chv" class="rg-chev" aria-hidden="true">▼</span>
                            </span>
                        </button>
                        <div id="rg-met-cnt" style="display:none; padding:0 10px 10px;">
                            <div class="rg-stats">
                                <div class="rg-stat"><div class="rg-stat-k">Uptime</div><div id="rg-met-up" class="rg-stat-v">0:00</div></div>
                                <div class="rg-stat"><div class="rg-stat-k">Watch Time</div><div id="rg-met-watch" class="rg-stat-v">0s</div></div>
                                <div class="rg-stat"><div class="rg-stat-k">Skip Rate</div><div id="rg-met-rate" class="rg-stat-v">0.0/m</div></div>
                                <div class="rg-stat"><div class="rg-stat-k">Avg Dwell</div><div id="rg-met-dwell" class="rg-stat-v">0s</div></div>
                                <div class="rg-stat"><div class="rg-stat-k">Media</div><div id="rg-met-media" class="rg-stat-v">--</div></div>
                                <div class="rg-stat"><div class="rg-stat-k">Cooldown</div><div id="rg-met-cd" class="rg-stat-v">ready</div></div>
                            </div>
                            <div class="rg-tiny" style="margin-top:8px; line-height:15px;">Session-scoped · updates every 500 ms</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(p);
        /* Position is persisted across sessions, so a viewport that shrank or
         * a bad stored value must not strand the panel off-screen. */
        if (S.showDebug) ui.clampToViewport(p, 'rg_panel_pos');
        return p;
    }

    /* -- refs -------------------------------------------------------------- */
    function refs(p) {
        return {
            hdr: p.querySelector('#rg-debug-hdr'), dot: p.querySelector('#rg-dot'),
            status: p.querySelector('#rg-status'), id: p.querySelector('#rg-id'),
            spd: p.querySelector('#rg-spd'), tmr: p.querySelector('#rg-tmr'), loop: p.querySelector('#rg-loop'),
            rst: p.querySelector('#rg-rst-btn'), cls: p.querySelector('#rg-cls-btn'),
            copy: p.querySelector('#rg-copy-btn'), sync: p.querySelector('#rg-sync-btn'),
            statTot: p.querySelector('#rg-stat-tot'), statStd: p.querySelector('#rg-stat-std'),
            statBul: p.querySelector('#rg-stat-bul'), statFil: p.querySelector('#rg-stat-fil'),
            statPho: p.querySelector('#rg-stat-pho'), statLop: p.querySelector('#rg-stat-lop'),
            statCnt: p.querySelector('#rg-stats-cnt'), statChv: p.querySelector('#rg-stat-chv'),
            statsHdr: p.querySelector('#rg-stats-hdr'), blkHdr: p.querySelector('#rg-blk-hdr'),
            blkChv: p.querySelector('#rg-blk-chv'), filLst: p.querySelector('#rg-fil-lst'),
            metHdr: p.querySelector('#rg-met-hdr'), metCnt: p.querySelector('#rg-met-cnt'),
            metChv: p.querySelector('#rg-met-chv'), metHdrVal: p.querySelector('#rg-met-hdr-val'),
            metUp: p.querySelector('#rg-met-up'), metWatch: p.querySelector('#rg-met-watch'),
            metRate: p.querySelector('#rg-met-rate'), metDwell: p.querySelector('#rg-met-dwell'),
            metMedia: p.querySelector('#rg-met-media'), metCd: p.querySelector('#rg-met-cd')
        };
    }

    function ensurePanel() {
        if (panel && document.contains(panel)) return panel;
        panel = build();
        R = refs(panel);
        bind();
        if (!metricsTimer && typeof setInterval === 'function') {
            metricsTimer = setInterval(() => {
                if (S.showDebug && panel && document.contains(panel)) updateDebugPanel();
            }, 500);
        }
        return panel;
    }

    /* -- bindings ----------------------------------------------------------- */
    function bind() {
        ui.drag(R.hdr, panel, {
            ignore: '#rg-copy-btn, #rg-sync-btn, #rg-rst-btn, #rg-cls-btn',
            onEnd: () => ui.savePos('rg_panel_pos')(panel)
        });
        u.click(R.rst, resetDebugPosition);
        u.click(R.sync, syncModules);
        u.click(R.copy, copyDiagnostics);
        u.click(R.cls, () => {
            S.showDebug = false;
            RG.st.set('rg_debug_enabled', 'false');
            updateDebugPanel();
            RG.refresh && RG.refresh();
        });
        u.click(R.statsHdr, () => {
            S.isStatsExpanded = !S.isStatsExpanded;
            RG.st.set('rg_stats_expanded', S.isStatsExpanded);
            updateDebugPanel();
        });
        u.click(R.blkHdr, () => {
            S.isBlockedExpanded = !S.isBlockedExpanded;
            RG.st.set('rg_blocked_expanded', S.isBlockedExpanded);
            updateDebugPanel();
        });
        u.click(R.metHdr, () => {
            S.isMetricsExpanded = !S.isMetricsExpanded;
            RG.st.set('rg_metrics_expanded', S.isMetricsExpanded);
            updateDebugPanel();
        });

        if (!RG.syncAndReload) {
            R.sync.disabled = true;
            R.sync.title = 'Sync unavailable in the local bundle';
        }
    }

    /* -- sync: cache-busted refetch of every module, then reload ----------- */
    function syncModules() {
        if (!RG.syncAndReload) { setDebug('Sync unavailable (local bundle)', '--'); return; }
        R.sync.disabled = true;
        R.sync.classList.add('rg-spin');
        setDebug('Checking remote version…', '--');

        Promise.resolve()
            .then(() => RG.fetchRemoteVersion ? RG.fetchRemoteVersion() : null)
            .catch(() => null)
            .then(v => {
                setDebug(v && v !== RG.version ? `Updating ${RG.version} → ${v}` : 'Modules up to date', v || RG.version);
                /* Leave the message readable before the page reloads. */
                return new Promise(resolve => setTimeout(resolve, 400));
            })
            .then(() => RG.syncAndReload())
            .catch(e => {
                R.sync.disabled = false;
                R.sync.classList.remove('rg-spin');
                setDebug('Sync failed', String((e && e.message) || e).slice(0, 28));
            });
    }
    RG.syncModules = syncModules;

    function resetDebugPosition() {
        const p = ensurePanel();
        p.style.top = '70px';
        p.style.left = '16px';
        ui.clampToViewport(p, 'rg_panel_pos');
        ui.savePos('rg_panel_pos')(p);
    }

    /* -- render ------------------------------------------------------------- */
    const dotColor = () => S.isAutoNavEnabled ? T.success : T.brand;
    const statusColor = t => {
        t = String(t || '');
        if (/SKIP|Error|Blocked/i.test(t)) return T.error;
        if (/Replay|Watching|Photo Kept|Loop/i.test(t)) return T.success;
        if (/Bullet|\[/.test(t)) return T.warning;
        if (/Cooldown|Safety|Settling|Finishing|Loading|No Content|Manual|Photos Off|WAIT/i.test(t)) return T.dim;
        return T.text;
    };

    function loopLabel() {
        const ls = S.loopSetting;
        const lm = RG.lm[ls] || { code: '1x' };
        if (ls === 11) return `${S.currentLoop}/∞`;
        if (ls === 14 || ls === 15) {
            const lim = ls === 14 ? 30000 : 60000;
            const left = S.loopTimedStart > 0 ? Math.max(0, lim - (Date.now() - S.loopTimedStart)) : lim;
            return `${lm.code} ${S.currentLoop} · ${Math.ceil(left / 1000)}s`;
        }
        if (ls === 18) return `${lm.code} ${S.currentLoop}/${S.runtimeLoopTarget}`;
        if (ls === 5) return `${S.currentLoop}/${S.runtimeLoopTarget} RNG`;
        if (ls === 1) return '1x';
        return `${S.currentLoop}/${S.runtimeLoopTarget || ls}`;
    }

    let _filSig = '';
    function renderBreakdown() {
        const bbd = S.stats.blockedBreakdown;
        const sig = JSON.stringify(bbd);
        if (sig === _filSig) return;
        _filSig = sig;
        const keys = Object.keys(bbd);
        R.filLst.innerHTML = keys.length
            ? keys.sort((a, b) => bbd[b] - bbd[a]).map(k => `
                <div class="rg-list-row">
                    <span class="rg-list-k">${u.esc(k.startsWith('[') ? k : '@' + k)}</span>
                    <span class="rg-list-v">${u.esc(bbd[k])}</span>
                </div>`).join('')
            : '<span class="rg-tiny-i">No blocked items skipped yet.</span>';
    }

    function renderMetrics() {
        const st = S.stats;
        const up = Math.max(0, Date.now() - st.startedAt);
        const mins = Math.max(up / 60000, 1 / 60);
        const liveDwell = st.mediaStartedAt
            ? Math.min(Math.max(0, Date.now() - st.mediaStartedAt), 10 * 60 * 1000)
            : 0;
        const dwellSamples = st.dwellSamples + (liveDwell > 0 ? 1 : 0);
        R.metUp.textContent = u.fmtClock(up);
        R.metWatch.textContent = u.fmtDur(st.watchMs);
        R.metRate.textContent = `${(st.total / mins).toFixed(1)}/m`;
        R.metDwell.textContent = dwellSamples
            ? u.fmtDur((st.dwellTotalMs + liveDwell) / dwellSamples)
            : '0s';
        R.metMedia.textContent = st.mediaDuration > 0
            ? `${st.mediaTime.toFixed(1)} / ${st.mediaDuration.toFixed(1)}s`
            : '--';
        const cd = Math.max(0, S.globalCooldownEnd - Date.now());
        R.metCd.textContent = cd > 0 ? `${(cd / 1000).toFixed(1)}s` : 'ready';
        R.metCd.style.color = cd > 0 ? T.warning : T.success;
        R.metHdrVal.textContent = u.fmtClock(up);
    }

    function updateDebugPanel() {
        const p = ensurePanel();
        if (shownState !== S.showDebug) {
            shownState = S.showDebug;
            ui.show(p, S.showDebug);
        }
        if (!S.showDebug) return;

        const c = dotColor();
        R.dot.style.background = c;
        R.dot.style.boxShadow = `0 0 8px ${c}`;

        const status = String(S.debug.status || '--');
        R.status.textContent = status;
        R.status.title = status;
        R.status.style.color = statusColor(status);

        let id = S.currentVideoId || '--';
        if (String(id).includes('/')) id = String(id).split('/').filter(Boolean).pop();
        R.id.textContent = id;
        R.id.title = String(id);

        const rng = S.speedRng && S.isAutoNavEnabled;
        R.spd.innerHTML = `${S.runtimeSpeedTarget.toFixed(2)}x ${rng ? `<span class="rg-mini" style="opacity:0.7; color:${T.muted};">RNG</span>` : ''}`;
        R.tmr.textContent = S.debug.time || '--';

        const bCode = RG.bm[S.runtimeBulletProfile]?.code || 'ON';
        R.loop.innerHTML = `${u.esc(loopLabel())} ${S.bulletMode > 0 ? `<span class="rg-mini" style="color:${T.warning};">[${u.esc(bCode)}]</span>` : ''}`;

        ui.flashUpdate(R.statTot, S.stats.total);
        R.statCnt.style.display = S.isStatsExpanded ? 'block' : 'none';
        R.statChv.style.transform = S.isStatsExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        R.statsHdr.setAttribute('aria-expanded', String(S.isStatsExpanded));

        R.metCnt.style.display = S.isMetricsExpanded ? 'block' : 'none';
        R.metChv.style.transform = S.isMetricsExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        R.metHdr.setAttribute('aria-expanded', String(S.isMetricsExpanded));
        if (S.isMetricsExpanded) renderMetrics();
        else R.metHdrVal.textContent = u.fmtClock(Date.now() - S.stats.startedAt);

        if (!S.isStatsExpanded) return;
        ui.flashUpdate(R.statStd, S.stats.standard);
        ui.flashUpdate(R.statBul, S.stats.bullet);
        ui.flashUpdate(R.statFil, S.stats.blocked);
        ui.flashUpdate(R.statPho, S.stats.photos);
        ui.flashUpdate(R.statLop, S.stats.loops);
        R.filLst.style.display = S.isBlockedExpanded ? 'flex' : 'none';
        R.blkChv.style.transform = S.isBlockedExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        R.blkHdr.setAttribute('aria-expanded', String(S.isBlockedExpanded));
        if (S.isBlockedExpanded) renderBreakdown();
    }

    /* -- diagnostics -------------------------------------------------------- */
    function diagnostics() {
        const st = S.stats;
        return {
            script: 'RedGifs Auto Production',
            version: RG.version,
            url: location.href,
            autoEnabled: S.isAutoNavEnabled,
            blockMaster: S.blockMasterEnabled,
            modes: {
                bullet: S.bulletMode,
                runtimeBullet: S.runtimeBulletProfile,
                loop: S.loopSetting,
                photo: S.photoSkipMode
            },
            playback: {
                baseSpeed: S.speedValue,
                effectiveSpeed: S.runtimeSpeedTarget,
                randomSpeed: S.speedRng,
                currentVideoId: S.currentVideoId,
                loop: `${S.currentLoop}/${S.runtimeLoopTarget}`,
                bulletStep: S.bulletSegments.length ? `${S.bulletSegIdx + 1}/${S.bulletSegments.length}` : 'none',
                cooldownMs: Math.max(0, S.globalCooldownEnd - Date.now())
            },
            stats: {
                total: st.total, blocked: st.blocked, bullet: st.bullet,
                standard: st.standard, photos: st.photos, loops: st.loops,
                watchMs: Math.round(st.watchMs), uptimeMs: Date.now() - st.startedAt,
                dwellSamples: st.dwellSamples,
                avgDwellMs: st.dwellSamples ? Math.round(st.dwellTotalMs / st.dwellSamples) : 0,
                blockedBreakdown: st.blockedBreakdown
            },
            tuning: RG.cfg,
            blockedUsers: S.blockedUsers,
            fillers: S.fillers
        };
    }
    RG.getDiagnostics = diagnostics;

    function copyDiagnostics() {
        const text = JSON.stringify(diagnostics(), null, 2);
        const ok = () => {
            R.copy.classList.add('rg-ok');
            setDebug('Diagnostics copied', 'OK');
            setTimeout(() => R.copy.classList.remove('rg-ok'), 1400);
        };
        const fallback = () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                ok();
            } catch (_) {
                setDebug('Copy failed', '--');
            }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(ok).catch(fallback);
        } else fallback();
    }
    RG.copyDiagnostics = copyDiagnostics;

    /* -- throttled status writes -------------------------------------------- */
    let _sched = false;
    function scheduleDebugUpdate() {
        if (_sched) return;
        _sched = true;
        setTimeout(() => { _sched = false; updateDebugPanel(); }, 200);
    }
    function setDebug(status, time) {
        if (S.debug.status === status && S.debug.time === (time || '--')) return;
        S.debug = { status, time: time || '--' };
        scheduleDebugUpdate();
    }

    RG.updateDebugPanel = updateDebugPanel;
    RG.setDebug = setDebug;
    RG.resetDebugPosition = resetDebugPosition;
    RG.ensurePanel = ensurePanel;
    /* `RG.panel` is a getter so every reader gets a live, attached panel. */
    Object.defineProperty(RG, 'panel', { get: ensurePanel, configurable: true });
})(window.RG);
