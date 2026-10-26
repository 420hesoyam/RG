/* ==========================================================================
 * RG · 60 MENU
 * The CONTROL CENTER overlay: master toggle, speed, automation grid,
 * unified blocklist & filler switches. Built lazily on first open.
 * Visual language mirrors redgifs.com: DM Sans, #0f0f0f/#191919 surfaces,
 * pill controls and #ebfa63 as the selected/primary accent.
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
    const SPEED_PRESETS = [0.5, 1, 1.5, 2, 3];
    const MENU_W = 300;
    const MARGIN = 16, GAP = 12;

    let menu = null, scroll = null, updaters = [], menuTimer = 0, menuEpoch = 0;

    /* -- height fitting ------------------------------------------------------ */
    function syncHeight() {
        if (!menu) return;
        const MIN = 240;
        const rect = menu.getBoundingClientRect();
        let top = rect && rect.height > 0 ? rect.top : (parseFloat(menu.style.top) || MARGIN);
        top = Math.max(MARGIN, top);

        let avail = window.innerHeight - top - MARGIN;
        if (avail < MIN) {
            const needed = Math.max(MARGIN, window.innerHeight - MIN - MARGIN);
            if (needed < top) {
                menu.style.top = `${needed}px`;
                top = needed;
                avail = window.innerHeight - needed - MARGIN;
            }
        }

        const maxVh = window.innerHeight - MARGIN * 2;
        const h = Math.max(140, Math.min(maxVh, avail));
        menu.style.maxHeight = `${h}px`;

        const hdr = menu.querySelector('#rg-menu-hdr');
        const hdrH = hdr ? hdr.offsetHeight : 0;
        if (scroll) scroll.style.maxHeight = `${Math.max(80, h - hdrH)}px`;

        const tags = $('rg-blk-tags');
        if (tags) tags.style.maxHeight = `${Math.max(70, Math.min(150, Math.floor(h * 0.3)))}px`;
        ui.clampToViewport(menu, 'rg_menu_pos');
    }

    /* -- positioning ---------------------------------------------------------- */
    function positionMenuNearAnchor(m, anchorBtn) {
        if (!m) return;
        m.style.width = `${MENU_W}px`;
        const aw = m.offsetWidth || MENU_W;
        const ah = m.offsetHeight || 380;
        let left, top;

        if (anchorBtn && document.contains(anchorBtn)) {
            const r = anchorBtn.getBoundingClientRect();
            const leftOf = r.left - aw - GAP;
            const rightOf = r.right + GAP;
            if (leftOf >= MARGIN) left = leftOf;
            else if (rightOf + aw <= window.innerWidth - MARGIN) left = rightOf;
            else left = (window.innerWidth - aw) / 2;
            top = u.clamp(r.top - 18, MARGIN, Math.max(MARGIN, window.innerHeight - ah - MARGIN));
        } else {
            left = (window.innerWidth - aw) / 2;
            top = Math.max(MARGIN, (window.innerHeight - ah) / 2);
        }

        m.style.left = `${Math.round(left)}px`;
        m.style.top = `${Math.round(top)}px`;
        m.dataset.positioned = 'true';
        ui.clampToViewport(m, 'rg_menu_pos');
        syncHeight();
        ui.savePos('rg_menu_pos')(m);
    }

    function avoidOverlapWithDebugPanel(m) {
        if (!m || !S.showDebug) return;
        const p = RG.panel;
        if (!p || p.style.display === 'none') return;
        const a = m.getBoundingClientRect(), b = p.getBoundingClientRect();
        if (!a.width || !b.width) return;
        if (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) return;

        const below = b.bottom + GAP;
        const above = b.top - a.height - GAP;
        const right = b.right + GAP;
        const left = b.left - a.width - GAP;

        if (below + a.height <= window.innerHeight - MARGIN) m.style.top = `${below}px`;
        else if (above >= MARGIN) m.style.top = `${above}px`;
        else if (right + a.width <= window.innerWidth - MARGIN) m.style.left = `${right}px`;
        else if (left >= MARGIN) m.style.left = `${left}px`;
        else {
            m.style.left = `${Math.max(MARGIN, Math.min(a.left, window.innerWidth - a.width - MARGIN))}px`;
            m.style.top = `${Math.max(MARGIN, Math.min(a.top, window.innerHeight - a.height - MARGIN))}px`;
        }

        ui.clampToViewport(m, 'rg_menu_pos');
        syncHeight();
    }

    /* -- card builders --------------------------------------------------------- */
    function masterToggleCard() {
        const card = u.tag('div', 'rg-card');
        const row = u.tag('button', 'rg-row',
            `<span style="min-width:0;">` +
            `<span class="rg-row-title">Auto Skip</span>` +
            `<span class="rg-row-sub rg-ellipsis" id="rg-master-sub">Running</span>` +
            `</span>` +
            `<span class="rg-switch" aria-hidden="true"><span class="rg-switch-knob"></span></span>`);
        row.type = 'button';
        row.id = 'rg-master-row';
        row.setAttribute('role', 'switch');
        row.setAttribute('aria-checked', String(S.isAutoNavEnabled));

        const sw = row.querySelector('.rg-switch');
        const sub = row.querySelector('#rg-master-sub');
        updaters.push(() => {
            const on = S.isAutoNavEnabled;
            sw.classList.toggle('rg-on', on);
            row.setAttribute('aria-checked', String(on));
            const st = String(S.debug.status || 'Starting');
            sub.textContent = on
                ? `Running · ${S.runtimeSpeedTarget.toFixed(2)}x · ${st}`
                : 'Paused · manual navigation';
            sub.title = sub.textContent;
        });
        u.on(row, 'click', (e) => {
            e.stopPropagation();
            RG.setAutoNav(!S.isAutoNavEnabled);
            refresh();
            RG.updateDebugPanel();
        });
        card.appendChild(row);
        return card;
    }

    function speedCard() {
        const card = u.tag('div', 'rg-card');
        const box = u.tag('div');
        box.style.cssText = 'padding:12px 14px 14px; display:flex; flex-direction:column; gap:9px;';

        box.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span class="rg-sec">Playback Speed</span>
                <span id="rg-m-spd" class="rg-val-mono" style="color:${T.accent};">${S.speedValue.toFixed(1)}x</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="range" class="rg-range" min="0.5" max="3.0" step="0.1" value="${S.speedValue}" aria-label="Playback speed">
                <button type="button" id="rg-rng-btn" class="rg-chip" aria-label="Toggle random playback speed" aria-pressed="false" title="Randomise speed per video" style="min-height:26px; padding:3px 10px; flex:0 0 auto; font-size:10px; font-weight:600;">
                    RNG <span id="rg-rng-dot" class="rg-chip-dot"></span>
                </button>
            </div>
            <div class="rg-presets" aria-label="Speed presets">
                ${SPEED_PRESETS.map(v => `<button type="button" class="rg-preset" data-speed="${v}">${v}x</button>`).join('')}
            </div>
        `;

        const slider = box.querySelector('input');
        const rngBtn = box.querySelector('#rg-rng-btn');
        const spdDisp = box.querySelector('#rg-m-spd');
        const presets = Array.from(box.querySelectorAll('.rg-preset'));
        const saveSpeed = u.debounce(v => RG.st.set('rg_speed_val', v), 300);

        const setSpeed = (val) => {
            RG.applyActiveSpeed(val);
            saveSpeed(val);
            refresh();
        };
        const onSlide = (e) => {
            e.stopPropagation();
            setSpeed(parseFloat(e.target.value));
        };
        slider.oninput = onSlide;
        slider.onchange = onSlide;
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach(ev => u.on(slider, ev, e => e.stopPropagation()));
        presets.forEach(btn => u.on(btn, 'click', (e) => {
            e.stopPropagation();
            if (slider.disabled) return;
            setSpeed(parseFloat(btn.dataset.speed));
        }));

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
            const rng = S.speedRng && S.isAutoNavEnabled;
            slider.disabled = rng;
            slider.value = String(S.speedValue);
            const pct = ((S.speedValue - 0.5) / 2.5) * 100;
            slider.style.setProperty('--rg-fill', `${u.clamp(pct, 0, 100)}%`);
            spdDisp.textContent = rng
                ? `${S.speedValue.toFixed(1)}x · RNG`
                : `${S.speedValue.toFixed(1)}x`;
            rngBtn.classList.toggle('rg-chip-act', rng);
            rngBtn.setAttribute('aria-pressed', String(!!rng));
            rngBtn.disabled = !S.isAutoNavEnabled;
            rngBtn.title = S.isAutoNavEnabled
                ? 'Randomise speed per video'
                : 'Enable Auto Skip to use random speed';
            presets.forEach(btn => {
                btn.disabled = rng;
                btn.classList.toggle('rg-on', Math.abs(parseFloat(btn.dataset.speed) - S.speedValue) < 0.001);
            });
        });

        card.appendChild(box);
        return card;
    }

    function automationGrid() {
        const card = u.tag('div', 'rg-card');
        const head = u.tag('div', 'rg-sec-row', '<span class="rg-sec">Automation</span>');
        const grid = u.tag('div', 'rg-grid');

        const cell = (cfg) => {
            const box = u.tag('div', 'rg-btn');
            box.setAttribute('role', 'group');
            box.setAttribute('aria-label', cfg.label);

            const main = u.tag('button', 'rg-btn-main',
                `<span style="pointer-events:none; display:flex;">${RG.svg(cfg.icon)}</span>` +
                `<span class="rg-btn-label">${cfg.label}</span>`);
            const badge = u.tag('button', 'rg-badge');
            main.type = badge.type = 'button';
            badge.setAttribute('aria-label', `${cfg.label} mode selector`);

            const canUse = () => !(cfg.dep && !S.isAutoNavEnabled);
            const pick = (e) => {
                e.stopPropagation();
                if (!canUse()) return;
                if (cfg.dropdown) {
                    ui.showDropdown(badge, cfg.opts, cfg.get(), v => { cfg.set(v); refresh(); }, T.accent, `${cfg.label} Mode`);
                } else {
                    cfg.click();
                    refresh();
                }
            };
            const toggle = (e) => {
                e.stopPropagation();
                if (!canUse()) return;
                cfg.click();
                refresh();
            };
            /* Badge = full picker. Tile body = quick on/off (the badge already
             * shows the current mode, so opening the picker from the tile too
             * made toggling impossible despite the documented behaviour). */
            u.on(badge, 'click', pick);
            u.on(main, 'click', cfg.dropdown ? toggle : pick);

            updaters.push(() => {
                const dis = !!cfg.dep && !S.isAutoNavEnabled;
                main.disabled = badge.disabled = dis;
                box.style.opacity = dis ? '0.35' : '1';
                const v = cfg.get();
                const act = cfg.isAct ? cfg.isAct(v) : !!v;
                box.classList.toggle('rg-on', !!act);
                const icon = main.firstElementChild;
                if (icon) icon.style.color = act ? cfg.color : '';
                let code;
                if (cfg.badge) code = cfg.badge(v);
                else if (cfg.opts) code = cfg.opts[v]?.code || cfg.opts[v]?.text || '';
                else code = v ? 'ON' : 'OFF';
                badge.textContent = code;
                badge.title = cfg.opts
                    ? `${cfg.label}: ${cfg.opts[v]?.text || code}`
                    : `${cfg.label}: ${code}`;
                main.setAttribute('aria-pressed', String(!!act));
                badge.setAttribute('aria-pressed', String(!!act));
            });

            box.appendChild(main);
            box.appendChild(badge);
            return box;
        };

        [
            {
                label: 'Loops', icon: ICO.loop, color: T.info, dep: true, dropdown: true, opts: RG.lm,
                isAct: v => v > 1,
                get: () => S.loopSetting,
                set: v => RG.setLoopMode(v),
                click: () => RG.setLoopMode(S.loopSetting > 1 ? 1 : (S.lastActiveLoopSetting > 1 ? S.lastActiveLoopSetting : 2))
            },
            {
                label: 'Bullet', icon: ICO.bullet, color: T.warning, dep: true, dropdown: true, opts: RG.bm,
                isAct: v => v > 0,
                get: () => S.bulletMode,
                set: v => RG.applyBulletMode(v),
                click: () => RG.applyBulletMode(S.bulletMode > 0 ? 0 : (S.lastActiveBulletMode || 1))
            },
            {
                label: 'Photos', icon: ICO.photo, color: T.purple, dep: true, dropdown: true, opts: RG.pm,
                isAct: v => v > 0,
                get: () => S.photoSkipMode,
                set: v => RG.setPhotoMode(v),
                click: () => RG.setPhotoMode(
                    S.photoSkipMode > 0
                        ? 0
                        : (S.lastActivePhotoMode > 0 ? S.lastActivePhotoMode : 1)
                )
            },
            {
                label: 'Block', icon: ICO.block, color: T.error, dep: true,
                isAct: v => !!v,
                get: () => S.blockMasterEnabled,
                click: () => {
                    S.blockMasterEnabled = !S.blockMasterEnabled;
                    RG.st.set('rg_block_master_enabled', S.blockMasterEnabled);
                    RG.updateDebugPanel();
                }
            },
            {
                label: 'Debug', icon: ICO.debug, color: T.purple, dep: false,
                isAct: v => !!v,
                get: () => S.showDebug,
                click: () => {
                    S.showDebug = !S.showDebug;
                    RG.st.set('rg_debug_enabled', S.showDebug);
                    RG.updateDebugPanel();
                    if (S.showDebug) ui.clampToViewport(RG.panel, 'rg_panel_pos');
                }
            },
            {
                label: 'Metrics', icon: ICO.metrics, color: T.success, dep: false,
                isAct: () => S.showDebug && S.isMetricsExpanded,
                get: () => S.showDebug && S.isMetricsExpanded,
                badge: v => v ? 'LIVE' : 'OPEN',
                click: () => {
                    if (S.showDebug && S.isMetricsExpanded) {
                        S.isMetricsExpanded = false;
                    } else {
                        S.showDebug = true;
                        S.isMetricsExpanded = true;
                    }
                    RG.st.set('rg_metrics_expanded', S.isMetricsExpanded);
                    RG.st.set('rg_debug_enabled', S.showDebug);
                    RG.updateDebugPanel();
                    if (S.showDebug) ui.clampToViewport(RG.panel, 'rg_panel_pos');
                }
            }
        ].forEach(c => grid.appendChild(cell(c)));

        card.appendChild(head);
        card.appendChild(grid);
        return card;
    }

    /* -- blocklist card -------------------------------------------------------- */
    function blocklistCard() {
        const card = u.tag('div', 'rg-card');
        card.innerHTML = `
            <button type="button" id="rg-blk-toggle-hdr" class="rg-tglhdr" aria-expanded="false" aria-controls="rg-blk-cnt-wrap">
                <span class="rg-hdr-l">
                    <span class="rg-sec">Blocklist &amp; Fillers</span>
                    <span id="rg-blk-cnt" class="rg-count">${S.blockedUsers.length}</span>
                </span>
                <span id="rg-blk-menu-chv" class="rg-chev" aria-hidden="true">▼</span>
            </button>
            <div id="rg-blk-cnt-wrap" style="display:${S.isBlocklistExpanded ? 'block' : 'none'}; border-top:1px solid var(--rg-line-soft);">
                <div class="rg-card-pad" style="padding-bottom:10px;">
                    <div class="rg-sec" style="margin-bottom:8px;">Block Feed Fillers</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        ${FILLER_CHIPS.map(([id, key, label]) =>
                            `<button type="button" id="${id}" class="rg-chip${S.fillers[key] ? ' rg-chip-act' : ''}" role="switch" aria-checked="${S.fillers[key]}"><span>${label}</span><span class="rg-chip-dot"></span></button>`).join('')}
                    </div>
                </div>
                <div style="padding:0 14px 7px; display:flex; gap:8px; align-items:center;">
                    <input id="rg-blk-inp" type="text" class="rg-input" placeholder="Add username…" autocomplete="off" spellcheck="false" aria-label="Username to block">
                    <button id="rg-blk-add" type="button" class="rg-pill rg-pill-primary rg-pill-sm" disabled>+ Add</button>
                </div>
                <div id="rg-blk-note" class="rg-tiny" style="display:none; padding:0 14px 7px;"></div>
                <div style="padding:0 14px 9px;">
                    <button id="rg-blk-cur" type="button" class="rg-pill rg-pill-secondary" style="width:100%;">Block Current Creator</button>
                </div>
                <div id="rg-blk-tags" class="rg-tags rg-scroll" style="padding:0 14px 12px;"></div>
            </div>
        `;

        const hdr = card.querySelector('#rg-blk-toggle-hdr');
        const body = card.querySelector('#rg-blk-cnt-wrap');
        const chv = card.querySelector('#rg-blk-menu-chv');
        const cnt = card.querySelector('#rg-blk-cnt');
        const inp = card.querySelector('#rg-blk-inp');
        const addBtn = card.querySelector('#rg-blk-add');
        const noteEl = card.querySelector('#rg-blk-note');
        const tags = card.querySelector('#rg-blk-tags');
        let noteTimer = 0;
        let tagSig = '';

        const note = (msg, isError) => {
            clearTimeout(noteTimer);
            noteEl.textContent = msg;
            noteEl.style.display = msg ? 'block' : 'none';
            noteEl.style.color = isError ? T.error : T.success;
            if (msg) noteTimer = setTimeout(() => { noteEl.style.display = 'none'; }, 2800);
        };

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

        FILLER_CHIPS.forEach(([id, key]) => {
            const chip = card.querySelector('#' + id);
            u.on(chip, 'click', (e) => {
                e.stopPropagation();
                RG.blk.toggleFiller(key);
                chip.classList.toggle('rg-chip-act', S.fillers[key]);
                chip.setAttribute('aria-checked', String(S.fillers[key]));
            });
        });

        const submit = (e) => {
            e.stopPropagation();
            e.preventDefault();
            const raw = inp.value.trim();
            if (!raw) { note('Enter a username first.', true); inp.focus(); return; }
            const n = RG.norm(raw);
            const added = RG.blk.add(raw);
            if (added) {
                note(`Blocked @${n}.`);
                inp.value = '';
                addBtn.disabled = true;
            } else {
                note(`@${n} is already blocked.`, true);
            }
            renderTags();
            requestAnimationFrame(syncHeight);
            inp.focus();
        };
        u.on(addBtn, 'click', submit);
        u.on(inp, 'input', () => { addBtn.disabled = !inp.value.trim(); });
        u.on(inp, 'keydown', (e) => { if (e.key === 'Enter') submit(e); });

        const curBtn = card.querySelector('#rg-blk-cur');
        const CUR_LABEL = 'Block Current Creator';
        u.on(curBtn, 'click', (e) => {
            e.stopPropagation();
            const name = RG.extractUser(RG.getActiveEl());
            if (!name) {
                curBtn.textContent = 'Creator not detected';
                curBtn.style.color = T.warning;
            } else if (RG.blk.has(name)) {
                curBtn.textContent = `@${name} already blocked`;
                curBtn.style.color = T.warning;
            } else {
                RG.blk.add(name);
                curBtn.textContent = `Blocked @${name}`;
                curBtn.style.color = T.success;
                renderTags();
                requestAnimationFrame(syncHeight);
            }
            setTimeout(() => {
                curBtn.textContent = CUR_LABEL;
                curBtn.style.color = '';
            }, 1800);
        });

        u.on(tags, 'click', (e) => {
            const btn = e.target.closest && e.target.closest('[data-del]');
            if (!btn) return;
            e.stopPropagation();
            RG.blk.remove(btn.getAttribute('data-del'));
            renderTags();
            requestAnimationFrame(syncHeight);
        });

        function renderTags() {
            cnt.textContent = S.blockedUsers.length;
            body.style.display = S.isBlocklistExpanded ? 'block' : 'none';
            chv.style.transform = S.isBlocklistExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
            hdr.setAttribute('aria-expanded', String(S.isBlocklistExpanded));

            const sig = S.blockedUsers.join('\u0001');
            if (sig !== tagSig) {
                tagSig = sig;
                tags.innerHTML = S.blockedUsers.length
                    ? S.blockedUsers.map(x => `
                        <span class="rg-tag">
                            <span>@${u.esc(x)}</span>
                            <button type="button" class="rg-tag-del" data-del="${u.esc(x)}" aria-label="Remove @${u.esc(x)}">✕</button>
                        </span>`).join('')
                    : '<span class="rg-tiny-i">No blocked users added.</span>';
            }
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
                <span class="rg-hdr-ver">v${u.esc(RG.version)}</span>
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
        ui.drag(hdr, menu, { ignore: '#rg-m-cls, #rg-m-rst', onEnd: () => ui.savePos('rg_menu_pos')(menu) });
        u.on(hdr.querySelector('#rg-m-cls'), 'click', (e) => {
            e.stopPropagation();
            closeMenu();
        });
        u.on(hdr.querySelector('#rg-m-rst'), 'click', (e) => {
            e.stopPropagation();
            ui.closeDropdown();
            positionMenuNearAnchor(menu, RG.getControlBtn());
        });
        return hdr;
    }

    function footer() {
        const foot = u.tag('div');
        foot.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:8px; padding:2px 4px 0;';
        foot.innerHTML = `
            <span class="rg-tiny">v${u.esc(RG.version)} · Control Center</span>
            <span id="rg-menu-foot" class="rg-tiny rg-val-mono" style="font-size:10px;">0 skips</span>
        `;
        const stat = foot.querySelector('#rg-menu-foot');
        updaters.push(() => {
            stat.textContent = `${S.stats.total} skip${S.stats.total === 1 ? '' : 's'} · ${u.fmtClock(Date.now() - S.stats.startedAt)}`;
        });
        return foot;
    }

    function refresh() {
        updaters.forEach(fn => { try { fn(); } catch (_) { } });
    }

    function create() {
        updaters = [];
        menu = u.tag('div', 'rg-panel rg-panel-anim');
        menu.id = 'rg-settings-menu';
        menu.dataset.rgRun = RG.runId;
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', 'AutoNav control center');
        u.css(menu, {
            width: `${MENU_W}px`, overflow: 'hidden', padding: '0',
            zIndex: '2147483647', display: 'none', borderRadius: '20px'
        });

        const saved = RG.st.json('rg_menu_pos', 'null');
        const okPos = v => typeof v === 'string' && /^-?\d+(\.\d+)?px$/.test(v);
        if (saved && typeof saved === 'object' && okPos(saved.top) && okPos(saved.left)) {
            menu.style.top = saved.top;
            menu.style.left = saved.left;
            menu.dataset.positioned = 'true';
        }

        scroll = u.tag('div', 'rg-scroll');
        scroll.id = 'rg-settings-scroll';
        u.css(scroll, {
            overflowY: 'auto', overflowX: 'hidden', padding: '12px',
            maxHeight: 'calc(100vh - 92px)', overscrollBehavior: 'contain'
        });

        menu.updateUI = refresh;

        scroll.appendChild(masterToggleCard());
        scroll.appendChild(speedCard());
        scroll.appendChild(automationGrid());
        scroll.appendChild(blocklistCard());
        scroll.appendChild(footer());
        menu.appendChild(header());
        menu.appendChild(scroll);
        document.body.appendChild(menu);

        if (!menuTimer && typeof setInterval === 'function') {
            menuTimer = setInterval(() => {
                if (menu && menu.classList.contains('rg-visible')) refresh();
            }, 1000);
        }

        syncHeight();
        refresh();
        return menu;
    }

    /* -- open / close --------------------------------------------------------- */
    function openMenu(anchorBtn) {
        const m = RG.getOrCreateMenu();
        const epoch = ++menuEpoch;
        ui.closeDropdown();
        const firstOpen = !m.dataset.positioned || !m.style.top || !m.style.left;
        if (firstOpen) {
            positionMenuNearAnchor(m, anchorBtn || RG.getControlBtn());
        } else {
            /* Reopening keeps the user's saved spot. Only pull it back on
             * screen if the viewport shrank; never re-run auto-placement. */
            ui.clampToViewport(m, 'rg_menu_pos');
        }
        refresh();
        m.dataset.open = 'true';
        ui.show(m, true);
        RG.setControlExpanded && RG.setControlExpanded(true);
        if (!firstOpen) {
            syncHeight();
            return;
        }
        /* First-time auto-placement only: give the panel its final height,
         * then dodge the debug panel before the position becomes persistent. */
        const settle = () => {
            /* A close/reopen before this fires belongs to the newer epoch;
             * it must not move the freshly restored saved position. */
            if (epoch !== menuEpoch || m.dataset.open !== 'true') return;
            avoidOverlapWithDebugPanel(m);
            syncHeight();
            ui.savePos('rg_menu_pos')(m);
        };
        requestAnimationFrame(() => requestAnimationFrame(settle));
        setTimeout(settle, 220);
    }

    function closeMenu() {
        if (!menu) return;
        menuEpoch++;
        menu.dataset.open = 'false';
        ui.show(menu, false);
        ui.closeDropdown();
        RG.setControlExpanded && RG.setControlExpanded(false);
    }
    RG.openMenu = openMenu;
    RG.closeMenu = closeMenu;

    RG.getOrCreateMenu = () => {
        const existing = $('rg-settings-menu');
        if (existing && existing.dataset.rgRun === RG.runId) {
            menu = existing;
            scroll = $('rg-settings-scroll') || existing.querySelector('#rg-settings-scroll');
            refresh();
            return existing;
        }
        if (existing) existing.remove();
        return create();
    };
    RG.refreshMenu = refresh;
    RG.positionMenuNearAnchor = positionMenuNearAnchor;
    RG.avoidOverlapWithDebugPanel = avoidOverlapWithDebugPanel;
    RG.refresh = refresh;
    RG.menu = { syncHeight };
})(window.RG);
