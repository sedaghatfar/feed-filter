(() => {
  const HIDDEN_MARKER = "feedFilterYoutubeHidden";
  const BLOCKED_CLASS = "feed-filter-youtube-shorts-blocked";
  const STYLE_ID = "feed-filter-youtube-style";
  const OVERLAY_ID = "feed-filter-youtube-overlay";
  const SCAN_INTERVAL_MS = 1000;

  const CONTAINER_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-rich-shelf-renderer",
    "ytd-rich-section-renderer",
    "ytd-item-section-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-reel-item-renderer",
    "ytd-guide-entry-renderer",
    "ytd-mini-guide-entry-renderer",
    "yt-tab-shape",
    "tp-yt-paper-tab",
    "ytd-search-refinement-card-renderer"
  ];

  function normalizePath(pathname) {
    if (!pathname) {
      return "/";
    }
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  }

  function isBlockedShortsPage() {
    return normalizePath(window.location.pathname).startsWith("/shorts/");
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
        background:
          radial-gradient(circle at top, rgba(205, 42, 42, 0.16), transparent 40%),
          linear-gradient(180deg, #fff6f3 0%, #f7e1d8 100%);
        color: #2d1b18;
        font-family: Georgia, "Times New Roman", serif;
        text-align: center;
      }

      #${OVERLAY_ID}[hidden] {
        display: none !important;
      }

      #${OVERLAY_ID} .feed-filter-youtube-card {
        max-width: 440px;
        padding: 28px;
        border: 1px solid rgba(111, 46, 33, 0.18);
        border-radius: 18px;
        background: rgba(255, 251, 248, 0.96);
        box-shadow: 0 24px 64px rgba(84, 41, 31, 0.16);
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
        background: #2d1b18;
        color: #fff6f3;
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
      '<div class="feed-filter-youtube-card">' +
        "<h1>YouTube Shorts blocked</h1>" +
        "<p>Shorts pages and Shorts shelves are hidden on YouTube.</p>" +
        '<a href="https://www.youtube.com/">Go to YouTube Home</a>' +
      "</div>";

    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function hideElement(element) {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (element.dataset[HIDDEN_MARKER] === "1") {
      return;
    }
    element.dataset[HIDDEN_MARKER] = "1";
    element.style.setProperty("display", "none", "important");
  }

  function findHideTarget(node) {
    if (!(node instanceof HTMLElement)) {
      return null;
    }

    return node.closest(CONTAINER_SELECTORS.join(",")) || node;
  }

  function hrefLooksLikeShorts(value) {
    return typeof value === "string" && /\/shorts\/[^/?#]+/i.test(value);
  }

  function textLooksLikeShorts(value) {
    return typeof value === "string" && /\bshorts\b/i.test(value);
  }

  function hideNodeIfShortsTarget(node) {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const text = [
      node.textContent,
      node.getAttribute("title"),
      node.getAttribute("aria-label")
    ]
      .filter(Boolean)
      .join(" ");

    if (node.matches("ytd-reel-shelf-renderer")) {
      hideElement(node);
      return;
    }

    if (node.matches("a")) {
      const href = node.getAttribute("href") || node.href || "";
      if (hrefLooksLikeShorts(href) || textLooksLikeShorts(text)) {
        hideElement(findHideTarget(node));
      }
      return;
    }

    if (
      node.matches(
        [
          "ytd-guide-entry-renderer",
          "ytd-mini-guide-entry-renderer",
          "yt-tab-shape",
          "tp-yt-paper-tab",
          "ytd-search-refinement-card-renderer"
        ].join(",")
      ) &&
      textLooksLikeShorts(text)
    ) {
      hideElement(node);
    }
  }

  function hideStaticShortsContainers(root = document) {
    hideNodeIfShortsTarget(root);
    root.querySelectorAll("ytd-reel-shelf-renderer").forEach(hideElement);
    root.querySelectorAll('a[href^="/shorts/"], a[href*="youtube.com/shorts/"]').forEach((link) => {
      const target = findHideTarget(link);
      if (target) {
        hideElement(target);
      }
    });

    root
      .querySelectorAll(
        [
          "ytd-guide-entry-renderer",
          "ytd-mini-guide-entry-renderer",
          "yt-tab-shape",
          "tp-yt-paper-tab",
          "ytd-search-refinement-card-renderer"
        ].join(",")
      )
      .forEach((node) => {
        const text = [
          node.textContent,
          node.getAttribute("title"),
          node.getAttribute("aria-label")
        ]
          .filter(Boolean)
          .join(" ");

        if (textLooksLikeShorts(text)) {
          hideElement(node);
        }
      });
  }

  function hideShortsFromAnchors(root = document) {
    hideNodeIfShortsTarget(root);
    root.querySelectorAll("a").forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      const href = link.getAttribute("href") || link.href || "";
      const text = [
        link.textContent,
        link.getAttribute("title"),
        link.getAttribute("aria-label")
      ]
        .filter(Boolean)
        .join(" ");

      if (!hrefLooksLikeShorts(href) && !textLooksLikeShorts(text)) {
        return;
      }

      const target = findHideTarget(link);
      if (target) {
        hideElement(target);
      }
    });
  }

  function applyShortsPageState() {
    injectStyle();

    if (isBlockedShortsPage()) {
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

  function scan(root = document) {
    if (!(root instanceof Document || root instanceof Element)) {
      return;
    }

    hideStaticShortsContainers(root);
    hideShortsFromAnchors(root);
    applyShortsPageState();
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];
    if (typeof original !== "function") {
      return;
    }

    history[methodName] = function (...args) {
      const result = original.apply(this, args);
      window.setTimeout(() => scan(document), 0);
      return result;
    };
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          scan(node);
        }
      }
    }
  });

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", () => scan(document));
  window.addEventListener("hashchange", () => scan(document));
  document.addEventListener("DOMContentLoaded", () => scan(document), { once: true });
  window.setInterval(() => scan(document), SCAN_INTERVAL_MS);

  scan(document);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
