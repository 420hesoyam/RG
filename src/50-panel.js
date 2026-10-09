/* ==========================================================================
 * RG · 50 PANEL
 * The floating AUTONAV debug/status panel: build, bind, update.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, ui = RG.ui, u = RG.u, ICO = RG.ICONS, $ = RG.$;

    const LBL = "color:#BAB9C0; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; display:block; margin-bottom:2px;";

    /* -- build ------------------------------------------------------------- */
    function build() {
        const panel = u.tag('div', 'rg-panel rg-panel-anim');
        panel.id = 'rg-debug-panel';
        u.css(panel, { top: S.panelPos.top, left: S.panelPos.left, width: '275px', fontSize: '11px', display: S.showDebug ? 'block' : 'none' });
        if (S.showDebug) panel.classList.add('rg-visible');
        panel.innerHTML = `
            <div id="rg-debug-hdr" style="padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:grab; user-select:none; background:rgba(0,0,0,0.22);">
                <div style="display:flex; gap:6px; align-items:center;">
                    ${ICO.grip}<div id="rg-dot" aria-hidden="true" style="width:7px; height:7px; border-radius:50%; background:#10B981; box-shadow:0 0 6px #10B981; transition:0.2s;"></div>
                    <span style="font-weight:700; font-size:11px; letter-spacing:0.6px;">AUTONAV</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
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
                    <button type="button" id="rg-blk-hdr" class="rg-tglhdr" aria-expanded="false" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; opacity:0.85; padding:2px 0; box-sizing:border-box;"><span style="font-size:9px; font-weight:700; color:#BAB9C0; text-transform:uppercase;">Blocked Breakdown</span><span id="rg-blk-chv" aria-hidden="true" style="font-size:8px; opacity:0.5; transition:0.2s;">▼</span></button>
                    <div id="rg-fil-lst" style="display:none; flex-direction:column; gap:4px; max-height:100px; overflow-y:auto; padding-top:8px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        return panel;
    }

    /* -- refs -------------------------------------------------------------- */
    const panel = build();
    const R = {
        hdr: $('rg-debug-hdr'), dot: $('rg-dot'), status: $('rg-status'), id: $('rg-id'),
        spd: $('rg-spd'), tmr: $('rg-tmr'), loop: $('rg-loop'),
        statTot: $('rg-stat-tot'), statStd: $('rg-stat-std'), statBul: $('rg-stat-bul'),
        statFil: $('rg-stat-fil'), statCnt: $('rg-stats-cnt'), statChv: $('rg-stat-chv'),
        statsHdr: $('rg-stats-hdr'), blkHdr: $('rg-blk-hdr'), blkChv: $('rg-blk-chv'), filLst: $('rg-fil-lst')
    };

    function resetDebugPosition() {
        panel.style.top = '70px';
        panel.style.left = '16px';
        RG.st.set('rg_panel_pos', '{"top":"70px","left":"16px"}');
        ui.clampToViewport(panel, 'rg_panel_pos');
    }

    /* -- bindings ----------------------------------------------------------- */
    ui.drag(R.hdr, panel, { ignore: '#rg-cls-btn, #rg-rst-btn', onEnd: ui.savePos('rg_panel_pos')(panel) });
    u.click($('rg-rst-btn'), resetDebugPosition);
    u.click($('rg-cls-btn'), () => { S.showDebug = false; RG.st.set('rg_debug_enabled', 'false'); updateDebugPanel(); });
    u.click(R.statsHdr, () => { S.isStatsExpanded = !S.isStatsExpanded; RG.st.set('rg_stats_expanded', S.isStatsExpanded); updateDebugPanel(); });
    u.click(R.blkHdr, () => { S.isBlockedExpanded = !S.isBlockedExpanded; RG.st.set('rg_blocked_expanded', S.isBlockedExpanded); updateDebugPanel(); });

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
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                    <span style="color:#BAB9C0; overflow:hidden; text-overflow:ellipsis; max-width:170px; white-space:nowrap;">${k.startsWith('[') ? k : '@' + k}</span>
                    <span style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px; font-family:monospace;">${bbd[k]}</span>
                </div>`).join('')
            : '<span style="font-style:italic; color:#7A7985; font-size:10px;">No blocked items skipped yet.</span>';
    }

    function updateDebugPanel() {
        ui.show(panel, S.showDebug);
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
    RG.panel = panel;
})(window.RG);
