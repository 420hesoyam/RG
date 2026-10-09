/* ==========================================================================
 * RG · 10 DOM
 * Page probes: active module, media id, creator, filler classification.
 * Plus the in-page sidebar button that opens the control center.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, u = RG.u;

    /* -- active media module -------------------------------------------- */
    function getActiveEl() {
        const active = document.querySelector('.GifPreview.GifPreview_isActive, .FeedModule.GifPreview_isActive');
        if (active) return active;
        const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
            ?.closest('.GifPreview, .FeedModule, [data-feed-module-type]');
        return el || document.querySelector('.GifPreview, .FeedModule, [data-feed-module-type]');
    }

    let _actEl = null, _actDirty = true, _actTime = 0;
    const invalidate = () => { _actDirty = true; };
    u.on(window, 'scroll', invalidate, { passive: true });
    u.on(window, 'resize', invalidate, { passive: true });

    function getActiveElCached() {
        const now = Date.now();
        if (_actDirty || !_actEl || !document.contains(_actEl) || now - _actTime > 1000 || !S.currentVideoId) {
            _actEl = getActiveEl();
            _actDirty = false;
            _actTime = now;
        }
        return _actEl;
    }
    RG.getActiveEl = getActiveEl;
    RG.getActiveElCached = getActiveElCached;
    RG.invalidateActive = invalidate;

    /* -- identity -------------------------------------------------------- */
    function getMediaId(el, vTag) {
        if (!el) return null;
        const fid = el.getAttribute('data-feed-item-id') || (el.dataset && el.dataset.feedItemId);
        if (fid) return fid;
        const href = el.querySelector('a[href*="/watch/"]')?.getAttribute('href');
        const m = href && href.match(/\/watch\/([^/?#]+)/);
        if (m) return m[1];
        if (vTag) {
            if (vTag.currentSrc) return vTag.currentSrc;
            if (vTag.src) return vTag.src;
            const s = vTag.querySelector('source');
            if (s && s.src) return s.src;
        }
        if (!el.__rg_id) el.__rg_id = 'rg_media_' + Math.random().toString(36).slice(2, 9);
        return el.__rg_id;
    }

    function extractUser(el) {
        if (!el) return null;
        const name = el.querySelector('.userName')?.textContent.trim();
        if (name) return name.toLowerCase();
        const link = el.querySelector('a.userAvatar[href*="/users/"]') || el.querySelector('a[href*="/users/"]');
        const m = link?.getAttribute('href')?.match(/\/users\/([^/?#]+)/);
        return m ? m[1].toLowerCase() : null;
    }

    let _uEl = null, _uVal = null;
    function extractUserCached(el) {
        if (el === _uEl) return _uVal;
        return (_uEl = el, _uVal = extractUser(el));
    }
    RG.getMediaId = getMediaId;
    RG.extractUser = extractUser;
    RG.extractUserCached = extractUserCached;

    /* -- filler classification (blocklist) ------------------------------ */
    const FILLERS = [
        ['niches', '[Niches]', '.FeedModule[data-feed-module-type="trending-niches"]', '.nicheListWidget, a[href^="/niches"]'],
        ['creators', '[Creators]', '.FeedModule[data-feed-module-type="trending-creators"]', '.trendingCreators, a[href*="/explore/creators"]'],
        ['streams', '[Stream]', '.FeedModule[data-feed-module-type*="live-cam"]', '.StreamateCameraDispatcher, ._StreamateCamera_q9off_1'],
        ['ads', '[Ad Promo]', '.FeedModule[data-feed-module-type="only-fans"]', '.AdCreators, .OnlyFansCreatorsSidebar']
    ];

    function checkFillerBlocked(el) {
        if (!el || !S.blockMasterEnabled) return null;
        for (const [key, label, selfSel, childSel] of FILLERS) {
            if (S.fillers[key] && (el.matches(selfSel) || el.querySelector(childSel))) return label;
        }
        if (el.classList.contains('FeedModule') || el.hasAttribute('data-feed-module-type')) return '[Filler]';
        return null;
    }
    RG.checkFillerBlocked = checkFillerBlocked;

    /* -- per-module DOM cache ------------------------------------------- */
    let _dEl = null, _dV = null, _dCd = null;
    function getDomCached(el) {
        if (el !== _dEl || (_dV && !_dV.isConnected) || (_dCd && !document.contains(_dCd))) {
            _dEl = el;
            _dV = el.querySelector('video');
            _dCd = el.querySelector('.countdown');
        }
        return { v: _dV, cd: _dCd };
    }

    const _imgCache = new WeakMap();
    function isImageEl(el) {
        if (_imgCache.has(el)) return _imgCache.get(el);
        const r = el.classList.contains('GifPreview_isImage') || !!el.querySelector('.ImageGif');
        _imgCache.set(el, r);
        return r;
    }
    RG.getDomCached = getDomCached;
    RG.isImageEl = isImageEl;

    /* -- sidebar control button ----------------------------------------- */
    const GEAR = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

    let btn = null;

    function ensureUIExists(activeDiv) {
        if (!activeDiv) return;
        if (activeDiv.__rg_uiDone) {
            if (activeDiv.__rg_uiBtn && document.contains(activeDiv.__rg_uiBtn)) return;
            activeDiv.__rg_uiDone = false;
        }
        const side = activeDiv.querySelector('.sideBar');
        if (!side || side.querySelector('.autoNextSettings')) return;
        activeDiv.__rg_uiDone = true;

        const li = u.tag('li', 'sideBarItem autoNextSettings');
        btn = u.tag('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Open control center');
        btn.title = 'Control center';
        btn.style.cssText = 'background:transparent; border:none; cursor:pointer; padding:0; display:block;';
        btn.onclick = (e) => {
            e.stopPropagation();
            const m = RG.getOrCreateMenu();
            if (m.classList.contains('rg-visible')) {
                RG.ui.show(m, false);
                RG.ui.closeDropdown();
            } else {
                RG.resetDebugPosition();
                RG.positionMenuNearAnchor(m, btn);
                RG.ui.show(m, true);
                requestAnimationFrame(() => { RG.avoidOverlapWithDebugPanel(m); RG.menu && RG.menu.syncHeight(m); });
                setTimeout(() => RG.menu && RG.menu.syncHeight(m), 220);
            }
        };
        li.appendChild(btn);
        side.insertBefore(li, side.firstChild);
        activeDiv.__rg_uiBtn = li;
        RG.syncControlBtn();
    }

    function syncControlBtn() {
        if (btn && document.contains(btn)) btn.innerHTML = GEAR;
    }
    RG.ensureUIExists = ensureUIExists;
    RG.syncControlBtn = syncControlBtn;
    RG.getControlBtn = () => btn;
})(window.RG);
