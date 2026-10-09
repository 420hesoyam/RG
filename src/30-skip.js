/* ==========================================================================
 * RG · 30 SKIP
 * Statistics bookkeeping + the actual navigation action.
 * ========================================================================== */
(function (RG) {
    'use strict';
    const S = RG.S, cfg = RG.cfg;

    function countStat(statType, blockedUser) {
        S.stats.total++;
        if (statType === 'blocked') {
            S.stats.blocked++;
            if (blockedUser) S.stats.blockedBreakdown[blockedUser] = (S.stats.blockedBreakdown[blockedUser] || 0) + 1;
        } else if (statType === 'bullet') S.stats.bullet++;
        else S.stats.standard++;
    }

    const NEXT_SEL = '.nextButton, button[aria-label="Next video"]';
    const NEXT_SEL_WIDE = '.fullScreenNavContainer .nextButton, .navButtons .nextButton, .navNext, .Navigation-Next, button[aria-label="Next video"]';
    const PRESS = ['pointerdown', 'mousedown', 'click', 'pointerup', 'mouseup'];

    function performSkip(activeDiv, idToLock, statType, blockedUser = null) {
        const now = Date.now();
        if (S.lastSkipActionTime > 0 && now - S.lastSkipActionTime < cfg.minSkipInterval) return;

        if (S.lastSkippedId !== idToLock) countStat(statType, blockedUser);

        const btn = activeDiv?.querySelector(NEXT_SEL) || document.querySelector(NEXT_SEL_WIDE);
        if (btn) {
            PRESS.forEach(type => btn.dispatchEvent(new MouseEvent(type, {
                view: window, bubbles: true, cancelable: true, buttons: 1
            })));
        } else {
            window.focus();
            document.dispatchEvent(new KeyboardEvent('keydown', {
                bubbles: true, cancelable: true, keyCode: 40, key: 'ArrowDown', code: 'ArrowDown'
            }));
            setTimeout(() => {
                if (S.currentVideoId === idToLock) window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
            }, 150);
        }

        S.lastSkippedId = idToLock;
        S.lastSkipActionTime = now;
        S.globalCooldownEnd = now + (statType === 'blocked' ? cfg.blockedCooldown : cfg.skipCooldown);
        S.runtimeSpeedTarget = S.baseSpeed;
        RG.invalidateActive();
    }

    RG.performSkip = performSkip;
})(window.RG);
