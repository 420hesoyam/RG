/* ==========================================================================
 * RG · 50 PANEL
 * The floating AUTONAV debug/status panel: build, bind, update.
 * Built on first use, rebuilt if it ever leaves the document.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, ui = RG.ui, u = RG.u, ICO = RG.ICONS, T = RG.TONES;

    let panel = null, R = null;

    /* -- build ------------------------------------------------------------- */
    function build() {
        const p = u.tag('div', 'rg-panel rg-panel-anim');
        p.id = 'rg-debug-panel';
        p.dataset.rgRun = RG.runId;
        u.css(p, { top: S.panelPos.top, left: S.panelPos.left, width: '288px', display: S.showDebug ? 'block' : 'none' });
        if (S.showDebug) p.classList.add('rg-visible');
        p.innerHTML = `
            <div id="rg-debug-hdr" class="rg-hdr">
                <div class="rg-hdr-l">
                    ${ICO.grip}<div id="rg-dot" class="rg-dot" aria-hidden="true"></div>
                    <span class="rg-hdr-title">AUTONAV</span>
                    <span class="rg-hdr-ver">v${RG.version}</span>
                </div>
                <div class="rg-hdr-r">
                    <button type="button" id="rg-sync-btn" class="rg-icobtn" aria-label="Sync modules and reload" title="Sync modules + reload">${ICO.sync}</button>
                    <button type="button" id="rg-rst-btn" class="rg-icobtn" aria-label="Reset panel position" title="Reset position">${ICO.reset}</button>
                    <button type="button" id="rg-cls-btn" class="rg-icobtn" aria-label="Close debug panel" title="Close">✕</button>
                </div>
            </div>
            <div id="rg-debug-body">
                <div class="rg-body" style="display:grid; grid-template-columns:1fr 1fr; gap:10px 12px;">
                    <div>
                        <span class="rg-lbl">Status</span>
                        <span id="rg-status" class="rg-val">--</span>
                    </div>
                    <div class="rg-val-right">
                        <span class="rg-lbl">Speed</span>
                        <span id="rg-spd" class="rg-val rg-val-mono" style="color:${T.brand};">1.0x</span>
                    </div>
                    <div>
                        <span class="rg-lbl">Media ID</span>
                        <span id="rg-id" class="rg-val rg-val-mono" style="color:${T.info}; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block; vertical-align:bottom;">--</span>
                    </div>
                    <div class="rg-val-right">
                        <span class="rg-lbl">Loop &amp; Bullet</span>
                        <span id="rg-loop" class="rg-val rg-val-mono" style="color:${T.text_muted};">1/1</span> <span id="rg-tmr" class="rg-val rg-val-mono">--</span>
                    </div>
                </div>
                <button type="button" id="rg-stats-hdr" class="rg-tglhdr rg-stats-hdr" aria-expanded="false" style="border-top:1px solid var(--rg-line); background:#191919;">
                    <span class="rg-sec">Statistics</span>
                    <span style="display:flex; align-items:center; gap:8px;"><span id="rg-stat-tot" class="rg-val-mono" style="color:${T.text_muted};">0</span><span id="rg-stat-chv" class="rg-chev" aria-hidden="true">▼</span></span>
                </button>
                <div id="rg-stats-cnt" class="rg-body" style="display:none; padding-top:0;">
                    <div class="rg-stats" style="margin-bottom:10px;">
                        <div class="rg-stat">
                            <div class="rg-stat-k">STD / BULLET</div>
                            <div class="rg-stat-v"><span id="rg-stat-std" style="color:${T.success};">0</span><span style="opacity:0.25;">/</span><span id="rg-stat-bul" style="color:${T.warning};">0</span></div>
                        </div>
                        <div class="rg-stat">
                            <div class="rg-stat-k">Blocked</div>
                            <div id="rg-stat-fil" class="rg-stat-v" style="color:${T.error};">0</div>
                        </div>
                    </div>
                    <button type="button" id="rg-blk-hdr" class="rg-tglhdr" aria-expanded="false" style="padding:0 0 2px;">
                        <span class="rg-sec">Blocked Breakdown</span>
                        <span id="rg-blk-chv" class="rg-chev" aria-hidden="true">▼</span>
                    </button>
                    <div id="rg-fil-lst" class="rg-list rg-scroll" style="display:none; padding-top:8px;"></div>
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
    const dotColor = () => S.isAutoNavEnabled ? T.success : T.brand;
    const statusColor = t =>
        t.includes('SKIP') ? T.error : (t.includes('Watching') || t.includes('[') ? T.success : T.text);

    function loopLabel() {
        const ls = S.loopSetting;
        if (ls === 11) return `${S.currentLoop}/∞`;
        if (ls >= 12) return `${RG.lm[ls].code} ${S.currentLoop}/${S.runtimeLoopTarget}`;
        if (ls === 5) return `${S.currentLoop}/${S.runtimeLoopTarget} <span class="rg-mini">RNG</span>`;
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
                <div class="rg-list-row">
                    <span class="rg-list-k">${k.startsWith('[') ? k : '@' + k}</span>
                    <span class="rg-list-v">${bbd[k]}</span>
                </div>`).join('')
            : '<span class="rg-tiny-i">No blocked items skipped yet.</span>';
    }

    function updateDebugPanel() {
        const p = ensurePanel();
        ui.show(p, S.showDebug);
        if (!S.showDebug) return;

        const c = dotColor();
        R.dot.style.background = c;
        R.dot.style.boxShadow = `0 0 8px ${c}`;

        R.status.textContent = S.debug.status;
        R.status.style.color = statusColor(S.debug.status);

        let id = S.currentVideoId || '--';
        if (id.includes('redgifs.com')) id = id.split('/').pop();
        R.id.textContent = id;

        R.spd.innerHTML = `${S.runtimeSpeedTarget.toFixed(2)}x ${S.speedRng && S.isAutoNavEnabled ? `<span class="rg-mini" style="opacity:0.7">RNG</span>` : ''}`;
        R.tmr.textContent = S.debug.time;

        const bCode = RG.bm[S.runtimeBulletProfile]?.code || 'ON';
        R.loop.innerHTML = `${loopLabel()} ${S.bulletMode > 0 ? `<span class="rg-mini" style="color:${T.warning};">[${bCode}]</span>` : ''}`;

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