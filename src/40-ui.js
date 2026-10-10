/* ==========================================================================
 * RG · 40 UI KIT
 * Shared presentational primitives: icons, stylesheet, panel show/hide,
 * drag, viewport clamping, dropdowns.
 *
 * Every colour, radius, size and font below is taken from redgifs.com's own
 * design system (the custom properties in its shipped stylesheets), so the
 * injected UI reads as part of the site instead of a foreign overlay.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const u = RG.u, $ = RG.$;

    /* -- icons ------------------------------------------------------------ */
    const ICONS = {
        grip: `<svg width="8" height="14" viewBox="0 0 8 16" fill="currentColor" style="opacity:0.35"><circle cx="2" cy="2" r="1.4"/><circle cx="6" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="6" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="6" cy="14" r="1.4"/></svg>`,
        reset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
        loop: `<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>`,
        bullet: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>`,
        sync: `<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>`,
        photo: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>`,
        block: `<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>`,
        debug: `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`
    };
    const svg = (d, sz = 20) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const ICO = RG.ICONS = ICONS;
    RG.svg = svg;

    /* -- semantic tones (the site palette, by role) ---------------------- */
    const TONES = RG.TONES = {
        brand: '#d70003',      // brand primary
        accent: '#ebfa63',     // brand secondary (links, checked controls)
        success: '#00d3a3',    // functional success
        error: '#ff575a',      // functional error
        warning: '#ffc815',    // functional warning
        info: '#59c2e5',       // functional information
        purple: '#8036f1',     // purple accent
        text: '#efeef0',       // neutral 100
        text_muted: '#bab9c0', // neutral 300
        text_dim: '#94939d'    // neutral 400
    };

    /* -- stylesheet ------------------------------------------------------- */
    const CSS = `
        /* tokens, scoped to our own surfaces so the site is never touched */
        .rg-panel, .rg-dropdown-menu,
        .rg-panel *, .rg-dropdown-menu * { box-sizing: border-box; }

        .rg-panel, .rg-dropdown-menu {
            --rg-font: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --rg-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            --rg-bg-0: #0f0f0f;
            --rg-bg-1: #090909;
            --rg-bg-2: #191919;
            --rg-bg-3: #302e2e;
            --rg-hover: #28272a;
            --rg-hover-2: #373333;
            --rg-line: #ffffff1a;
            --rg-line-soft: #ffffff0d;
            --rg-line-strong: #ffffff3;
            --rg-brand: #d70003;
            --rg-accent: #ebfa63;
            --rg-success: #00d3a3;
            --rg-error: #ff575a;
            --rg-warning: #ffc815;
            --rg-info: #59c2e5;
            --rg-text: #efeef0;
            --rg-text-strong: #ffffff;
            --rg-text-muted: #bab9c0;
            --rg-text-dim: #94939d;
            --rg-text-off: #efeef066;
            --rg-pop: linear-gradient(270deg, #fff0 0%, #ffffff1a 70%);
        }

        .rg-panel {
            position: fixed; z-index: 2147483646;
            background: #0f0f0f; color: #efeef0;
            border: 1px solid #ffffff1a; border-radius: 20px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.66);
            font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px; line-height: 22px;
            overflow: hidden;
        }
        .rg-panel-anim { transition: opacity 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1); opacity: 0; transform: scale(0.97) translateY(-4px); }
        .rg-panel-anim.rg-visible { opacity: 1; transform: scale(1) translateY(0); }

        /* -- header bar -- */
        .rg-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; background: #191919; border-bottom: 1px solid #ffffff1a; border-radius: 20px 20px 0 0; cursor: grab; user-select: none; flex: 0 0 auto; }
        .rg-hdr-l, .rg-hdr-r { display: flex; align-items: center; gap: 8px; }
        .rg-hdr-title { font-size: 14px; font-weight: 600; line-height: 16px; letter-spacing: 0.4px; color: #fff; }
        .rg-hdr-ver { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; font-weight: 500; letter-spacing: 0; color: #94939d; }
        .rg-dot { width: 8px; height: 8px; border-radius: 999px; background: #00d3a3; box-shadow: 0 0 8px #00d3a3; transition: background 0.2s, box-shadow 0.2s; flex: 0 0 auto; }

        /* -- typography helpers -- */
        .rg-sec { font-size: 10px; font-weight: 600; line-height: 13px; letter-spacing: 1px; text-transform: uppercase; color: #bab9c0; }
        .rg-lbl { display: block; font-size: 9px; font-weight: 600; line-height: 13px; letter-spacing: 0.6px; text-transform: uppercase; color: #94939d; margin-bottom: 1px; }
        .rg-val { font-size: 12px; font-weight: 600; line-height: 18px; color: #efeef0; }
        .rg-val-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; font-weight: 600; }
        .rg-val-right { text-align: right; }
        .rg-tiny { font-size: 11px; line-height: 16px; color: #94939d; }
        .rg-tiny-i { font-size: 11px; line-height: 16px; color: #94939d; font-style: italic; }
        .rg-mini { font-size: 8px; font-weight: 700; letter-spacing: 0.3px; }

        /* -- icon buttons -- */
        .rg-icobtn { -webkit-appearance: none; appearance: none; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; margin: 0; border: 1px solid transparent; border-radius: 999px; background: transparent; color: #bab9c0; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .rg-icobtn:hover { background: #ffffff0d; color: #fff; }
        .rg-icobtn:disabled { opacity: 0.6; cursor: progress; }
        .rg-spin { animation: rg-spin 0.9s linear infinite; }
        @keyframes rg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* -- surfaces -- */
        .rg-body { padding: 12px; }
        .rg-card { background: #191919; border: 1px solid #ffffff0d; border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
        .rg-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 14px 16px; border: none; background: transparent; font-family: inherit; color: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
        .rg-row:hover { background: #ffffff0d; }
        .rg-row-title { font-size: 13px; font-weight: 600; line-height: 18px; color: #efeef0; }
        .rg-tglhdr { -webkit-appearance: none; appearance: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 12px 16px; border: none; background: transparent; font-family: inherit; color: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
        .rg-tglhdr:hover { background: #ffffff0d; }
        .rg-chev { font-size: 9px; color: #94939d; transition: transform 0.2s; }

        /* -- toggle (site toggle, scaled to panel density) -- */
        .rg-switch { position: relative; width: 44px; height: 26px; border-radius: 999px; background: #ffffff3; flex: 0 0 auto; transition: background 0.18s; }
        .rg-switch.rg-on { background: #ebfa63; }
        .rg-switch-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 999px; background: #fff; border: 1px solid #090909; transition: transform 0.18s cubic-bezier(0.16,1,0.3,1); }
        .rg-switch.rg-on .rg-switch-knob { transform: translateX(18px); }

        /* -- automation grid tiles -- */
        .rg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 12px 12px; }
        .rg-btn { position: relative; aspect-ratio: 1.1; border-radius: 14px; background: #ffffff0d; border: 1px solid #ffffff1a; transition: background 0.18s, border-color 0.18s, opacity 0.18s; }
        .rg-btn:hover { background: #ffffff14; }
        .rg-btn.rg-on { background: #ffffff1a; border-color: #ffffff33; background: color-mix(in srgb, var(--rg-tile, #bab9c0) 14%, transparent); border-color: color-mix(in srgb, var(--rg-tile, #bab9c0) 45%, transparent); }
        .rg-btn-main { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 19px 6px 8px; border: none; border-radius: inherit; background: transparent; font-family: inherit; color: #bab9c0; cursor: pointer; transition: color 0.18s; }
        .rg-btn-main:disabled { cursor: default; }
        .rg-btn.rg-on .rg-btn-main { color: var(--rg-tile, #bab9c0); }
        .rg-btn-label { font-size: 9px; font-weight: 600; line-height: 11px; letter-spacing: 0.4px; text-transform: uppercase; color: #bab9c0; pointer-events: none; }
        .rg-btn.rg-on .rg-btn-label { color: var(--rg-text, #efeef0); }
        .rg-badge { position: absolute; top: 4px; right: 4px; -webkit-appearance: none; appearance: none; padding: 2px 5px; border-radius: 999px; border: 1px solid #ffffff1a; background: #090909; color: #bab9c0; font-family: inherit; font-size: 8px; font-weight: 700; line-height: 12px; cursor: pointer; transition: transform 0.15s, background 0.15s, color 0.15s, border-color 0.15s; }
        .rg-badge:hover { transform: scale(1.08); background: #ffffff1a; color: #fff; }
        .rg-badge:disabled { cursor: default; }
        .rg-btn.rg-on .rg-badge { background: var(--rg-tile, #bab9c0); border-color: transparent; color: #090909; }

        /* -- pills, chips, buttons -- */
        .rg-chip { display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 12px; border-radius: 999px; background: #302e2e; border: 1px solid transparent; color: #efeef0; font-family: inherit; font-size: 11px; font-weight: 500; line-height: 16px; cursor: pointer; user-select: none; transition: background 0.15s, color 0.15s; }
        .rg-chip:hover { background: #373333; }
        .rg-chip.rg-chip-act { background: #ebfa63; border-color: #ebfa63; color: #090909; font-weight: 600; }
        .rg-chip-dot { width: 6px; height: 6px; border-radius: 999px; background: #63616c; flex: 0 0 auto; }
        .rg-chip-act .rg-chip-dot { background: #090909; box-shadow: none; }
        .rg-pill { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 16px; border-radius: 999px; border: 1px solid transparent; font-family: inherit; font-size: 12px; font-weight: 600; line-height: 18px; white-space: nowrap; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; }
        .rg-pill-primary { background: #ebfa63; color: #090909; }
        .rg-pill-primary:hover { background: #daf02b; }
        .rg-pill-secondary { background: #302e2e; border-color: #ffffff1a; color: #efeef0; }
        .rg-pill-secondary:hover { background: #373333; }
        .rg-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 7px; border-radius: 999px; background: #c71b1b1a; border: 1px solid #ff575a40; color: #ff575a; font-size: 9px; font-weight: 700; line-height: 13px; }

        /* -- inputs -- */
        .rg-input { -webkit-appearance: none; appearance: none; flex: 1 1 0%; min-width: 0; height: 32px; padding: 0 12px; border-radius: 999px; background: #090909; border: 1px solid #ffffff1a; color: #fff; font-family: inherit; font-size: 12px; line-height: 18px; outline: none; transition: border-color 0.15s; }
        .rg-input::placeholder { color: #63616c; }
        .rg-input:focus { border-color: #fff; }
        .rg-range { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; margin: 4px 0; border-radius: 999px; background: #ffffff1a; outline: none; }
        .rg-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 999px; background: #fff; border: 1px solid #090909; box-shadow: 0 0 0 3px #ebfa6340, 0 2px 6px rgba(0,0,0,0.6); cursor: pointer; transition: box-shadow 0.15s; }
        .rg-range::-webkit-slider-thumb:hover { box-shadow: 0 0 0 5px #ebfa6359, 0 2px 6px rgba(0,0,0,0.6); }
        .rg-range:disabled { opacity: 0.35; }

        /* -- tags -- */
        .rg-tags { display: flex; flex-wrap: wrap; gap: 6px; max-height: 150px; overflow-y: auto; overscroll-behavior: contain; }
        .rg-tag { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 4px 0 10px; border-radius: 999px; background: #ffffff0d; border: 1px solid #ffffff1a; color: #efeef0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; }
        .rg-tag-del { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; border: none; border-radius: 999px; background: transparent; color: #94939d; font-size: 9px; line-height: 1; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .rg-tag-del:hover { background: #ffffff1a; color: #fff; }

        /* -- stats -- */
        .rg-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rg-stat { background: #191919; border: 1px solid #ffffff0d; border-radius: 10px; padding: 8px 10px; min-width: 0; }
        .rg-stat-k { font-size: 9px; font-weight: 600; line-height: 13px; letter-spacing: 0.6px; text-transform: uppercase; color: #94939d; }
        .rg-stat-v { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; font-weight: 700; line-height: 18px; color: #fff; }
        .rg-list { display: flex; flex-direction: column; gap: 4px; max-height: 100px; overflow-y: auto; }
        .rg-list-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; line-height: 16px; padding: 3px 0; border-bottom: 1px solid #ffffff0d; }
        .rg-list-k { color: #bab9c0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rg-list-v { padding: 1px 6px; border-radius: 6px; background: #ffffff0d; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; color: #efeef0; flex: 0 0 auto; }

        .rg-stat-flash { animation: rg-flash 0.35s ease; display: inline-block; }
        @keyframes rg-flash { 0% { transform: scale(1.25); filter: brightness(1.7); } 100% { transform: scale(1); filter: brightness(1); } }

        /* -- dropdown -- */
        .rg-dropdown-menu {
            position: fixed; z-index: 2147483647;
            display: flex; flex-direction: column; overflow: hidden;
            background: #090909; color: #efeef0;
            border: 1px solid #ffffff1a; border-radius: 20px;
            box-shadow: 0 18px 44px rgba(0,0,0,0.72);
            font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px; line-height: 18px;
            opacity: 0; transform: scale(0.96) translateY(-6px);
            transition: opacity 0.14s ease, transform 0.14s ease;
            pointer-events: none;
        }
        .rg-dropdown-menu.rg-drop-visible { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
        .rg-dropdown-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #ffffff1a; background: #191919; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #bab9c0; flex: 0 0 auto; }
        .rg-dropdown-hdr-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0; text-transform: none; }
        .rg-dropdown-list { display: flex; flex-direction: column; gap: 2px; padding: 8px; overflow-y: auto; overflow-x: hidden; flex: 1 1 auto; }
        .rg-dropdown-item { display: flex; align-items: center; gap: 12px; min-height: 38px; padding: 8px 12px; border-radius: 12px; color: #bab9c0; font-size: 13px; font-weight: 400; line-height: 18px; cursor: pointer; transition: background 0.12s, color 0.12s; }
        .rg-dropdown-item:hover { background: #ffffff0d; color: #fff; }
        .rg-dropdown-item:focus { outline: none; background: #ffffff0d; color: #fff; }
        .rg-dropdown-item.rg-active { background: linear-gradient(270deg, #fff0 0%, #ffffff1a 70%); color: #fff; font-weight: 500; }
        .rg-dropdown-code { min-width: 44px; padding: 2px 6px; border-radius: 6px; background: #ffffff0d; color: #94939d; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; font-weight: 700; text-align: center; }
        .rg-dropdown-item.rg-active .rg-dropdown-code { background: #ffffff1a; color: #fff; }
        .rg-dropdown-check { font-size: 11px; margin-left: auto; }

        /* -- scrollbars -- */
        .rg-scroll { overscroll-behavior: contain; }
        .rg-scroll::-webkit-scrollbar { width: 6px; }
        .rg-scroll::-webkit-scrollbar-track { background: transparent; }
        .rg-scroll::-webkit-scrollbar-thumb { background: #ffffff1a; border-radius: 999px; }
        .rg-scroll::-webkit-scrollbar-thumb:hover { background: #ffffff33; }

        .rg-panel :focus-visible, .rg-dropdown-item:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .rg-dropdown-item:focus-visible { outline-offset: -2px; }

        /* the sidebar gear lives in the site's own chrome, so it only borrows the palette */
        .autoNextSettings button { color: #efeef0; transition: background 0.15s; border-radius: 12px; }
        .autoNextSettings button:hover { background: #28272a; }

        @media (prefers-reduced-motion: reduce) {
            .rg-panel-anim, .rg-dropdown-menu, .rg-stat-flash, .rg-switch, .rg-switch-knob, .rg-badge, .rg-btn, .rg-spin, .rg-chip, .rg-pill { transition: none !important; animation: none !important; }
        }
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

    function showDropdown(anchor, options, curVal, onSelect, accent = TONES.accent, title = '') {
        closeDropdown();
        const drop = u.tag('div', 'rg-dropdown-menu');
        drop.dataset.rgRun = RG.runId;

        if (title) {
            const cur = options[curVal];
            drop.appendChild(u.tag('div', 'rg-dropdown-hdr',
                `<span>${title}</span><span class="rg-dropdown-hdr-code" style="color:${accent};">${cur ? (cur.code || cur.text || '') : ''}</span>`));
        }

        const list = u.tag('div', 'rg-dropdown-list rg-scroll');
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', title || 'Selection');

        const items = Object.keys(options).map(key => {
            const val = parseInt(key), opt = options[key], active = val === curVal;
            const item = u.tag('div', `rg-dropdown-item${active ? ' rg-active' : ''}`,
                `<span class="rg-dropdown-code">${opt.code || ''}</span>` +
                `<span style="flex:1;">${opt.text || opt.label || ''}</span>` +
                (active ? `<span class="rg-dropdown-check" style="color:${accent};">✓</span>` : ''));
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

    const ui = RG.ui = { installStyles, show, flashUpdate, drag, clampToViewport, savePos, showDropdown, closeDropdown, tones: TONES, get dropdown() { return activeDropdown; } };
    RG.clampToViewport = clampToViewport;
    RG.$ = $;
})(window.RG);