/* ==========================================================================
 * RG · 50 PANEL
 * The floating AUTONAV debug/status panel: build, bind, update.
 * Built on first use, rebuilt if it ever leaves the document.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, ui = RG.ui, u = RG.u, ICO = RG.ICONS;

    const LBL = "color:#BAB9C0; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; display:block; margin-bottom:2px;";

    let panel = null, R = null;

    /* -- build ------------------------------------------------------------- */
    function build() {
        const p = u.tag('div', 'rg-panel rg-panel-anim');
        p.id = 'rg-debug-panel';
        p.dataset.rgRun = RG.runId;
        u.css(p, { top: S.panelPos.top, left: S.panelPos.left, width: '275px', fontSize: '11px', display: S.showDebug ? 'block' : 'none' });
        if (S.showDebug) p.classList.add('rg-visible');
        p.innerHTML = `
            <div id="rg-debug-hdr" style="padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:grab; user-select:none; background:rgba(0,0,0,0.22);">
                <div style="display:flex; gap:6px; align-items:center;">
                    ${ICO.grip}<div id="rg-dot" aria-hidden="true" style="width:7px; height:7px; border-radius:50%; background:#10B981; box-shadow:0 0 6px #10B981; transition:0.2s;"></div>
                    <span style="font-weight:700; font-size:11px; letter-spacing:0.6px;">AUTONAV</span>
                    <span style="font-family:monospace; font-size:9px; color:#7A7985; letter-spacing:0;">v${RG.version}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button type="button" id="rg-sync-btn" class="rg-icobtn" aria-label="Sync modules and reload" title="Sync modules + reload">${ICO.sync}</button>
                    <button type="button" id="rg-rst-btn" class="rg-icobtn" aria-label="Reset panel position" title="Reset position">${ICO.reset}</button>
                    <button type="button" id="rg-cls-btn" class="rg-icobtn" aria-label="Close debug panel" title="Close">✕</button>
                </div>
            </div>
            <div id="rg-debug-body">
                <div style="padding:10px 14px; display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; background:rgba(255,255,255,0.015);">
                    <div><span style="${LBL}">Status</span><span id="rg-status" style="font-weight:600;">--</span></div>
                    <div style="text-align:right;"><span style="${LBL}">Speed</span><span id="rg-spd" style="font-family:monospace; color:#FF2E56; font-weight:600;">1.0x</span></div>
                    <div><span style="${LBL}">Media ID</span><span id="rg-id" style="font-family:monospace; font-size:10px; color:#38BDF8; font-weight:600; max-width:115px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block;">--</span></div>
                    <div style="text-align:right;"><span style="${LBL}">Loop &amp; Bullet</span><span id="rg-loop" style="font-family:monospace; font-size:10px; font-weight:600; color:#BAB9C0;">1/1</span> <span id="rg-tmr" style="font-family:monospace; font-size:10px;">--</span></div>
                </div>
                <button type="button" id="rg-stats-hdr" class="rg-tglhdr rg-stats-hdr" aria-expanded="false" style="padding:9px 14px; border-top:1px solid rgba(255,255,255,0.08); cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.12);">
                    <span style="font-size:10px; font-weight:700; color:#BAB9C0; text-transform:uppercase; letter-spacing:0.5px;">Statistics</span>
                    <span style="display:flex; align-items:center; gap:8px;"><span id="rg-stat-tot" style="font-family:monospace; font-weight:700;">0</span><span id="rg-stat-chv" aria-hidden="true" style="font-size:8px; opacity:0.5; transition:0.2s;">▼</span></span>
                </button>
                <div id="rg-stats-cnt" style="display:none; padding:10px 14px; background:rgba(0,0,0,0.2);">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
                        <div style="background:rgba(255,255,255,0.03); padding:7px 9px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
                            <div style="font-size:9px; color:#BAB9C0; font-weight:600;">STD / BULLET</div>
                            <div style="font-family:monospace; font-size:11px; font-weight:700;"><span id="rg-stat-std" style="color:#10B981;">0</span><span style="opacity:0.2;">/</span><span id="rg-stat-bul" style="color:#FBBF24;">0</span></div>
                        </div>
                        <div style="background:rgba(255,255,255,0.03); padding:7px 9px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
                            <div style="font-size:9px; color:#BAB9C0; font-weight:600;">BLOCKED</div>
                            <div id="rg-stat-fil" style="font-family:monospace; font-size:11px; font-weight:700; color:#FF2E56;">0</div>
                        </div>
                    </div>
                    <button type="button" id="rg-blk-hdr" class="rg-tglhdr" aria-expanded="false" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; opacity:0.85; padding:2px 0; box-sizing:border-box;"><span style="font-size:9px; color:#BAB9C0; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Blocked Breakdown</span><span id="rg-blk-chv" aria-hidden="true" style="font-size:8px; opacity:0.5; transition:0.2s;">▼</span></button>
                    <div id="rg-fil-lst" style="display:none; flex-direction:column; gap:4px; max-height:100px; overflow-y:auto; padding-top:8px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(p);
        return p;
    }

    /* -- refs -------------------------------------------------------------- */
    function refs(p) {
        return {
            hdr: p.querySelector('#rg-debug-hdr'), dot: p.querySelector('#rg-dot'),
            status: p.querySelector('#rg-status'), id: p.querySelector('#rg-id'),
            spd: p.querySelector('#rg-spd'), tmr: p.querySelector('#rg-tmr'), loop: p.querySelector('#rg-loop'),
            rst: p.querySelector('#rg-rst-btn'), cls: p.querySelector('#rg-cls-btn'),
            sync: p.querySelector('#rg-sync-btn'),
            statTot: p.querySelector('#rg-stat-tot'), statStd: p.querySelector('#rg-stat-std'),
            statBul: p.querySelector('#rg-stat-bul'), statFil: p.querySelector('#rg-stat-fil'),
            statCnt: p.querySelector('#rg-stats-cnt'), statChv: p.querySelector('#rg-stat-chv'),
            statsHdr: p.querySelector('#rg-stats-hdr'), blkHdr: p.querySelector('#rg-blk-hdr'),
            blkChv: p.querySelector('#rg-blk-chv'), filLst: p.querySelector('#rg-fil-lst')
        };
    }

    function ensurePanel() {
        if (panel && document.contains(panel)) return panel;
        panel = build();
        R = refs(panel);
        bind();
        return panel;
    }

    /* -- bindings ----------------------------------------------------------- */
    function bind() {
        ui.drag(R.hdr, panel, { ignore: '#rg-cls-btn, #rg-rst-btn, #rg-sync-btn', onEnd: ui.savePos('rg_panel_pos')(panel) });
        u.click(R.rst, resetDebugPosition);
        u.click(R.sync, syncModules);
        u.click(R.cls, () => { S.showDebug = false; RG.st.set('rg_debug_enabled', 'false'); updateDebugPanel(); });
        u.click(R.statsHdr, () => { S.isStatsExpanded = !S.isStatsExpanded; RG.st.set('rg_stats_expanded', S.isStatsExpanded); updateDebugPanel(); });
        u.click(R.blkHdr, () => { S.isBlockedExpanded = !S.isBlockedExpanded; RG.st.set('rg_blocked_expanded', S.isBlockedExpanded); updateDebugPanel(); });
    }

    /* -- sync: cache-busted refetch of every module, then reload ----------- */
    function syncModules() {
        if (!RG.syncAndReload) { setDebug('Sync unavailable', '--'); return; }
        R.sync.disabled = true;
        R.sync.classList.add('rg-spin');
        setDebug('Syncing modules', '--');
        RG.fetchRemoteVersion()
            .then(v => setDebug(v && v !== RG.version ? `Updated ${RG.version} to ${v}` : 'Already current', v || RG.version))
            .catch(() => { })
            .then(() => RG.syncAndReload())
            .catch(e => {
                R.sync.disabled = false;
                R.sync.classList.remove('rg-spin');
                setDebug('Sync failed', String((e && e.message) || e).slice(0, 26));
            });
    }
    RG.syncModules = syncModules;

    function resetDebugPosition() {
        const p = ensurePanel();
        p.style.top = '70px';
        p.style.left = '16px';
        RG.st.set('rg_panel_pos', '{"top":"70px","left":"16px"}');
        ui.clampToViewport(p, 'rg_panel_pos');
    }

    /* -- render ------------------------------------------------------------- */
    const dotColor = () => S.isAutoNavEnabled ? '#10B981' : '#FF2E56';
    const statusColor = t =>
        t.includes('SKIP') ? '#FF2E56' : (t.includes('Watching') || t.includes('[') ? '#10B981' : '#EFEEF0');

    function loopLabel() {
        const ls = S.loopSetting;
        if (ls === 11) return `${S.currentLoop}/∞`;
        if (ls >= 12) return `${RG.lm[ls].code} ${S.currentLoop}/${S.runtimeLoopTarget}`;
        if (ls === 5) return `${S.currentLoop}/${S.runtimeLoopTarget} <span style="font-size:8px">RNG</span>`;
        return `${S.currentLoop}/${ls}`;
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
                <div style="display:flex; justify-content:space-between; font-size:10px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                    <span style="color:#BAB9C0; overflow:hidden; text-overflow:ellipsis; max-width:170px; white-space:nowrap;">${k.startsWith('[') ? k : '@' + k}</span>
                    <span style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px; font-family:monospace;">${bbd[k]}</span>
                </div>`).join('')
            : '<span style="font-style:italic; color:#7A7985; font-size:10px;">No blocked items skipped yet.</span>';
    }

    function updateDebugPanel() {
        const p = ensurePanel();
        ui.show(p, S.showDebug);
        if (!S.showDebug) return;

        const c = dotColor();
        R.dot.style.background = c;
        R.dot.style.boxShadow = `0 0 7px ${c}`;

        R.status.textContent = S.debug.status;
        R.status.style.color = statusColor(S.debug.status);

        let id = S.currentVideoId || '--';
        if (id.includes('redgifs.com')) id = id.split('/').pop();
        R.id.textContent = id;

        R.spd.innerHTML = `${S.runtimeSpeedTarget.toFixed(2)}x ${S.speedRng && S.isAutoNavEnabled ? '<span style="font-size:8px; opacity:0.7">RNG</span>' : ''}`;
        R.tmr.textContent = S.debug.time;

        const bCode = RG.bm[S.runtimeBulletProfile]?.code || 'ON';
        R.loop.innerHTML = `${loopLabel()} ${S.bulletMode > 0 ? `<span style="font-size:8px; color:#FBBF24;">[${bCode}]</span>` : ''}`;

        ui.flashUpdate(R.statTot, S.stats.total);
        R.statCnt.style.display = S.isStatsExpanded ? 'block' : 'none';
        R.statChv.style.transform = S.isStatsExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        R.statsHdr.setAttribute('aria-expanded', String(S.isStatsExpanded));
        R.blkHdr.setAttribute('aria-expanded', String(S.isBlockedExpanded));

        if (!S.isStatsExpanded) return;
        ui.flashUpdate(R.statStd, S.stats.standard);
        ui.flashUpdate(R.statBul, S.stats.bullet);
        ui.flashUpdate(R.statFil, S.stats.blocked);
        R.filLst.style.display = S.isBlockedExpanded ? 'flex' : 'none';
        R.blkChv.style.transform = S.isBlockedExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        if (S.isBlockedExpanded) renderBreakdown();
    }

    /* -- throttled status writes -------------------------------------------- */
    let _sched = false;
    function scheduleDebugUpdate() {
        if (_sched) return;
        _sched = true;
        setTimeout(() => { _sched = false; updateDebugPanel(); }, 200);
    }
    function setDebug(status, time) {
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