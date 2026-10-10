/* ==========================================================================
 * RG · 60 MENU
 * The CONTROL CENTER overlay: master toggle, speed, automation grid,
 * unified blocklist & filler switches. Built lazily on first open.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, ui = RG.ui, u = RG.u, ICO = RG.ICONS, T = RG.TONES, $ = RG.$;

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
            `<span class="rg-row-title">Auto Skip (Master)</span>` +
            `<span class="rg-switch" aria-hidden="true"><span class="rg-switch-knob"></span></span>`);
        row.type = 'button';
        row.setAttribute('role', 'switch');
        row.setAttribute('aria-checked', String(S.isAutoNavEnabled));

        const sw = row.querySelector('.rg-switch');
        updaters.push(() => {
            sw.classList.toggle('rg-on', S.isAutoNavEnabled);
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
        box.style.cssText = 'padding:14px 16px 16px; display:flex; flex-direction:column; gap:8px;';
        box.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span class="rg-row-title">Playback Speed <span id="rg-m-spd" class="rg-val-mono" style="margin-left:6px; color:${T.brand};">${S.speedValue}x</span></span>
                <button type="button" id="rg-rng-btn" class="rg-chip" aria-label="Toggle random playback speed" aria-pressed="false" style="height:26px; padding:0 10px;">
                    RNG <span id="rg-rng-dot" class="rg-chip-dot"></span>
                </button>
            </div>
            <input type="range" class="rg-range" min="0.5" max="3.0" step="0.1" value="${S.speedValue}" aria-label="Playback speed">
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
            slider.value = String(S.speedValue);
            spdDisp.textContent = rng ? 'RNG' : `${S.speedValue}x`;
            rngBtn.classList.toggle('rg-chip-act', !!S.speedRng);
            rngDot.style.background = S.speedRng ? '#090909' : '';
            rngBtn.setAttribute('aria-pressed', String(!!S.speedRng));
        });

        card.appendChild(box);
        card.appendChild(automationGrid());
        return card;
    }

    function automationGrid() {
        const wrap = u.tag('div');
        wrap.appendChild(u.tag('div', 'rg-sec', 'Automation'));
        wrap.lastChild.style.cssText = 'padding:4px 16px 10px;';
        const grid = u.tag('div', 'rg-grid');

        const cell = (cfg) => {
            const box = u.tag('div', 'rg-btn');
            box.style.setProperty('--rg-tile', cfg.color);
            box.setAttribute('role', 'group');
            box.setAttribute('aria-label', cfg.label);

            const main = u.tag('button', 'rg-btn-main',
                `<span style="pointer-events:none; display:flex;">${RG.svg(cfg.icon)}</span>` +
                `<span class="rg-btn-label">${cfg.label}</span>`);
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
                box.classList.toggle('rg-on', !!act);
                badge.textContent = cfg.opts ? (cfg.opts[v]?.code || cfg.opts[v]?.text || '') : (v ? 'ON' : 'OFF');
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
                label: 'Loops', icon: ICO.loop, color: T.info, dep: true, dropdown: true, opts: RG.lm, isAct: v => v > 1,
                get: () => S.loopSetting,
                set: v => RG.setLoopMode(v),
                click: toggleTo(() => S.loopSetting, v => RG.setLoopMode(v), () => S.lastActiveLoopSetting, 2)
            },
            {
                label: 'Bullet', icon: ICO.bullet, color: T.warning, dep: true, dropdown: true, opts: RG.bm, isAct: v => v > 0,
                get: () => S.bulletMode,
                set: v => RG.applyBulletMode(v),
                click: toggleTo(() => S.bulletMode, v => RG.applyBulletMode(v), () => S.lastActiveBulletMode, 1)
            },
            {
                label: 'Photos', icon: ICO.photo, color: T.brand, dep: true, dropdown: true, opts: RG.pm, isAct: v => v > 0,
                get: () => S.photoSkipMode,
                set: v => RG.setPhotoMode(v),
                click: () => RG.setPhotoMode(S.photoSkipMode === 0 ? 1 : 0)
            },
            {
                label: 'Block', icon: ICO.block, color: T.error, dep: true,
                get: () => S.blockMasterEnabled,
                click: () => { S.blockMasterEnabled = !S.blockMasterEnabled; RG.st.set('rg_block_master_enabled', S.blockMasterEnabled); }
            },
            {
                label: 'Debug', icon: ICO.debug, color: T.purple, dep: false,
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
            <button type="button" id="rg-blk-toggle-hdr" class="rg-tglhdr" aria-expanded="false">
                <span class="rg-hdr-l">
                    <span class="rg-sec">Blocklist &amp; Fillers</span>
                    <span id="rg-blk-cnt" class="rg-count">${S.blockedUsers.length}</span>
                </span>
                <span id="rg-blk-menu-chv" class="rg-chev" aria-hidden="true">▼</span>
            </button>
            <div id="rg-blk-cnt-wrap" style="display:${S.isBlocklistExpanded ? 'block' : 'none'}; border-top:1px solid var(--rg-line-soft); padding:12px 0 0;">
                <div style="padding:0 12px 12px;">
                    <div class="rg-sec" style="margin-bottom:8px;">Block Fillers</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        ${FILLER_CHIPS.map(([id, key, label]) =>
            `<div id="${id}" class="rg-chip${S.fillers[key] ? ' rg-chip-act' : ''}"><span>${label}</span><span class="rg-chip-dot"></span></div>`).join('')}
                    </div>
                </div>
                <div style="padding:0 12px 12px; display:flex; gap:8px; align-items:center; flex-wrap:nowrap;">
                    <input id="rg-blk-inp" type="text" class="rg-input" placeholder="Add username...">
                    <button id="rg-blk-add" type="button" class="rg-pill rg-pill-primary">+ Add</button>
                </div>
                <div style="padding:0 12px 12px;">
                    <button id="rg-blk-cur" type="button" class="rg-pill rg-pill-secondary" style="width:100%;">Block Current Creator</button>
                </div>
                <div id="rg-blk-tags" class="rg-tags rg-scroll" style="padding:0 12px 12px;"></div>
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

        const curBtn = card.querySelector('#rg-blk-cur');
        const CUR_LABEL = 'Block Current Creator';
        u.on(curBtn, 'click', (e) => {
            e.stopPropagation();
            const name = RG.extractUser(RG.getActiveEl());
            if (name) {
                RG.blk.add(name);
                renderTags();
                curBtn.textContent = `Blocked @${name}`;
            } else {
                curBtn.textContent = 'Creator not detected';
            }
            setTimeout(() => { curBtn.textContent = CUR_LABEL; }, 1500);
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
                    <div class="rg-tag">
                        <span>@${x}</span>
                        <button type="button" class="rg-tag-del" data-del="${x}" aria-label="Remove @${x}">✕</button>
                    </div>`).join('')
                : '<span class="rg-tiny-i">No blocked users added.</span>';
            requestAnimationFrame(syncHeight);
        }

        updaters.push(renderTags);
        renderTags();
        return card;
    }

    /* -- shell ---------------------------------------------------------------- */
    function header() {
        const hdr = u.tag('div', 'rg-hdr');
        hdr.id = 'rg-menu-hdr';
        hdr.innerHTML = `
            <div class="rg-hdr-l">
                ${ICO.grip}<div id="rg-m-dot" class="rg-dot" aria-hidden="true"></div>
                <span class="rg-hdr-title">CONTROL CENTER</span>
            </div>
            <div class="rg-hdr-r">
                <button type="button" id="rg-m-rst" class="rg-icobtn" aria-label="Snap panel to control button" title="Reset position">${ICO.reset}</button>
                <button type="button" id="rg-m-cls" class="rg-icobtn" aria-label="Close control center" title="Close">✕</button>
            </div>
        `;
        const dot = hdr.querySelector('#rg-m-dot');
        updaters.push(() => {
            const c = S.isAutoNavEnabled ? T.success : T.brand;
            dot.style.background = c;
            dot.style.boxShadow = `0 0 8px ${c}`;
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
        u.css(menu, { width: '288px', overflow: 'hidden', padding: '0', zIndex: '2147483647', display: 'none' });

        const saved = RG.st.json('rg_menu_pos', 'null');
        if (saved && typeof saved === 'object') {
            menu.style.top = saved.top;
            menu.style.left = saved.left;
            menu.dataset.positioned = 'true';
        }

        scroll = u.tag('div', 'rg-body rg-scroll');
        scroll.id = 'rg-settings-scroll';
        u.css(scroll, { overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(100vh - 32px)', overscrollBehavior: 'contain' });

        menu.updateUI = refresh;

        scroll.appendChild(masterToggleCard());
        scroll.appendChild(speedCard());
        scroll.appendChild(blocklistCard());
        menu.appendChild(header());
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