/* ==========================================================================
 * RG · 40 UI KIT
 * Shared presentational primitives: icons, the redgifs design tokens,
 * stylesheet, panel show/hide, dragging, viewport clamping, dropdowns.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const u = RG.u, $ = RG.$;

    /* -- icons ------------------------------------------------------------ */
    /* Keep every entry a complete <svg> so a value can be interpolated
     * directly. `svg()` below also accepts a bare path definition for ad-hoc
     * icons, but wrapping mixed values was how copy/sync once turned into
     * invisible zero-size <rect> elements. */
    const ico = (body, size = 20) =>
        `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    const ICONS = {
        grip: `<svg width="8" height="14" viewBox="0 0 8 16" fill="currentColor" style="opacity:0.35"><circle cx="2" cy="2" r="1.4"/><circle cx="6" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="6" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="6" cy="14" r="1.4"/></svg>`,
        reset: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
        loop: ico('<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>'),
        bullet: ico('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>'),
        sync: ico('<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>'),
        photo: ico('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>'),
        block: ico('<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>'),
        debug: ico('<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>'),
        metrics: ico('<path d="M3 3v18h18"></path><path d="M7 15l4-5 3 3 5-7"></path>'),
        copy: ico('<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'),
        check: ico('<polyline points="20 6 9 17 4 12"></polyline>'),
        pause: ico('<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'),
        play: ico('<polygon points="5 3 19 12 5 21 5 3"></polygon>')
    };
    const svg = (d, sz = 20) => {
        const s = String(d == null ? '' : d).trim();
        return /^<svg[\s>]/i.test(s) ? s : ico(s, sz);
    };
    const ICO = RG.ICONS = ICONS;
    RG.svg = svg;

    /* -- semantic tones (redgifs' own palette, by role) -------------------- */
    const TONES = RG.TONES = {
        brand: '#d70003',      // brand primary
        accent: '#ebfa63',     // brand secondary (primary actions / selected)
        accentHover: '#daf02b',
        success: '#00d3a3',
        error: '#ff575a',
        warning: '#ffc815',
        info: '#59c2e5',
        purple: '#8036f1',
        text: '#efeef0',
        muted: '#bab9c0',
        dim: '#94939d',
        faint: '#63616c',
        bg0: '#0f0f0f',
        bg1: '#090909',
        bg2: '#191919',
        bg3: '#302e2e',
        hover: '#28272a'
    };

    /* -- stylesheet -------------------------------------------------------
     * Tokens are scoped to our two surfaces, so the page itself is never
     * touched. Values mirror redgifs.com's shipped design system: DM Sans,
     * #0f0f0f/#191919 surfaces, white-alpha borders, 12–20px radii and
     * #ebfa63 as the selected/primary accent.
     * -------------------------------------------------------------------- */
    const CSS = `
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
            --rg-line-strong: #ffffff33;
            --rg-brand: #d70003;
            --rg-accent: #ebfa63;
            --rg-accent-hover: #daf02b;
            --rg-success: #00d3a3;
            --rg-error: #ff575a;
            --rg-warning: #ffc815;
            --rg-info: #59c2e5;
            --rg-text: #efeef0;
            --rg-text-strong: #ffffff;
            --rg-text-muted: #bab9c0;
            --rg-text-dim: #94939d;
            --rg-text-faint: #63616c;
            --rg-text-off: #efeef066;
        }

        .rg-panel {
            position: fixed; z-index: 2147483646;
            background: var(--rg-bg-0); color: var(--rg-text);
            border: 1px solid var(--rg-line); border-radius: 20px;
            box-shadow: 0 24px 64px rgba(0,0,0,0.72), 0 2px 8px rgba(0,0,0,0.35);
            font-family: var(--rg-font); font-size: 13px; line-height: 18px;
            overflow: hidden;
        }
        .rg-panel-anim { transition: opacity 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1); opacity: 0; transform: scale(0.97) translateY(-4px); }
        .rg-panel-anim.rg-visible { opacity: 1; transform: scale(1) translateY(0); }

        /* -- header -- */
        .rg-hdr { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 12px; background: var(--rg-bg-2); border-bottom: 1px solid var(--rg-line); cursor: grab; user-select: none; touch-action: none; flex: 0 0 auto; }
        .rg-hdr:active { cursor: grabbing; }
        .rg-hdr-l, .rg-hdr-r { display: flex; align-items: center; gap: 5px; min-width: 0; }
        .rg-hdr .rg-icobtn { width: 26px; height: 26px; }
        .rg-hdr-title { font-size: 13px; font-weight: 600; line-height: 16px; letter-spacing: 0.7px; color: var(--rg-text-strong); white-space: nowrap; }
        .rg-hdr-ver { font-family: var(--rg-mono); font-size: 10px; font-weight: 500; letter-spacing: 0; color: var(--rg-text-dim); white-space: nowrap; }
        .rg-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--rg-success); box-shadow: 0 0 8px var(--rg-success); transition: background 0.2s, box-shadow 0.2s; flex: 0 0 auto; }

        /* -- typography helpers -- */
        .rg-sec { font-size: 10px; font-weight: 600; line-height: 13px; letter-spacing: 1px; text-transform: uppercase; color: var(--rg-text-muted); }
        .rg-lbl { display: block; font-size: 9px; font-weight: 600; line-height: 12px; letter-spacing: 0.7px; text-transform: uppercase; color: var(--rg-text-dim); margin-bottom: 2px; }
        .rg-val { font-size: 12px; font-weight: 600; line-height: 18px; color: var(--rg-text); }
        .rg-val-mono { font-family: var(--rg-mono); font-size: 11px; font-weight: 600; }
        .rg-val-right { text-align: right; }
        .rg-tiny { font-size: 11px; line-height: 16px; color: var(--rg-text-dim); }
        .rg-tiny-i { font-size: 11px; line-height: 16px; color: var(--rg-text-dim); font-style: italic; }
        .rg-mini { font-size: 8px; font-weight: 700; letter-spacing: 0.3px; }
        .rg-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* -- icon buttons -- */
        .rg-icobtn { -webkit-appearance: none; appearance: none; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; margin: 0; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--rg-text-muted); cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; flex: 0 0 auto; font-family: inherit; font-size: 12px; }
        .rg-icobtn:hover { background: var(--rg-line-soft); color: var(--rg-text-strong); }
        .rg-icobtn:disabled { opacity: 0.55; cursor: progress; }
        .rg-icobtn.rg-ok { color: var(--rg-success); }
        .rg-spin { animation: rg-spin 0.9s linear infinite; }
        @keyframes rg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* -- surfaces -- */
        .rg-body { padding: 12px; }
        .rg-scroll { overscroll-behavior: contain; }
        .rg-card { background: var(--rg-bg-2); border: 1px solid var(--rg-line-soft); border-radius: 16px; margin-bottom: 10px; overflow: hidden; }
        .rg-card:last-child { margin-bottom: 0; }
        .rg-card-pad { padding: 12px 14px; }
        .rg-sec-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px 8px; }
        .rg-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 13px 14px; border: none; background: transparent; font-family: inherit; color: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
        .rg-row:hover { background: var(--rg-line-soft); }
        .rg-row-title { font-size: 13px; font-weight: 600; line-height: 18px; color: var(--rg-text); }
        .rg-row-sub { display: block; margin-top: 2px; font-size: 11px; font-weight: 400; line-height: 15px; color: var(--rg-text-dim); }
        .rg-tglhdr { -webkit-appearance: none; appearance: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 11px 14px; border: none; background: transparent; font-family: inherit; color: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
        .rg-tglhdr:hover { background: var(--rg-line-soft); }
        .rg-chev { font-size: 9px; line-height: 1; color: var(--rg-text-dim); transition: transform 0.2s; flex: 0 0 auto; }

        /* -- toggle -- */
        .rg-switch { position: relative; width: 42px; height: 24px; border-radius: 999px; background: var(--rg-line-strong); flex: 0 0 auto; transition: background 0.18s; }
        .rg-switch.rg-on { background: var(--rg-accent); }
        .rg-switch-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 999px; background: #fff; border: 1px solid var(--rg-bg-1); transition: transform 0.18s cubic-bezier(0.16,1,0.3,1); }
        .rg-switch.rg-on .rg-switch-knob { transform: translateX(18px); }

        /* -- automation grid -- */
        .rg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 12px 12px; }
        .rg-btn { position: relative; aspect-ratio: 1.12; min-width: 0; border-radius: 14px; background: var(--rg-line-soft); border: 1px solid var(--rg-line); transition: background 0.18s, border-color 0.18s, opacity 0.18s; }
        .rg-btn:hover { background: var(--rg-line); }
        .rg-btn.rg-on { background: rgba(235,250,99,0.10); border-color: rgba(235,250,99,0.40); }
        .rg-btn-main { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 18px 5px 7px; border: none; border-radius: inherit; background: transparent; font-family: inherit; color: var(--rg-text-muted); cursor: pointer; transition: color 0.18s; }
        .rg-btn-main:disabled { cursor: default; }
        .rg-btn.rg-on .rg-btn-main { color: var(--rg-accent); }
        .rg-btn-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 600; line-height: 11px; letter-spacing: 0.4px; text-transform: uppercase; color: var(--rg-text-muted); pointer-events: none; }
        .rg-btn.rg-on .rg-btn-label { color: var(--rg-text); }
        .rg-badge { position: absolute; top: 4px; right: 4px; -webkit-appearance: none; appearance: none; max-width: calc(100% - 8px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 6px; border-radius: 999px; border: 1px solid var(--rg-line); background: var(--rg-bg-1); color: var(--rg-text-muted); font-family: var(--rg-mono); font-size: 8px; font-weight: 700; line-height: 12px; cursor: pointer; transition: transform 0.15s, background 0.15s, color 0.15s, border-color 0.15s; }
        .rg-badge:hover { transform: scale(1.06); background: var(--rg-line); color: var(--rg-text-strong); }
        .rg-badge:disabled { cursor: default; }
        .rg-btn.rg-on .rg-badge { background: var(--rg-accent); border-color: transparent; color: var(--rg-bg-1); }

        /* -- chips, pills, counters -- */
        .rg-chip { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; padding: 4px 10px; border-radius: 999px; background: var(--rg-bg-3); border: 1px solid transparent; color: var(--rg-text); font-family: inherit; font-size: 11px; font-weight: 500; line-height: 15px; cursor: pointer; user-select: none; transition: background 0.15s, color 0.15s, border-color 0.15s; text-align: left; }
        .rg-chip:hover { background: var(--rg-hover-2); }
        .rg-chip.rg-chip-act { background: var(--rg-accent); border-color: var(--rg-accent); color: var(--rg-bg-1); font-weight: 600; }
        .rg-chip-dot { width: 6px; height: 6px; border-radius: 999px; background: var(--rg-text-faint, #63616c); flex: 0 0 auto; }
        .rg-chip.rg-chip-act .rg-chip-dot { background: var(--rg-bg-1); box-shadow: none; }
        .rg-pill { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 16px; border-radius: 999px; border: 1px solid transparent; font-family: inherit; font-size: 12px; font-weight: 600; line-height: 18px; white-space: nowrap; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s; }
        .rg-pill-primary { background: var(--rg-accent); color: var(--rg-bg-1); }
        .rg-pill-primary:hover { background: var(--rg-accent-hover); }
        .rg-pill-secondary { background: var(--rg-bg-3); border-color: var(--rg-line); color: var(--rg-text); }
        .rg-pill-secondary:hover { background: var(--rg-hover-2); }
        .rg-pill:disabled { opacity: 0.45; cursor: default; }
        .rg-pill-sm { height: 28px; padding: 0 12px; font-size: 11px; }
        .rg-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 7px; border-radius: 999px; background: rgba(255,87,90,0.12); border: 1px solid rgba(255,87,90,0.28); color: var(--rg-error); font-family: var(--rg-mono); font-size: 9px; font-weight: 700; line-height: 13px; }

        /* -- inputs -- */
        .rg-input { -webkit-appearance: none; appearance: none; flex: 1 1 0%; min-width: 0; width: 100%; height: 32px; padding: 0 12px; border-radius: 999px; background: var(--rg-bg-1); border: 1px solid var(--rg-line); color: var(--rg-text-strong); font-family: inherit; font-size: 12px; line-height: 18px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .rg-input::placeholder { color: var(--rg-text-faint, #63616c); }
        .rg-input:focus { border-color: var(--rg-text-strong); box-shadow: 0 0 0 2px rgba(255,255,255,0.12); }
        .rg-range { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; margin: 5px 0; border-radius: 999px; background: linear-gradient(to right, var(--rg-accent) 0%, var(--rg-accent) var(--rg-fill, 20%), var(--rg-line) var(--rg-fill, 20%), var(--rg-line) 100%); outline: none; cursor: pointer; }
        .rg-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 999px; background: #fff; border: 1px solid var(--rg-bg-1); box-shadow: 0 0 0 3px rgba(235,250,99,0.28), 0 2px 6px rgba(0,0,0,0.55); cursor: pointer; transition: box-shadow 0.15s; }
        .rg-range::-webkit-slider-thumb:hover { box-shadow: 0 0 0 5px rgba(235,250,99,0.35), 0 2px 6px rgba(0,0,0,0.55); }
        .rg-range:disabled { opacity: 0.32; cursor: default; }
        .rg-presets { display: flex; gap: 5px; }
        .rg-preset { -webkit-appearance: none; appearance: none; flex: 1 1 0; height: 24px; padding: 0 6px; border-radius: 999px; border: 1px solid var(--rg-line); background: transparent; color: var(--rg-text-dim); font-family: var(--rg-mono); font-size: 9px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .rg-preset:hover { background: var(--rg-line-soft); color: var(--rg-text); }
        .rg-preset.rg-on { background: rgba(235,250,99,0.12); border-color: rgba(235,250,99,0.4); color: var(--rg-accent); }

        /* -- tags -- */
        .rg-tags { display: flex; flex-wrap: wrap; gap: 6px; max-height: 150px; overflow-y: auto; }
        .rg-tag { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 4px 0 10px; border-radius: 999px; background: var(--rg-line-soft); border: 1px solid var(--rg-line); color: var(--rg-text); font-family: var(--rg-mono); font-size: 10px; }
        .rg-tag-del { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; border: none; border-radius: 999px; background: transparent; color: var(--rg-text-dim); font-size: 9px; line-height: 1; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .rg-tag-del:hover { background: var(--rg-line); color: var(--rg-text-strong); }

        /* -- stats / metrics -- */
        .rg-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rg-stat { background: var(--rg-bg-1); border: 1px solid var(--rg-line-soft); border-radius: 10px; padding: 7px 9px; min-width: 0; }
        .rg-stat-k { font-size: 9px; font-weight: 600; line-height: 12px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--rg-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rg-stat-v { font-family: var(--rg-mono); font-size: 12px; font-weight: 700; line-height: 17px; color: var(--rg-text-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rg-list { display: flex; flex-direction: column; gap: 4px; max-height: 110px; overflow-y: auto; }
        .rg-list-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; line-height: 16px; padding: 3px 0; border-bottom: 1px solid var(--rg-line-soft); }
        .rg-list-k { color: var(--rg-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rg-list-v { padding: 1px 6px; border-radius: 6px; background: var(--rg-line-soft); font-family: var(--rg-mono); font-size: 10px; color: var(--rg-text); flex: 0 0 auto; }

        .rg-stat-flash { animation: rg-flash 0.35s ease; display: inline-block; }
        @keyframes rg-flash { 0% { transform: scale(1.25); filter: brightness(1.7); } 100% { transform: scale(1); filter: brightness(1); } }

        /* -- dropdown -- */
        .rg-dropdown-menu {
            position: fixed; z-index: 2147483647;
            display: flex; flex-direction: column; overflow: hidden;
            background: var(--rg-bg-1); color: var(--rg-text);
            border: 1px solid var(--rg-line); border-radius: 20px;
            box-shadow: 0 18px 44px rgba(0,0,0,0.72);
            font-family: var(--rg-font); font-size: 13px; line-height: 18px;
            opacity: 0; transform: scale(0.96) translateY(-6px);
            transition: opacity 0.14s ease, transform 0.14s ease;
            pointer-events: none;
        }
        .rg-dropdown-menu.rg-drop-visible { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
        .rg-dropdown-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--rg-line); background: var(--rg-bg-2); font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--rg-text-muted); flex: 0 0 auto; }
        .rg-dropdown-hdr-code { font-family: var(--rg-mono); font-size: 11px; font-weight: 700; letter-spacing: 0; text-transform: none; }
        .rg-dropdown-list { display: flex; flex-direction: column; gap: 2px; padding: 8px; overflow-y: auto; overflow-x: hidden; flex: 1 1 auto; }
        .rg-dropdown-item { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 7px 10px; border-radius: 12px; color: var(--rg-text-muted); font-size: 12px; font-weight: 400; line-height: 17px; cursor: pointer; transition: background 0.12s, color 0.12s; outline: none; }
        .rg-dropdown-item:hover { background: var(--rg-line-soft); color: var(--rg-text-strong); }
        .rg-dropdown-item:focus { background: var(--rg-line-soft); color: var(--rg-text-strong); }
        .rg-dropdown-item.rg-active { background: linear-gradient(270deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 70%); color: var(--rg-text-strong); font-weight: 500; }
        .rg-dropdown-code { min-width: 42px; padding: 2px 6px; border-radius: 6px; background: var(--rg-line-soft); color: var(--rg-text-dim); font-family: var(--rg-mono); font-size: 9px; font-weight: 700; text-align: center; flex: 0 0 auto; }
        .rg-dropdown-item.rg-active .rg-dropdown-code { background: var(--rg-line); color: var(--rg-text-strong); }
        .rg-dropdown-check { font-size: 11px; margin-left: auto; flex: 0 0 auto; }

        /* -- scrollbars -- */
        .rg-scroll::-webkit-scrollbar { width: 6px; }
        .rg-scroll::-webkit-scrollbar-track { background: transparent; }
        .rg-scroll::-webkit-scrollbar-thumb { background: var(--rg-line); border-radius: 999px; }
        .rg-scroll::-webkit-scrollbar-thumb:hover { background: var(--rg-line-strong); }

        /* -- focus -- */
        .rg-panel :focus-visible, .rg-dropdown-menu :focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .rg-dropdown-item:focus-visible { outline-offset: -2px; }

        /* -- the sidebar gear keeps the site's own chrome -- */
        .autoNextSettings .rg-gear-btn { -webkit-appearance: none; appearance: none; background: transparent; border: 0; border-radius: 12px; padding: 4px; display: flex; align-items: center; justify-content: center; color: #efeef0; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .autoNextSettings .rg-gear-btn:hover { background: #28272a; color: #ebfa63; }

        @media (max-width: 380px) {
            .rg-panel { max-width: calc(100vw - 16px); }
            .rg-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (prefers-reduced-motion: reduce) {
            .rg-panel-anim, .rg-dropdown-menu, .rg-stat-flash, .rg-switch, .rg-switch-knob, .rg-badge, .rg-btn, .rg-spin, .rg-chip, .rg-pill, .rg-preset, .rg-chev { transition: none !important; animation: none !important; }
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
        document.querySelectorAll('#rg-styles, .autoNextSettings, #rg-debug-panel, #rg-settings-menu, .rg-dropdown-menu')
            .forEach(el => { if (el.dataset.rgRun !== RG.runId) el.remove(); });
    }

    /* -- show / hide ------------------------------------------------------
     * Both surfaces animate opacity. Rapid gear clicks used to schedule a
     * delayed `rg-visible` after a hide, leaving an invisible element with
     * display:block (and the next hide could not dismiss it). Keep one
     * cancellable state per element instead.
     * -------------------------------------------------------------------- */
    const showState = new WeakMap();
    function show(el, visible) {
        if (!el) return;
        let st = showState.get(el);
        if (!st) {
            st = { raf: 0, hide: 0, want: false };
            showState.set(el, st);
        }
        st.want = !!visible;
        if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
        clearTimeout(st.hide);
        st.hide = 0;

        if (visible) {
            el.style.display = 'block';
            st.raf = requestAnimationFrame(() => {
                st.raf = 0;
                if (!st.want) return;
                st.raf = requestAnimationFrame(() => {
                    st.raf = 0;
                    if (st.want) el.classList.add('rg-visible');
                });
            });
        } else {
            el.classList.remove('rg-visible');
            st.hide = setTimeout(() => {
                st.hide = 0;
                if (!st.want && !el.classList.contains('rg-visible')) el.style.display = 'none';
            }, 180);
        }
    }

    function flashUpdate(el, val) {
        if (!el) return;
        if (el.textContent !== String(val)) {
            el.textContent = val;
            el.classList.remove('rg-stat-flash');
            void el.offsetWidth;
            el.classList.add('rg-stat-flash');
        }
    }

    /* -- geometry ---------------------------------------------------------- */
    function drag(handle, target, opt = {}) {
        if (!handle || !target) return;
        let dragging = false, ox = 0, oy = 0, pid = null;
        handle.onpointerdown = (e) => {
            if (e.button != null && e.button !== 0) return;
            if (opt.ignore && e.target.closest && e.target.closest(opt.ignore)) return;
            const r = target.getBoundingClientRect();
            if (!target.style.left || !target.style.top) {
                target.style.left = `${r.left}px`;
                target.style.top = `${r.top}px`;
            }
            dragging = true;
            pid = e.pointerId;
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            try { handle.setPointerCapture(pid); } catch (_) { }
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
            pid = null;
            opt.onEnd && opt.onEnd();
        };
        handle.onpointerup = end;
        handle.onpointercancel = end;
        handle.onlostpointercapture = end;
    }

    function clampToViewport(el, key) {
        if (!el) return;
        const w = el.offsetWidth || parseFloat(el.style.width) || 0;
        const h = el.offsetHeight || 0;
        const maxL = Math.max(0, window.innerWidth - w);
        const maxT = Math.max(0, window.innerHeight - h);
        const oldL = parseFloat(el.style.left);
        const oldT = parseFloat(el.style.top);
        const curL = u.clamp(isFinite(oldL) ? oldL : 0, 0, maxL);
        const curT = u.clamp(isFinite(oldT) ? oldT : 0, 0, maxT);
        el.style.left = `${curL}px`;
        el.style.top = `${curT}px`;
        if (key && (curL !== oldL || curT !== oldT)) {
            RG.st.set(key, JSON.stringify({ top: `${curT}px`, left: `${curL}px` }));
        }
    }

    const savePos = key => el => {
        if (!el) return;
        RG.st.set(key, JSON.stringify({ top: el.style.top, left: el.style.left }));
    };

    /* -- dropdown ---------------------------------------------------------- */
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
        drop.setAttribute('role', 'listbox');
        drop.setAttribute('aria-label', title || 'Selection');

        if (title) {
            const cur = options[curVal];
            const hdr = u.tag('div', 'rg-dropdown-hdr',
                `<span>${u.esc(title)}</span>` +
                `<span class="rg-dropdown-hdr-code" style="color:${accent};">${u.esc(cur ? (cur.code || cur.text || '') : '')}</span>`);
            drop.appendChild(hdr);
        }

        const list = u.tag('div', 'rg-dropdown-list rg-scroll');
        const items = Object.keys(options).map(key => {
            const val = parseInt(key, 10), opt = options[key], active = val === curVal;
            const item = u.tag('div', `rg-dropdown-item${active ? ' rg-active' : ''}`,
                `<span class="rg-dropdown-code">${u.esc(opt.code || '')}</span>` +
                `<span style="flex:1; min-width:0;">${u.esc(opt.text || opt.label || '')}</span>` +
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
        const w = Math.max(190, Math.min(260, window.innerWidth - M * 2));
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
            } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                e.stopPropagation();
                idx = e.key === 'Home' ? 0 : items.length - 1;
                focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); e.stopPropagation(); items[idx] && items[idx].click();
            } else if (e.key === 'Escape') {
                e.stopPropagation(); closeDropdown();
            }
        });

        requestAnimationFrame(() => drop.classList.add('rg-drop-visible'));
    }

    u.on(document, 'click', (e) => {
        if (activeDropdown && !activeDropdown.contains(e.target) &&
            !(e.target.closest && e.target.closest('.rg-badge'))) closeDropdown();
    });

    /* Dropdowns are position:fixed; a page/list scroll would detach them. */
    u.on(document, 'scroll', (e) => {
        if (!activeDropdown) return;
        if (activeDropdown.contains(e.target)) return;
        closeDropdown();
    }, { passive: true, capture: true });
    u.on(window, 'resize', () => closeDropdown(), { passive: true });

    const ui = RG.ui = {
        installStyles, show, flashUpdate, drag, clampToViewport, savePos,
        showDropdown, closeDropdown, tones: TONES,
        get dropdown() { return activeDropdown; }
    };
    RG.clampToViewport = clampToViewport;
    RG.$ = $;
})(window.RG);
