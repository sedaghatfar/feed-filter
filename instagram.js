(() => {
  const BLOCKED_CLASS = "feed-filter-instagram-reels-blocked";
  const STYLE_ID = "feed-filter-instagram-style";
  const OVERLAY_ID = "feed-filter-instagram-overlay";

  function normalizePath(pathname) {
    if (!pathname) {
      return "/";
    }
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  }

  function isBlockedRoute() {
    return normalizePath(window.location.pathname) === "/reels";
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html.${BLOCKED_CLASS} body {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(180deg, #fff8f3 0%, #f6e7db 100%);
        color: #2d201a;
        font-family: Georgia, "Times New Roman", serif;
        text-align: center;
      }

      #${OVERLAY_ID}[hidden] {
        display: none !important;
      }

      #${OVERLAY_ID} .feed-filter-instagram-card {
        max-width: 420px;
        padding: 28px;
        border: 1px solid rgba(80, 49, 30, 0.18);
        border-radius: 18px;
        background: rgba(255, 252, 248, 0.94);
        box-shadow: 0 24px 64px rgba(58, 38, 28, 0.14);
      }

      #${OVERLAY_ID} h1 {
        margin: 0 0 10px;
        font-size: 30px;
      }

      #${OVERLAY_ID} p {
        margin: 0 0 18px;
        font-size: 17px;
        line-height: 1.5;
      }

      #${OVERLAY_ID} a {
        display: inline-block;
        padding: 10px 16px;
        border-radius: 999px;
        background: #2d201a;
        color: #fff8f3;
        text-decoration: none;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML =
      '<div class="feed-filter-instagram-card">' +
        "<h1>Instagram Reels blocked</h1>" +
        "<p>The Reels feed is blocked. Direct links to individual reels are still allowed.</p>" +
        '<a href="https://www.instagram.com/">Go to Instagram Home</a>' +
      "</div>";

    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function applyRouteState() {
    injectStyle();

    if (isBlockedRoute()) {
      document.documentElement.classList.add(BLOCKED_CLASS);
      ensureOverlay();
      return;
    }

    document.documentElement.classList.remove(BLOCKED_CLASS);
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];
    if (typeof original !== "function") {
      return;
    }

    history[methodName] = function (...args) {
      const result = original.apply(this, args);
      window.setTimeout(applyRouteState, 0);
      return result;
    };
  }

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", applyRouteState);
  window.addEventListener("hashchange", applyRouteState);
  document.addEventListener("DOMContentLoaded", applyRouteState, { once: true });
  window.setInterval(applyRouteState, 500);
  applyRouteState();
})();
