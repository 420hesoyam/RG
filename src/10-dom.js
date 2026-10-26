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
    /* The feed scrolls in an inner .App container on redgifs, so a plain
     * window listener misses most scrolls. Capture catches both. */
    u.on(window, 'scroll', invalidate, { passive: true });
    u.on(document, 'scroll', invalidate, { passive: true, capture: true });
    u.on(window, 'resize', invalidate, { passive: true });
    u.on(window, 'wheel', invalidate, { passive: true });
    u.on(document, 'touchmove', invalidate, { passive: true });

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

    /* React can hand us the module shell before the creator name lands in it.
     * Caching that first null forever made "block by creator" miss the video
     * (same class of bug as the pre-hydration <video> latch). Re-probe null
     * results, and refresh a positive result occasionally in case the module
     * node was reused for the next item. */
    const USER_CACHE_MS = 1000;
    let _uEl = null, _uVal = null, _uAt = 0;
    function extractUserCached(el) {
        const now = Date.now();
        if (el === _uEl && now - _uAt < USER_CACHE_MS) return _uVal;
        _uEl = el;
        _uVal = extractUser(el);
        _uAt = now;
        return _uVal;
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

        /* Unknown feed modules are only fillers when at least one filler type
         * is enabled, and never when the node is actually a media item. The
         * old unconditional fallback could mistake a hydrated video module
         * for filler and skip it over and over. */
        const anyFiller = FILLERS.some(([key]) => S.fillers[key]);
        if (!anyFiller) return null;
        const isModule = el.classList.contains('FeedModule') || el.hasAttribute('data-feed-module-type');
        if (!isModule || el.matches('.GifPreview')) return null;
        if (el.querySelector('a[href*="/watch/"], .countdown, .userInfo, .GifPreview-InfoAndSidebar')) return null;
        return '[Filler]';
    }
    RG.checkFillerBlocked = checkFillerBlocked;

    /* -- per-module DOM cache ------------------------------------------- */
    /* A module is rendered by React in place: the first tick after a page load
     * (or a skip) can see an empty shell that has no <video>/.countdown yet,
     * they land a tick or two later. A cache that only invalidates on element
     * change latched that missing video forever, so the first video of a
     * session was never driven. Re-probe on a short timer and whenever the
     * video is absent: the cost is two querySelectors every 250ms. */
    let _dEl = null, _dV = null, _dCd = null, _dTime = 0;
    const DOM_REPROBE_MS = 250;

    function getDomCached(el) {
        if (!el) return { v: null, cd: null };
        const now = Date.now();
        if (el !== _dEl || !_dV || !_dV.isConnected ||
            (_dCd && !document.contains(_dCd)) || now - _dTime > DOM_REPROBE_MS) {
            _dEl = el;
            _dV = el.querySelector('video');
            _dCd = el.querySelector('.countdown');
            _dTime = now;
        }
        return { v: _dV, cd: _dCd };
    }

    /* Same rule as above: never memoize a "not an image yet" answer. The cache
     * key includes the node's class/child signature so a recycled module that
     * switches from video to photo is probed again. */
    const _imgCache = new WeakMap();
    function isImageEl(el) {
        if (!el) return false;
        if (el.classList.contains('GifPreview_isImage')) return true;
        if (el.childElementCount === 0) return false;
        const sig = `${el.className || ''}|${el.childElementCount}`;
        const cached = _imgCache.get(el);
        if (cached && cached.sig === sig) {
            /* A recycled module can swap its media without changing the shell
             * signature; never let a cached answer hide the new media type. */
            if (cached.value) return !el.querySelector('video');
            if (el.querySelector('video')) return false;
        }
        const value = !!el.querySelector('.ImageGif');
        /* Decide only once the node has hydrated into something recognisable. */
        if (value || el.querySelector('video') || el.classList.contains('GifPreview_isVideo')) {
            _imgCache.set(el, { sig, value });
            return value;
        }
        return false;
    }
    RG.getDomCached = getDomCached;
    RG.isImageEl = isImageEl;

    /* -- sidebar control button ----------------------------------------- */
    const GEAR = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

    let btn = null;

    function ensureUIExists(activeDiv) {
        if (!activeDiv) return;
        if (activeDiv.__rg_uiDone) {
            const existing = activeDiv.__rg_uiBtn;
            if (existing && document.contains(existing)) {
                /* Feed modules keep their own sidebar button; keep the shared
                 * reference on the active one so the menu anchors here, not
                 * on whatever module happened to be active last. */
                const own = existing.querySelector('button');
                if (own) {
                    btn = own;
                    syncControlBtn();
                    return;
                }
                existing.remove();
            }
            activeDiv.__rg_uiDone = false;
        }
        const side = activeDiv.querySelector('.sideBar');
        if (!side || side.querySelector('.autoNextSettings')) return;
        activeDiv.__rg_uiDone = true;

        const li = u.tag('li', 'sideBarItem autoNextSettings');
        li.dataset.rgRun = RG.runId;
        btn = u.tag('button', 'rg-gear-btn');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Open control center');
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');
        btn.title = 'Control center';
        btn.onclick = (e) => {
            e.stopPropagation();
            const m = RG.getOrCreateMenu();
            const open = m.dataset.open === 'true' || m.classList.contains('rg-visible');
            if (open) RG.closeMenu();
            else RG.openMenu(e.currentTarget || btn);
        };
        li.appendChild(btn);
        side.insertBefore(li, side.firstChild);
        activeDiv.__rg_uiBtn = li;
        RG.syncControlBtn();
    }

    let _btnOpen = false;
    function syncControlBtn() {
        if (btn && document.contains(btn)) {
            if (!btn.querySelector('svg')) btn.innerHTML = GEAR;
            btn.setAttribute('aria-expanded', String(_btnOpen));
        }
    }
    function setControlExpanded(on) {
        _btnOpen = !!on;
        document.querySelectorAll('.autoNextSettings .rg-gear-btn').forEach(b => {
            b.setAttribute('aria-expanded', String(_btnOpen));
        });
        syncControlBtn();
    }
    RG.ensureUIExists = ensureUIExists;
    RG.syncControlBtn = syncControlBtn;
    RG.setControlExpanded = setControlExpanded;
    RG.getControlBtn = () => (btn && document.contains(btn))
        ? btn
        : document.querySelector('.autoNextSettings button');
})(window.RG);
