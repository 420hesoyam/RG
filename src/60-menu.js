/* ==========================================================================
 * RG · 60 MENU
 * The CONTROL CENTER overlay: master toggle, speed, automation grid,
 * unified blocklist & filler switches. Built lazily on first open.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, ui = RG.ui, u = RG.u, ICO = RG.ICONS, $ = RG.$;

    const FILLER_CHIPS = [
        ['rg-chip-niches', 'niches', 'Niches / Tags'],
        ['rg-chip-creators', 'creators', 'Top Creators'],
        ['rg-chip-streams', 'streams', 'Live Streams'],
        ['rg-chip-ads', 'ads', 'OnlyFans Ads']
    ];

    let menu = null, scroll = null, updaters = [];

    /* -- height fitting ------------------------------------------------------ */
    function syncHeight() {
        if (!menu) return;
        const MARGIN = 16, MIN = 260;
        const rect = menu.getBoundingClientRect();
        let top = rect && rect.height > 0 ? rect.top : (parseFloat(menu.style.top) || MARGIN);
        top = Math.max(MARGIN, top);

        let avail = window.innerHeight - top - MARGIN;
        if (avail < MIN) {
            const needed = Math.max(MARGIN, window.innerHeight - MIN - MARGIN);
            if (needed < top) {
                menu.style.top = `${needed}px`;
                avail = window.innerHeight - needed - MARGIN;
            }
        }
        const maxVh = window.innerHeight - MARGIN * 2;
        const h = avail < 150 ? Math.max(80, avail) : Math.min(maxVh, Math.max(150, avail));

        menu.style.maxHeight = `${h}px`;
        if (scroll) scroll.style.maxHeight = `${h}px`;
        const tags = $('rg-blk-tags');
        if (tags) tags.style.maxHeight = `${Math.max(80, Math.min(150, Math.floor(h * 0.35)))}px`;
        ui.clampToViewport(menu, 'rg_menu_pos');
    }

    /* -- positioning ---------------------------------------------------------- */
    function positionMenuNearAnchor(m, anchorBtn) {
        const r = anchorBtn.getBoundingClientRect();
        m.style.left = `${r.left - 300}px`;
        m.style.top = `${Math.max(10, r.top - 20)}px`;
        m.dataset.positioned = 'true';
        ui.clampToViewport(m);
        syncHeight();
        RG.st.set('rg_menu_pos', JSON.stringify({ top: m.style.top, left: m.style.left }));
    }

    function avoidOverlapWithDebugPanel(m) {
        if (!S.showDebug || RG.panel.style.display === 'none') return;
        const a = m.getBoundingClientRect(), b = RG.panel.getBoundingClientRect();
        if (a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom) return;

        const below = b.bottom + 12;
        if (below + m.offsetHeight <= window.innerHeight) m.style.top = `${below}px`;
        else {
            const right = b.right + 12;
            if (right + m.offsetWidth <= window.innerWidth) m.style.left = `${right}px`;
        }
        ui.clampToViewport(m, 'rg_menu_pos');
        syncHeight();
    }

    /* -- card builders --------------------------------------------------------- */
    function masterToggleCard() {
        const card = u.tag('div', 'rg-card');
        const row = u.tag('button', 'rg-row',
            `<span style="font-weight:700; font-size:12px; pointer-events:none;">Auto Skip (Master)</span>` +
            `<span class="rg-switch" aria-hidden="true" style="pointer-events:none;"><span class="rg-switch-knob"></span></span>`);
        row.type = 'button';
        row.setAttribute('role', 'switch');
        row.setAttribute('aria-checked', String(S.isAutoNavEnabled));

        const sw = row.querySelector('.rg-switch'), knob = row.querySelector('.rg-switch-knob');
        updaters.push(() => {
            sw.style.background = S.isAutoNavEnabled ? '#10B981' : '#FF2E56';
            knob.style.left = S.isAutoNavEnabled ? '16px' : '2px';
            row.setAttribute('aria-checked', String(S.isAutoNavEnabled));
        });
        u.on(row, 'click', (e) => {
            e.stopPropagation();
            S.isAutoNavEnabled = !S.isAutoNavEnabled;
            RG.st.set('rg_auto_enabled', S.isAutoNavEnabled);
            RG.syncControlBtn();
            RG.updateDebugPanel();
            refresh();
        });
        card.appendChild(row);
        return card;
    }

    function speedCard() {
        const card = u.tag('div', 'rg-card');
        const box = u.tag('div');
        box.style.cssText = 'padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:8px;';
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; font-size:11px;">Playback Speed <span id="rg-m-spd" style="color:#FF2E56; font-family:monospace; font-weight:700;">${S.speedValue}x</span></span>
                <button type="button" id="rg-rng-btn" aria-label="Toggle random playback speed" aria-pressed="false" style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.06); padding:3px 7px; border-radius:4px; cursor:pointer; font-size:9px; font-weight:700; color:#BAB9C0; border:1px solid rgba(255,255,255,0.08); -webkit-appearance:none; appearance:none; font-family:inherit;">
                    RNG <span id="rg-rng-dot" style="width:6px; height:6px; border-radius:50%; background:#555;"></span>
                </button>
            </div>
            <input type="range" min="0.5" max="3.0" step="0.1" value="${S.speedValue}" aria-label="Playback speed">
        `;

        const slider = box.querySelector('input');
        const rngBtn = box.querySelector('#rg-rng-btn');
        const rngDot = box.querySelector('#rg-rng-dot');
        const spdDisp = box.querySelector('#rg-m-spd');
        const saveSpeed = u.debounce(v => RG.st.set('rg_speed_val', v), 300);

        const onSlide = (e) => {
            e.stopPropagation();
            const val = parseFloat(e.target.value);
            RG.applyActiveSpeed(val);
            saveSpeed(val);
            refresh();
        };
        slider.oninput = onSlide;
        slider.onchange = onSlide;
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach(ev => u.on(slider, ev, e => e.stopPropagation()));

        u.on(rngBtn, 'click', (e) => {
            e.stopPropagation();
            if (!S.isAutoNavEnabled) return;
            S.speedRng = !S.speedRng;
            RG.st.set('rg_speed_rng', S.speedRng);
            if (!S.speedRng) RG.applyActiveSpeed(S.speedValue);
            refresh();
            RG.updateDebugPanel();
        });

        updaters.push(() => {
            const off = !S.isAutoNavEnabled, rng = S.speedRng && !off;
            box.style.opacity = off ? '0.4' : '1';
            box.style.pointerEvents = off ? 'none' : 'auto';
            slider.disabled = rng;
            slider.style.opacity = rng ? '0.3' : '1';
            slider.value = String(S.speedValue);
            spdDisp.textContent = rng ? 'RNG' : `${S.speedValue}x`;
            rngBtn.style.color = S.speedRng ? '#FF2E56' : '#BAB9C0';
            rngDot.style.background = S.speedRng ? '#FF2E56' : '#555';
            rngBtn.setAttribute('aria-pressed', String(!!S.speedRng));
        });

        card.appendChild(box);
        card.appendChild(automationGrid());
        return card;
    }

    function automationGrid() {
        const wrap = u.tag('div');
        wrap.innerHTML = `<div style="font-size:9px; font-weight:700; color:#BAB9C0; letter-spacing:0.6px; padding:10px 14px 0;">AUTOMATION</div>`;
        const grid = u.tag('div');
        grid.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; padding:10px 12px 12px;';

        const cell = (cfg) => {
            const box = u.tag('div', 'rg-btn');
            box.setAttribute('role', 'group');
            box.setAttribute('aria-label', cfg.label);

            const main = u.tag('button', 'rg-btn-main',
                `<span style="pointer-events:none; color:#BAB9C0; display:flex;">${RG.svg(cfg.icon)}</span>` +
                `<span style="font-size:9px; font-weight:600; color:#BAB9C0; margin-top:6px; text-transform:uppercase; pointer-events:none;">${cfg.label}</span>`);
            const badge = u.tag('button', 'rg-badge');
            main.type = badge.type = 'button';
            badge.setAttribute('aria-label', `${cfg.label} mode selector`);

            const fire = (e) => {
                e.stopPropagation();
                if (cfg.dep && !S.isAutoNavEnabled) return;
                if (cfg.dropdown) ui.showDropdown(badge, cfg.opts, cfg.get(), v => { cfg.set(v); refresh(); }, cfg.color, `${cfg.label} Mode`);
                else { cfg.click(); refresh(); }
            };
            u.on(badge, 'click', fire);
            u.on(main, 'click', fire);

            updaters.push(() => {
                const dis = cfg.dep && !S.isAutoNavEnabled;
                main.disabled = badge.disabled = dis;
                box.style.opacity = dis ? '0.35' : '1';
                const v = cfg.get(), act = cfg.isAct ? cfg.isAct(v) : (v !== 0 && v !== 1 && v !== false);
                box.style.background = act ? `${cfg.color}22` : 'rgba(255,255,255,0.03)';
                box.style.borderColor = act ? `${cfg.color}66` : 'rgba(255,255,255,0.08)';
                main.firstElementChild.style.color = act ? cfg.color : '#BAB9C0';
                badge.textContent = cfg.opts ? (cfg.opts[v]?.code || cfg.opts[v]?.text || '') : (v ? 'ON' : 'OFF');
                badge.style.background = act ? cfg.color : 'rgba(0,0,0,0.6)';
                main.setAttribute('aria-pressed', String(act));
                badge.setAttribute('aria-pressed', String(act));
            });

            box.appendChild(main);
            box.appendChild(badge);
            return box;
        };

        const toggleTo = (get, set, last, def) => () => set(get() > 0 ? 0 : (last() || def));

        [
            {
                label: 'Loops', icon: ICO.loop, color: '#38BDF8', dep: true, dropdown: true, opts: RG.lm, isAct: v => v > 1,
                get: () => S.loopSetting,
                set: v => RG.setLoopMode(v),
                click: toggleTo(() => S.loopSetting, v => RG.setLoopMode(v), () => S.lastActiveLoopSetting, 2)
            },
            {
                label: 'Jumps', icon: ICO.jump, color: '#FB923C', dep: true, dropdown: true, opts: RG.jm, isAct: v => v > 0,
                get: () => S.timeJumpMode,
                set: v => RG.applyJumpMode(v),
                click: toggleTo(() => S.timeJumpMode, v => RG.applyJumpMode(v), () => S.lastActiveJumpMode, 1)
            },
            {
                label: 'Bullet', icon: ICO.bullet, color: '#FBBF24', dep: true, dropdown: true, opts: RG.bm, isAct: v => v > 0,
                get: () => S.bulletMode,
                set: v => RG.applyBulletMode(v),
                click: toggleTo(() => S.bulletMode, v => RG.applyBulletMode(v), () => S.lastActiveBulletMode, 1)
            },
            {
                label: 'Photos', icon: ICO.photo, color: '#FF2E56', dep: true, dropdown: true, opts: RG.pm, isAct: v => v > 0,
                get: () => S.photoSkipMode,
                set: v => RG.setPhotoMode(v),
                click: () => RG.setPhotoMode(S.photoSkipMode === 0 ? 1 : 0)
            },
            {
                label: 'Block', icon: ICO.block, color: '#FF335C', dep: true,
                get: () => S.blockMasterEnabled,
                click: () => { S.blockMasterEnabled = !S.blockMasterEnabled; RG.st.set('rg_block_master_enabled', S.blockMasterEnabled); }
            },
            {
                label: 'Debug', icon: ICO.debug, color: '#A855F7', dep: false,
                get: () => S.showDebug,
                click: () => {
                    S.showDebug = !S.showDebug;
                    RG.st.set('rg_debug_enabled', S.showDebug);
                    RG.updateDebugPanel();
                    ui.clampToViewport(RG.panel, 'rg_panel_pos');
                }
            }
        ].forEach(c => grid.appendChild(cell(c)));

        wrap.appendChild(grid);
        return wrap;
    }

    /* -- blocklist card -------------------------------------------------------- */
    function blocklistCard() {
        const card = u.tag('div', 'rg-card');
        card.style.marginBottom = '4px';
        card.innerHTML = `
            <button type="button" id="rg-blk-toggle-hdr" class="rg-tglhdr" aria-expanded="false" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; background:rgba(255,255,255,0.015); transition:background 0.2s;">
                <div style="display:flex; align-items:center; gap:6px; pointer-events:none;">
                    <span style="font-size:10px; font-weight:700; color:#BAB9C0; letter-spacing:0.6px;">BLOCKLIST &amp; FILLERS</span>
                    <span id="rg-blk-cnt" style="background:rgba(255,46,86,0.15); border:1px solid rgba(255,46,86,0.3); color:#FF2E56; font-size:9px; font-weight:700; padding:1px 6px; border-radius:10px; font-family:monospace;">${S.blockedUsers.length}</span>
                </div>
                <span id="rg-blk-menu-chv" aria-hidden="true" style="font-size:8px; opacity:0.5; transition:transform 0.2s;">▼</span>
            </button>
            <div id="rg-blk-cnt-wrap" style="display:${S.isBlocklistExpanded ? 'block' : 'none'}; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                <div style="padding:0 12px 10px;">
                    <div style="font-size:9px; font-weight:700; color:#BAB9C0; text-transform:uppercase; margin-bottom:6px;">Block Fillers</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        ${FILLER_CHIPS.map(([id, key, label]) =>
            `<div id="${id}" class="rg-chip${S.fillers[key] ? ' rg-chip-act' : ''}"><span>${label}</span><span class="rg-chip-dot"></span></div>`).join('')}
                    </div>
                </div>
                <div style="padding:0 12px 8px; display:flex; gap:6px; align-items:center; flex-wrap:nowrap;">
                    <input id="rg-blk-inp" type="text" placeholder="Add username..." style="flex:1 1 0%; min-width:0; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:11px; padding:5px 8px; outline:none;">
                    <button id="rg-blk-add" type="button" style="flex:0 0 auto; white-space:nowrap; background:rgba(255,46,86,0.2); border:1px solid rgba(255,46,86,0.4); color:#FF2E56; font-size:10px; font-weight:700; border-radius:6px; padding:0 10px; cursor:pointer; height:26px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">+ Add</button>
                </div>
                <div style="padding:0 12px 10px;">
                    <button id="rg-blk-cur" type="button" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#EFEEF0; font-size:10px; font-weight:600; border-radius:6px; padding:6px 0; cursor:pointer; transition:0.2s;">🚫 Block Current Creator</button>
                </div>
                <div id="rg-blk-tags" style="display:flex; flex-wrap:wrap; gap:4px; max-height:150px; overflow-y:auto; overscroll-behavior:contain; padding:0 12px 10px;"></div>
            </div>
        `;

        const hdr = card.querySelector('#rg-blk-toggle-hdr');
        const body = card.querySelector('#rg-blk-cnt-wrap');
        const chv = card.querySelector('#rg-blk-menu-chv');
        const cnt = card.querySelector('#rg-blk-cnt');
        const inp = card.querySelector('#rg-blk-inp');
        const tags = card.querySelector('#rg-blk-tags');

        u.on(hdr, 'click', (e) => {
            e.stopPropagation();
            S.isBlocklistExpanded = !S.isBlocklistExpanded;
            RG.st.set('rg_blocklist_menu_expanded', S.isBlocklistExpanded);
            renderTags();
            requestAnimationFrame(() => {
                syncHeight();
                if (S.isBlocklistExpanded && scroll) scroll.scrollTop = scroll.scrollHeight;
            });
        });

        FILLER_CHIPS.forEach(([id, key]) => u.on(card.querySelector('#' + id), 'click', (e) => {
            e.stopPropagation();
            RG.blk.toggleFiller(key);
            e.currentTarget.classList.toggle('rg-chip-act', S.fillers[key]);
        }));

        const submit = (e) => {
            e.stopPropagation();
            if (!inp.value.trim()) return;
            RG.blk.add(inp.value);
            inp.value = '';
            renderTags();
        };
        u.on(card.querySelector('#rg-blk-add'), 'click', submit);
        u.on(inp, 'keydown', (e) => { if (e.key === 'Enter') submit(e); });

        u.on(card.querySelector('#rg-blk-cur'), 'click', (e) => {
            e.stopPropagation();
            const btn = e.currentTarget, name = RG.extractUser(RG.getActiveEl());
            if (name) {
                RG.blk.add(name);
                renderTags();
                btn.textContent = `✓ Blocked @${name}`;
            } else {
                btn.textContent = '⚠️ Creator not detected';
            }
            setTimeout(() => { btn.textContent = '🚫 Block Current Creator'; }, 1500);
        });

        u.on(tags, 'click', (e) => {
            const victim = e.target.getAttribute('data-del');
            if (!victim) return;
            e.stopPropagation();
            RG.blk.remove(victim);
            renderTags();
        });

        function renderTags() {
            cnt.textContent = S.blockedUsers.length;
            body.style.display = S.isBlocklistExpanded ? 'block' : 'none';
            chv.style.transform = S.isBlocklistExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
            hdr.setAttribute('aria-expanded', String(S.isBlocklistExpanded));
            tags.innerHTML = S.blockedUsers.length
                ? S.blockedUsers.map(x => `
                    <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-size:10px; font-family:monospace; color:#EFEEF0;">
                        <span>@${x}</span>
                        <button type="button" data-del="${x}" aria-label="Remove @${x}" style="cursor:pointer; opacity:0.6; font-size:9px; margin-left:2px; padding:0; border:none; background:transparent; color:inherit; line-height:1;">✕</button>
                    </div>`).join('')
                : '<span style="color:#7A7985; font-size:10px; font-style:italic;">No blocked users added.</span>';
            requestAnimationFrame(syncHeight);
        }

        updaters.push(renderTags);
        renderTags();
        return card;
    }

    /* -- shell ---------------------------------------------------------------- */
    function header() {
        const hdr = u.tag('div');
        hdr.style.cssText = 'position:sticky; top:-12px; z-index:10; background:rgba(21,20,26,0.98); margin:-12px -12px 12px -12px; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; cursor:grab; user-select:none; border-radius:12px 12px 0 0;';
        hdr.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                ${ICO.grip}<div id="rg-m-dot" aria-hidden="true" style="width:7px; height:7px; border-radius:50%; background:#10B981; box-shadow:0 0 7px #10B981; transition:0.2s;"></div>
                <span style="font-weight:700; font-size:11px; letter-spacing:0.8px;">CONTROL CENTER</span>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
                <button type="button" id="rg-m-rst" class="rg-icobtn" aria-label="Snap panel to control button" title="Reset position">${ICO.reset}</button>
                <button type="button" id="rg-m-cls" class="rg-icobtn" aria-label="Close control center" title="Close">✕</button>
            </div>
        `;
        const dot = hdr.querySelector('#rg-m-dot');
        updaters.push(() => {
            const c = S.isAutoNavEnabled ? '#10B981' : '#FF2E56';
            dot.style.background = c;
            dot.style.boxShadow = `0 0 7px ${c}`;
        });
        ui.drag(hdr, menu, { ignore: '#rg-m-cls, #rg-m-rst', onEnd: ui.savePos('rg_menu_pos')(menu) });
        u.on(hdr.querySelector('#rg-m-cls'), 'click', (e) => { e.stopPropagation(); ui.show(menu, false); ui.closeDropdown(); });
        u.on(hdr.querySelector('#rg-m-rst'), 'click', (e) => {
            e.stopPropagation();
            ui.closeDropdown();
            const anchor = RG.getControlBtn();
            if (anchor && document.contains(anchor)) positionMenuNearAnchor(menu, anchor);
            else { ui.clampToViewport(menu, 'rg_menu_pos'); syncHeight(); }
        });
        return hdr;
    }

    function refresh() { updaters.forEach(fn => fn()); }

    function create() {
        updaters = [];
        menu = u.tag('div', 'rg-panel rg-panel-anim');
        menu.id = 'rg-settings-menu';
        menu.dataset.rgRun = RG.runId;
        u.css(menu, { width: '285px', overflow: 'hidden', padding: '0', zIndex: '2147483647', display: 'none', borderRadius: '12px' });

        const saved = RG.st.json('rg_menu_pos', 'null');
        if (saved && typeof saved === 'object') {
            menu.style.top = saved.top;
            menu.style.left = saved.left;
            menu.dataset.positioned = 'true';
        }

        scroll = u.tag('div');
        scroll.id = 'rg-settings-scroll';
        u.css(scroll, { overflowY: 'auto', overflowX: 'hidden', padding: '12px', maxHeight: 'calc(100vh - 32px)', overscrollBehavior: 'contain' });

        menu.updateUI = refresh;

        scroll.appendChild(header());
        scroll.appendChild(masterToggleCard());
        scroll.appendChild(speedCard());
        scroll.appendChild(blocklistCard());
        menu.appendChild(scroll);
        document.body.appendChild(menu);

        syncHeight();
        refresh();
        return menu;
    }

    RG.getOrCreateMenu = () => {
        const existing = $('rg-settings-menu');
        if (existing) {
            menu = existing;
            refresh();
            return existing;
        }
        return create();
    };
    RG.refreshMenu = refresh;
    RG.positionMenuNearAnchor = positionMenuNearAnchor;
    RG.avoidOverlapWithDebugPanel = avoidOverlapWithDebugPanel;
    RG.refresh = refresh;
    RG.menu = { syncHeight };
})(window.RG);
