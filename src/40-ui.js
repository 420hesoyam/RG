/* ==========================================================================
 * RG · 40 UI KIT
 * Shared presentational primitives: icons, stylesheet, panel show/hide,
 * drag, viewport clamping, dropdowns.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const u = RG.u, $ = RG.$;

    /* -- icons ------------------------------------------------------------ */
    const ICONS = {
        grip: `<svg width="8" height="14" viewBox="0 0 8 16" fill="currentColor" style="opacity:0.35"><circle cx="2" cy="2" r="1.4"/><circle cx="6" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="6" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="6" cy="14" r="1.4"/></svg>`,
        reset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
        loop: `<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>`,
        jump: `<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>`,
        bullet: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>`,
        photo: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>`,
        block: `<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>`,
        debug: `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`
    };
    const svg = (d, sz = 20) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const ICO = RG.ICONS = ICONS;
    RG.svg = svg;

    /* -- stylesheet ------------------------------------------------------- */
    const CSS = `
        .rg-panel { position: fixed; background: rgba(21,20,26,0.95); color: #EFEEF0; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 16px 36px rgba(0,0,0,0.65); font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; backdrop-filter: blur(20px); z-index: 2147483646; }
        .rg-panel-anim { transition: opacity 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1); opacity: 0; transform: scale(0.97) translateY(-4px); }
        .rg-panel-anim.rg-visible { opacity: 1; transform: scale(1) translateY(0); }
        .rg-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
        .rg-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; transition: background 0.2s; width: 100%; border: none; background: transparent; font-family: inherit; color: inherit; text-align: left; }
        .rg-row:hover { background: rgba(255,255,255,0.05); }
        .rg-btn { aspect-ratio: 1.1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; position: relative; transition: 0.2s; user-select: none; padding: 0; }
        .rg-btn:hover { background: rgba(255,255,255,0.08); }
        .rg-btn:active { transform: scale(0.94); }
        .rg-btn-main { position: absolute; inset: 0; border-radius: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 6px; cursor: pointer; background: transparent; border: none; font-family: inherit; color: #BAB9C0; }
        .rg-btn-main:disabled { cursor: default; }
        .rg-badge { position: absolute; top: 4px; right: 4px; font-size: 8px; font-weight: 700; background: rgba(0,0,0,0.6); padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: 0.15s; -webkit-appearance: none; appearance: none; font-family: inherit; color: inherit; line-height: 1.2; }
        .rg-badge:hover { transform: scale(1.1); background: rgba(255,255,255,0.18); }
        .rg-badge:disabled { cursor: default; }
        .rg-switch { width: 34px; height: 20px; border-radius: 10px; background: #35343d; position: relative; transition: 0.2s; box-shadow: inset 0 1px 3px rgba(0,0,0,0.4); flex: 0 0 auto; }
        .rg-switch-knob { width: 16px; height: 16px; background: #EFEEF0; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
        .rg-icobtn { -webkit-appearance: none; appearance: none; background: transparent; border: none; padding: 4px; margin: 0; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.5; border-radius: 6px; transition: opacity 0.15s; }
        .rg-icobtn:hover { opacity: 0.9; }
        .rg-tglhdr { -webkit-appearance: none; appearance: none; width: 100%; border: none; background: transparent; font-family: inherit; color: inherit; text-align: left; cursor: pointer; }
        #rg-settings-menu .rg-switch { display: inline-block; }
        .rg-panel button:focus-visible, .rg-btn button:focus-visible, .rg-dropdown-item:focus-visible { outline: 2px solid #38BDF8; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
            .rg-panel-anim, .rg-dropdown-menu, .rg-stat-flash, .rg-switch, .rg-switch-knob, .rg-badge { transition: none !important; animation: none !important; }
        }

        .rg-dropdown-menu {
            position: fixed; z-index: 2147483647; background: rgba(18, 17, 23, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; box-shadow: 0 18px 44px rgba(0, 0, 0, 0.85);
            display: flex; flex-direction: column; overflow: hidden; backdrop-filter: blur(20px);
            opacity: 0; transform: scale(0.96) translateY(-6px); transition: opacity 0.14s ease, transform 0.14s ease;
            pointer-events: none;
        }
        .rg-dropdown-menu.rg-drop-visible { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
        .rg-dropdown-hdr {
            padding: 7px 12px; font-size: 9px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase;
            color: #BAB9C0; border-bottom: 1px solid rgba(255, 255, 255, 0.07); flex: 0 0 auto;
            display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.02);
        }
        .rg-dropdown-list {
            display: flex; flex-direction: column; gap: 1px; padding: 4px; overflow-y: auto; overflow-x: hidden; flex: 1 1 auto;
        }
        .rg-dropdown-item {
            padding: 6px 9px; font-size: 11px; font-weight: 600; color: #D7D6DB; border-radius: 7px;
            cursor: pointer; display: flex; align-items: center; gap: 9px; transition: background 0.12s, color 0.12s;
        }
        .rg-dropdown-item:hover { background: rgba(255, 255, 255, 0.08); color: #FFFFFF; }
        .rg-dropdown-item:focus { outline: none; background: rgba(255, 255, 255, 0.11); color: #FFFFFF; }
        .rg-dropdown-item.rg-active { background: rgba(255, 255, 255, 0.13); color: #FFFFFF; }
        .rg-dropdown-code { font-family: monospace; font-size: 9px; font-weight: 700; min-width: 42px; text-align: center; padding: 2px 4px; border-radius: 5px; background: rgba(255, 255, 255, 0.07); }
        .rg-dropdown-item.rg-active .rg-dropdown-code { background: rgba(255, 255, 255, 0.18); }

        .rg-stat-flash { animation: rg-flash 0.35s ease; display: inline-block; }
        @keyframes rg-flash { 0% { transform: scale(1.25); filter: brightness(1.7); } 100% { transform: scale(1); filter: brightness(1); } }
        #rg-settings-menu input[type=range] { -webkit-appearance: none; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.12); outline: none; width: 100%; margin: 2px 0; }
        #rg-settings-menu input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: #EFEEF0; box-shadow: 0 0 0 3px rgba(255,46,86,0.35), 0 2px 6px rgba(0,0,0,0.6); cursor: pointer; transition: 0.15s; }
        #rg-settings-menu input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); }

        #rg-settings-menu { max-height: calc(100vh - 32px); overscroll-behavior: contain; overflow: hidden; border-radius: 12px; }
        #rg-settings-scroll { max-height: calc(100vh - 32px); overscroll-behavior: contain; overflow-y: auto; overflow-x: hidden; padding: 12px; }
        #rg-settings-scroll::-webkit-scrollbar { width: 5px; }
        #rg-settings-scroll::-webkit-scrollbar-track { background: transparent; }
        #rg-settings-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 3px; }
        #rg-settings-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }
        #rg-blk-tags::-webkit-scrollbar { width: 4px; }
        #rg-blk-tags::-webkit-scrollbar-track { background: transparent; }
        #rg-blk-tags::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 3px; }
        #rg-blk-tags::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.26); }

        .rg-chip { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; user-select: none; transition: 0.15s; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #BAB9C0; }
        .rg-chip.rg-chip-act { background: rgba(255,46,86,0.15); border-color: rgba(255,46,86,0.38); color: #EFEEF0; }
        .rg-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: #555; }
        .rg-chip.rg-chip-act .rg-chip-dot { background: #FF2E56; box-shadow: 0 0 5px #FF2E56; }
    `;

    function installStyles() {
        const s = document.createElement('style');
        s.id = 'rg-styles';
        s.dataset.rgRun = RG.runId;
        s.textContent = CSS;
        document.head.appendChild(s);
        // Drop leftovers from a previous injection only: this run's own panel,
        // menu and sidebar button are tagged and must survive the cleanup.
        document.querySelectorAll('.autoNextSettings, #rg-debug-panel, #rg-settings-menu, .rg-dropdown-menu')
            .forEach(el => { if (el.dataset.rgRun !== RG.runId) el.remove(); });
    }

    /* -- show / hide ------------------------------------------------------ */
    function show(el, visible) {
        if (!el) return;
        if (visible) {
            el.style.display = 'block';
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('rg-visible')));
        } else {
            el.classList.remove('rg-visible');
            setTimeout(() => { if (!el.classList.contains('rg-visible')) el.style.display = 'none'; }, 180);
        }
    }

    function flashUpdate(el, val) {
        if (el.textContent !== String(val)) {
            el.textContent = val;
            el.classList.remove('rg-stat-flash');
            void el.offsetWidth;
            el.classList.add('rg-stat-flash');
        }
    }

    /* -- geometry ---------------------------------------------------------- */
    function drag(handle, target, opt = {}) {
        let dragging = false, ox = 0, oy = 0, pid = null;
        handle.onpointerdown = (e) => {
            if (opt.ignore && e.target.closest(opt.ignore)) return;
            dragging = true;
            pid = e.pointerId;
            try { handle.setPointerCapture(pid); } catch (_) { }
            ox = e.clientX - target.offsetLeft;
            oy = e.clientY - target.offsetTop;
            opt.onStart && opt.onStart();
        };
        handle.onpointermove = (e) => {
            if (!dragging || e.pointerId !== pid) return;
            target.style.left = `${u.clamp(e.clientX - ox, 0, window.innerWidth - target.offsetWidth)}px`;
            target.style.top = `${u.clamp(e.clientY - oy, 0, window.innerHeight - target.offsetHeight)}px`;
        };
        const end = () => {
            if (!dragging) return;
            dragging = false;
            opt.onEnd && opt.onEnd();
        };
        handle.onpointerup = end;
        handle.onpointercancel = end;
    }

    function clampToViewport(el, key) {
        if (!el) return;
        const maxL = Math.max(0, window.innerWidth - el.offsetWidth);
        const maxT = Math.max(0, window.innerHeight - el.offsetHeight);
        const curL = u.clamp(parseFloat(el.style.left) || 0, 0, maxL);
        const curT = u.clamp(parseFloat(el.style.top) || 0, 0, maxT);
        el.style.left = `${curL}px`;
        el.style.top = `${curT}px`;
        if (key) RG.st.set(key, JSON.stringify({ top: `${curT}px`, left: `${curL}px` }));
    }

    const savePos = key => el => RG.st.set(key, JSON.stringify({ top: el.style.top, left: el.style.left }));

    /* -- dropdown ------------------------------------------------------------ */
    let activeDropdown = null;

    function closeDropdown() {
        if (!activeDropdown) return;
        const d = activeDropdown;
        activeDropdown = null;
        d.classList.remove('rg-drop-visible');
        setTimeout(() => d.remove(), 150);
    }

    const M = 8;

    function showDropdown(anchor, options, curVal, onSelect, accent = '#38BDF8', title = '') {
        closeDropdown();
        const drop = u.tag('div', 'rg-dropdown-menu');
        drop.dataset.rgRun = RG.runId;

        if (title) {
            const cur = options[curVal];
            drop.appendChild(u.tag('div', 'rg-dropdown-hdr',
                `<span>${title}</span><span style="font-family:monospace; font-size:10px; color:${accent}; font-weight:700;">${cur ? (cur.code || cur.text || '') : ''}</span>`));
        }

        const list = u.tag('div', 'rg-dropdown-list');
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', title || 'Selection');

        const items = Object.keys(options).map(key => {
            const val = parseInt(key), opt = options[key], active = val === curVal;
            const item = u.tag('div', `rg-dropdown-item${active ? ' rg-active' : ''}`,
                `<span class="rg-dropdown-code">${opt.code || ''}</span>` +
                `<span style="flex:1;">${opt.text || opt.label || ''}</span>` +
                (active ? `<span style="font-size:10px; color:${accent};">✓</span>` : ''));
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(active));
            item.tabIndex = 0;
            item.onclick = (e) => { e.stopPropagation(); onSelect(val); closeDropdown(); };
            list.appendChild(item);
            return item;
        });

        drop.appendChild(list);
        document.body.appendChild(drop);
        activeDropdown = drop;

        // geometry: prefer below, flip above, clamp + scroll
        const r = anchor.getBoundingClientRect();
        const w = Math.min(250, window.innerWidth - M * 2);
        drop.style.width = `${w}px`;
        drop.style.left = `${Math.max(M, Math.min(r.left - 40, window.innerWidth - w - M))}px`;

        const natural = drop.offsetHeight;
        const below = window.innerHeight - r.bottom - M;
        const above = r.top - M;
        let top, maxH;
        if (natural <= below) { top = r.bottom + 6; maxH = natural; }
        else if (natural <= above) { top = r.top - natural - 6; maxH = natural; }
        else if (below >= above) { top = r.bottom + 6; maxH = Math.max(110, below); }
        else { top = Math.max(M, r.top - 6 - above); maxH = Math.max(110, above); }
        drop.style.top = `${Math.max(M, top)}px`;
        drop.style.maxHeight = `${maxH}px`;

        let idx = Math.max(0, items.findIndex(i => i.classList.contains('rg-active')));
        const focus = () => {
            items[idx] && items[idx].focus({ preventScroll: true });
            if (maxH < natural) try { items[idx].scrollIntoView({ block: 'nearest', behavior: 'auto' }); } catch (_) { }
        };
        focus();

        u.on(drop, 'keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                idx = (idx + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
                focus();
            } else if (e.key === 'Enter') {
                e.preventDefault(); e.stopPropagation(); items[idx].click();
            } else if (e.key === 'Escape') {
                e.stopPropagation(); closeDropdown();
            }
        });

        requestAnimationFrame(() => drop.classList.add('rg-drop-visible'));
    }

    u.on(document, 'click', (e) => {
        if (activeDropdown && !activeDropdown.contains(e.target) && !e.target.closest('.rg-badge')) closeDropdown();
    });

    const ui = RG.ui = { installStyles, show, flashUpdate, drag, clampToViewport, savePos, showDropdown, closeDropdown, get dropdown() { return activeDropdown; } };
    RG.clampToViewport = clampToViewport;
    RG.$ = $;
})(window.RG);
