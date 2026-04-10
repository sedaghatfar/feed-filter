(() => {
  const PAUSE_MS = 4000;
  const STYLE_ID = "feed-filter-site-pause-style";
  const OVERLAY_ID = "feed-filter-site-pause-overlay";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html.feed-filter-site-paused {
        background: #f4f1ea !important;
      }

      html.feed-filter-site-paused body {
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
        background:
          radial-gradient(circle at top, rgba(198, 164, 120, 0.18), transparent 42%),
          linear-gradient(180deg, #f7f4ee 0%, #eee5d7 100%);
        color: #2a241d;
        font-family: Georgia, "Times New Roman", serif;
        letter-spacing: 0.02em;
        text-align: center;
      }

      #${OVERLAY_ID}[hidden] {
        display: none !important;
      }

      #${OVERLAY_ID} .feed-filter-site-pause-card {
        padding: 24px 28px;
        border: 1px solid rgba(89, 68, 46, 0.18);
        border-radius: 16px;
        background: rgba(255, 251, 245, 0.88);
        box-shadow: 0 24px 60px rgba(61, 48, 34, 0.14);
      }

      #${OVERLAY_ID} .feed-filter-site-pause-label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        text-transform: uppercase;
      }

      #${OVERLAY_ID} .feed-filter-site-pause-domain {
        display: block;
        font-size: 28px;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function buildOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML =
      '<div class="feed-filter-site-pause-card">' +
        '<span class="feed-filter-site-pause-label">Waiting 4 seconds</span>' +
        `<span class="feed-filter-site-pause-domain">${window.location.hostname}</span>` +
      "</div>";

    return overlay;
  }

  function attachOverlay() {
    const overlay = buildOverlay();
    if (document.documentElement && !overlay.isConnected) {
      document.documentElement.appendChild(overlay);
    }
    return overlay;
  }

  function releasePage() {
    document.documentElement.classList.remove("feed-filter-site-paused");

    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }

    const style = document.getElementById(STYLE_ID);
    if (style) {
      style.remove();
    }
  }

  injectStyle();
  document.documentElement.classList.add("feed-filter-site-paused");
  attachOverlay();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachOverlay, { once: true });
  }

  window.setTimeout(releasePage, PAUSE_MS);
})();
