// ==UserScript==
// @name         RedGifs Auto Production
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  Auto navigation for redgifs.com with creative bullet modes, time jumps, loop/speed controls and a unified blocklist + feed-filler manager.
// @author       420hesoyam
// @match        https://www.redgifs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=redgifs.com
// @grant        none
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/00-core.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/10-dom.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/20-player.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/30-skip.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/40-ui.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/50-panel.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/60-menu.js
// @require      https://raw.githubusercontent.com/420hesoyam/RG/main/src/90-boot.js
// @updateURL    https://raw.githubusercontent.com/420hesoyam/RG/main/redgifs.user.js
// @downloadURL  https://raw.githubusercontent.com/420hesoyam/RG/main/redgifs.user.js
// ==/UserScript==

/* Bootstrap only: the work lives in src/, loaded via @require above. */
RG.start();
