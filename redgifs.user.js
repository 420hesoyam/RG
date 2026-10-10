// ==UserScript==
// @name         RedGifs Auto Production
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  Auto navigation for redgifs.com with creative bullet modes, time jumps, loop/speed controls and a unified blocklist + feed-filler manager.
// @author       420hesoyam
// @license      MIT
// @homepageURL  https://github.com/420hesoyam/RG
// @supportURL   https://github.com/420hesoyam/RG/issues
// @match        https://www.redgifs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=redgifs.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/420hesoyam/RG/main/redgifs.user.js
// @downloadURL  https://raw.githubusercontent.com/420hesoyam/RG/main/redgifs.user.js
// ==/UserScript==

/* ==========================================================================
 * RG · ENTRY + LOADER
 * The only code Tampermonkey hands us directly; everything else lives in src/
 * and is listed in MODULES below (the numeric prefixes are the load order).
 *
 * The modules are fetched at runtime instead of being @require'd on purpose:
 * Tampermonkey caches @require'd files until it installs a new script version,
 * so a pushed fix can sit in the cache and a reload keeps running the old
 * code. Fetching here means the newest main is what runs, and the AUTONAV
 * panel's sync button can pull a fresh copy and reload the page.
 *
 * Auto-update contract:
 *   - @updateURL / @downloadURL are polled by the extension on its own
 *     schedule; no metadata key can shorten it. This script does not need
 *     them to get new code - only to keep Tampermonkey's own copy current.
 *   - Tampermonkey installs a remote script only when @version is higher than
 *     the installed one, so keep the two version strings below in sync.
 *     tools/regression.test.mjs fails when they drift.
 * ========================================================================== */
(function () {
    'use strict';

    const VERSION = '0.3.0';             // keep in sync with @version
    const REPO = 'https://raw.githubusercontent.com/420hesoyam/RG/main/';
    const BASE = REPO + 'src/';
    const MODULES = [
        '00-core.js',
        '10-dom.js',
        '20-player.js',
        '30-skip.js',
        '40-ui.js',
        '50-panel.js',
        '60-menu.js',
        '90-boot.js'
    ];
    const CACHE_KEY = 'rg_mod_cache';

    const RG = window.RG = window.RG || {};
    RG.version = VERSION;
    RG.modules = MODULES;

    /* -- last-known-good copy, so an offline start still works ------------ */
    const cache = {
        read() {
            try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch (_) { return null; }
        },
        write(files) {
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version: VERSION, at: Date.now(), files })); }
            catch (_) { /* quota or private mode: the network path still works */ }
        }
    };

    /* -- fetch + evaluate -------------------------------------------------- */
    const fetchSource = (name, bust) => fetch(BASE + name + (bust ? '?t=' + Date.now() : ''), {
        cache: bust ? 'no-store' : 'default'
    }).then(r => {
        if (!r.ok) throw new Error(name + ' HTTP ' + r.status);
        return r.text();
    });

    function fetchModules(bust) {
        return Promise.all(MODULES.map(n => fetchSource(n, bust).then(code => [n, code]).catch(() => null)))
            .then(parts => {
                const files = {};
                parts.forEach(p => { if (p) files[p[0]] = p[1]; });
                return files;
            });
    }

    function evaluate(files) {
        MODULES.forEach(name => {
            const code = files[name];
            if (!code) throw new Error('missing module ' + name);
            (0, eval)(code);            // indirect eval: global scope, like @require
        });
    }

    /* -- last-resort notice (no UI modules exist if we failed) ------------ */
    function banner(msg) {
        const el = document.createElement('div');
        el.textContent = 'RG: ' + msg;
        el.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647;' +
            'background:#0f0f0f;color:#efeef0;border:1px solid rgba(255,255,255,.1);border-radius:20px;' +
            'padding:12px 20px;font:600 14px/22px "DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
            'box-shadow:0 16px 40px rgba(0,0,0,.66)';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 8000);
    }

    /* -- boot: network first, cached copy as the fallback ------------------ */
    function boot() {
        return fetchModules(false).then(files => {
            if (Object.keys(files).length === MODULES.length) {
                cache.write(files);
                evaluate(files);
            } else {
                const saved = cache.read();
                if (!saved || !saved.files) throw new Error('modules unreachable and nothing cached');
                evaluate(saved.files);
                banner('offline, running the cached copy');
            }
            RG.start();
        }).catch(e => banner('could not start: ' + e.message));
    }

    /* -- sync button: bust the cache, store, reload ----------------------- */
    RG.syncAndReload = () => fetchModules(true).then(files => {
        if (Object.keys(files).length !== MODULES.length) throw new Error('some modules could not be fetched');
        cache.write(files);
        location.reload();
    });

    RG.fetchRemoteVersion = () => fetch(REPO + 'redgifs.user.js', { cache: 'no-store' })
        .then(r => r.text())
        .then(t => (t.match(/@version\s+(\S+)/) || [])[1] || null)
        .catch(() => null);

    boot();
})();