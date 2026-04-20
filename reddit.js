(() => {
  const hostname = window.location.hostname;
  const SITE = (() => {
    if (hostname === "reddit.com" || hostname.endsWith(".reddit.com")) {
      return {
        key: "reddit",
        label: "Reddit",
        focusColor: "#0079d3",
        imageUiPattern: /(?:image|media|gallery|preview|thumbnail|poster|expando)/,
        excludedUiPattern: /(?:avatar|community icon|user icon|award|emoji|sprite|icon)/,
        findPostContainer(node) {
          if (!node) {
            return null;
          }

          return (
            node.closest(".thing") ||
            node.closest("shreddit-post") ||
            node.closest("article") ||
            node.closest('div[data-testid="post-container"]') ||
            node.closest('div[data-click-id="body"]') ||
            null
          );
        },
        isTargetImage(img) {
          return looksLikeImageUi(img);
        }
      };
    }

    if (hostname === "x.com" || hostname.endsWith(".x.com")) {
      return {
        key: "x",
        label: "X",
        focusColor: "#1d9bf0",
        imageUiPattern: /(?:image|media|gallery|preview|thumbnail|poster|photo|tweetphoto)/,
        excludedUiPattern: /(?:avatar|profile[-_ ]image|emoji|icon|badge|verified)/,
        findPostContainer(node) {
          if (!node) {
            return null;
          }

          return node.closest('article[data-testid="tweet"]') || node.closest("article") || null;
        },
        isTargetImage(img) {
          if (
            img.closest(
              '[data-testid="tweetPhoto"], [data-testid="tweetPhotoCarousel"], [data-testid="card.wrapper"], [data-testid="card.layoutLarge.media"], [data-testid="videoPlayer"]'
            )
          ) {
            return true;
          }

          const alt = (img.getAttribute("alt") || "").trim().toLowerCase();
          if (alt === "image" || alt === "embedded image" || alt === "video") {
            return true;
          }

          // X changes media wrapper markup frequently. If a large image survives the
          // avatar/icon filters and is inside a tweet/article, treat it as post media.
          return true;
        },
        isTargetVideo(video) {
          if (
            video.closest(
              '[data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="card.wrapper"], [aria-label*="Video"], [aria-label*="video"]'
            )
          ) {
            return true;
          }

          return true;
        }
      };
    }

    return null;
  })();

  if (!SITE) {
    return;
  }

  const PLACEHOLDER_SRC =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
        '<rect width="800" height="600" fill="#eef1f3"/>' +
        '<rect x="24" y="24" width="752" height="552" rx="24" ry="24" fill="#d7dfe4" stroke="#b3c0c8" stroke-width="8" stroke-dasharray="20 18"/>' +
        '<text x="400" y="285" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#31424d">Image hidden</text>' +
        '<text x="400" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#52646f">Click to load</text>' +
      "</svg>"
    );
  const REDDIT_BLOCKED_FLAIR_PATTERN = /\b(?:fan[\s-]?art|cosplay)\b/i;
  const IMAGE_MARKER = "feedFilterDeferredImage";
  const IMAGE_ATTR = "data-feed-filter-deferred-image";
  const VIDEO_MARKER = "feedFilterDeferredVideo";
  const VIDEO_ATTR = "data-feed-filter-deferred-video";
  const VIDEO_OVERLAY_ATTR = "data-feed-filter-video-overlay";
  const HIDDEN_POST_ATTR = "data-feed-filter-hidden-post";
  const STYLE_ID = `feed-filter-${SITE.key}-image-style`;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      img[${IMAGE_ATTR}="1"] {
        background: linear-gradient(135deg, #eef1f3, #d7dfe4);
        border: 1px dashed #9aa9b3;
        border-radius: 12px;
        cursor: pointer;
        display: block;
        min-height: var(--feed-filter-placeholder-height, 120px);
        width: 100%;
      }

      img[${IMAGE_ATTR}="1"]:hover {
        filter: brightness(0.97);
      }

      img[${IMAGE_ATTR}="1"]:focus {
        outline: 2px solid ${SITE.focusColor};
        outline-offset: 2px;
      }

      video[${VIDEO_ATTR}="1"] {
        border-radius: 12px;
      }

      [${VIDEO_OVERLAY_ATTR}="1"] {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed #9aa9b3;
        border-radius: 12px;
        background: linear-gradient(135deg, #eef1f3, #d7dfe4);
        color: #31424d;
        cursor: pointer;
        font-family: Arial, sans-serif;
        text-align: center;
      }

      [${VIDEO_OVERLAY_ATTR}="1"]:hover {
        filter: brightness(0.97);
      }

      [${VIDEO_OVERLAY_ATTR}="1"]:focus {
        outline: 2px solid ${SITE.focusColor};
        outline-offset: 2px;
      }

      [${VIDEO_OVERLAY_ATTR}="1"] .feed-filter-video-overlay-copy {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 20px;
      }

      [${VIDEO_OVERLAY_ATTR}="1"] .feed-filter-video-overlay-title {
        font-size: 32px;
        font-weight: 700;
      }

      [${VIDEO_OVERLAY_ATTR}="1"] .feed-filter-video-overlay-subtitle {
        font-size: 24px;
        color: #52646f;
      }

      [${HIDDEN_POST_ATTR}="1"] {
        display: none !important;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function getNodeText(node) {
    if (!(node instanceof HTMLElement)) {
      return "";
    }

    return [
      node.tagName,
      node.id,
      node.className,
      node.getAttribute("slot"),
      node.getAttribute("data-testid"),
      node.getAttribute("data-click-id"),
      node.getAttribute("aria-label")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function looksLikeImageUi(node) {
    let current = node;

    while (current && current !== document.body) {
      const text = getNodeText(current);
      if (SITE.imageUiPattern.test(text)) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  function looksLikeExcludedUi(node) {
    let current = node;

    while (current && current !== document.body) {
      const text = getNodeText(current);
      if (SITE.excludedUiPattern.test(text)) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  function getRedditPostContainer(node) {
    if (SITE.key !== "reddit" || !(node instanceof Element)) {
      return null;
    }

    return SITE.findPostContainer(node);
  }

  function getRedditFlairCandidates(post) {
    if (!(post instanceof HTMLElement)) {
      return [];
    }

    return Array.from(
      post.querySelectorAll(
        [
          '[data-testid*="flair"]',
          '[id*="flair"]',
          '[class*="flair"]',
          '[slot*="flair"]',
          '[aria-label*="flair" i]',
          'a[href*="flair_name="]',
          'a[href*="/search?q=flair_name%3A"]'
        ].join(", ")
      )
    );
  }

  function getRedditFlairText(post) {
    if (!(post instanceof HTMLElement)) {
      return "";
    }

    const values = new Set();

    [
      post.getAttribute("post-flair"),
      post.getAttribute("data-post-flair"),
      post.getAttribute("flair-text"),
      post.getAttribute("data-flair-text"),
      post.getAttribute("aria-label")
    ]
      .filter(Boolean)
      .forEach((value) => values.add(String(value).toLowerCase()));

    getRedditFlairCandidates(post).forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      [
        node.textContent,
        node.getAttribute("aria-label"),
        node.getAttribute("data-testid"),
        node.getAttribute("id"),
        node.getAttribute("slot"),
        node.className
      ]
        .filter(Boolean)
        .forEach((value) => values.add(String(value).toLowerCase()));
    });

    return Array.from(values).join(" ");
  }

  function shouldHideRedditPost(post) {
    if (!(post instanceof HTMLElement) || SITE.key !== "reddit") {
      return false;
    }

    if (post.dataset.feedFilterHiddenFlair === "1") {
      return post.dataset.feedFilterHiddenFlair === "1";
    }

    const flairText = getRedditFlairText(post);
    const shouldHide = REDDIT_BLOCKED_FLAIR_PATTERN.test(flairText);

    if (shouldHide) {
      post.dataset.feedFilterHiddenFlair = "1";
    }

    return shouldHide;
  }

  function hideRedditPost(post) {
    if (!(post instanceof HTMLElement) || shouldHideRedditPost(post) === false) {
      return;
    }

    post.setAttribute(HIDDEN_POST_ATTR, "1");
    post.setAttribute("aria-hidden", "true");
  }

  function scanRedditPostFilters(root = document) {
    if (SITE.key !== "reddit" || !(root instanceof Element || root instanceof Document)) {
      return;
    }

    const posts = new Set();

    const ownPost = getRedditPostContainer(root);
    if (ownPost) {
      posts.add(ownPost);
    }

    root
      .querySelectorAll(".thing, shreddit-post, article, [data-testid='post-container'], [data-click-id='body']")
      .forEach((post) => {
        const container = getRedditPostContainer(post);
        if (container) {
          posts.add(container);
        }
      });

    posts.forEach((post) => {
      hideRedditPost(post);
    });
  }

  function shouldSkipImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return true;
    }

    if (img.dataset[IMAGE_MARKER] === "1" || img.dataset.feedFilterImageLoaded === "1") {
      return true;
    }

    if (!SITE.findPostContainer(img)) {
      return true;
    }

    if (img.closest("header, nav, [role='banner'], [role='navigation']")) {
      return true;
    }

    const metadata = [
      img.alt,
      img.getAttribute("aria-label"),
      img.className,
      img.id,
      img.currentSrc,
      img.src
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/(?:avatar|community icon|user icon|award|emoji|sprite|icon|profile image)/.test(metadata)) {
      return true;
    }

    if (looksLikeExcludedUi(img)) {
      return true;
    }

    const renderedWidth = img.clientWidth || Number(img.getAttribute("width")) || 0;
    const renderedHeight = img.clientHeight || Number(img.getAttribute("height")) || 0;
    const largestSide = Math.max(renderedWidth, renderedHeight);

    if (largestSide > 0 && largestSide <= 64) {
      return true;
    }

    return !SITE.isTargetImage(img);
  }

  function shouldSkipVideo(video) {
    if (!(video instanceof HTMLVideoElement)) {
      return true;
    }

    if (typeof SITE.isTargetVideo !== "function") {
      return true;
    }

    if (video.dataset[VIDEO_MARKER] === "1" || video.dataset.feedFilterVideoLoaded === "1") {
      return true;
    }

    if (!SITE.findPostContainer(video)) {
      return true;
    }

    if (video.closest("header, nav, [role='banner'], [role='navigation']")) {
      return true;
    }

    const metadata = [
      video.getAttribute("aria-label"),
      video.className,
      video.id,
      video.currentSrc,
      video.src,
      video.poster
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/(?:avatar|profile image|emoji|icon|badge|verified)/.test(metadata)) {
      return true;
    }

    if (looksLikeExcludedUi(video)) {
      return true;
    }

    const renderedWidth = video.clientWidth || Number(video.getAttribute("width")) || 0;
    const renderedHeight = video.clientHeight || Number(video.getAttribute("height")) || 0;
    const largestSide = Math.max(renderedWidth, renderedHeight);

    if (largestSide > 0 && largestSide <= 64) {
      return true;
    }

    return !SITE.isTargetVideo(video);
  }

  function stashPictureSources(img) {
    const picture = img.closest("picture");
    if (!picture) {
      return;
    }

    picture.querySelectorAll("source").forEach((source) => {
      if (!(source instanceof HTMLSourceElement)) {
        return;
      }
      if (!source.dataset.feedFilterSourceSrcset) {
        source.dataset.feedFilterSourceSrcset = source.getAttribute("srcset") || "";
      }
      if (!source.dataset.feedFilterSourceSizes) {
        source.dataset.feedFilterSourceSizes = source.getAttribute("sizes") || "";
      }
      source.setAttribute("srcset", "");
      source.removeAttribute("sizes");
    });
  }

  function restorePictureSources(img) {
    const picture = img.closest("picture");
    if (!picture) {
      return;
    }

    picture.querySelectorAll("source").forEach((source) => {
      if (!(source instanceof HTMLSourceElement)) {
        return;
      }

      if (source.dataset.feedFilterSourceSrcset) {
        source.setAttribute("srcset", source.dataset.feedFilterSourceSrcset);
      } else {
        source.removeAttribute("srcset");
      }

      if (source.dataset.feedFilterSourceSizes) {
        source.setAttribute("sizes", source.dataset.feedFilterSourceSizes);
      } else {
        source.removeAttribute("sizes");
      }
    });
  }

  function deferImage(img) {
    if (shouldSkipImage(img)) {
      return;
    }

    img.dataset[IMAGE_MARKER] = "1";
    img.dataset.feedFilterOriginalSrc = img.getAttribute("src") || "";
    img.dataset.feedFilterOriginalSrcset = img.getAttribute("srcset") || "";
    img.dataset.feedFilterOriginalSizes = img.getAttribute("sizes") || "";
    img.dataset.feedFilterOriginalAlt = img.getAttribute("alt") || "";

    const renderedHeight = img.clientHeight || Number(img.getAttribute("height")) || 0;
    if (renderedHeight > 0) {
      img.style.setProperty("--feed-filter-placeholder-height", `${renderedHeight}px`);
    } else {
      img.style.setProperty("--feed-filter-placeholder-height", "120px");
    }

    stashPictureSources(img);

    img.setAttribute("srcset", "");
    img.removeAttribute("sizes");
    img.setAttribute("src", PLACEHOLDER_SRC);
    img.setAttribute("alt", `Hidden ${SITE.label} image. Click to load.`);
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `Hidden ${SITE.label} image. Click to load.`);
  }

  function cleanupLoadedImage(img) {
    img.dataset.feedFilterImageLoaded = "1";
    delete img.dataset[IMAGE_MARKER];
    img.style.removeProperty("--feed-filter-placeholder-height");
    img.removeAttribute("role");
    img.removeAttribute("tabindex");
    img.removeAttribute("aria-label");
  }

  function loadDeferredImage(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset[IMAGE_MARKER] !== "1") {
      return;
    }

    restorePictureSources(img);

    const originalSrcset = img.dataset.feedFilterOriginalSrcset || "";
    const originalSizes = img.dataset.feedFilterOriginalSizes || "";
    const originalSrc = img.dataset.feedFilterOriginalSrc || "";
    const originalAlt = img.dataset.feedFilterOriginalAlt || "";

    if (originalSrcset) {
      img.setAttribute("srcset", originalSrcset);
    } else {
      img.removeAttribute("srcset");
    }

    if (originalSizes) {
      img.setAttribute("sizes", originalSizes);
    } else {
      img.removeAttribute("sizes");
    }

    if (originalSrc) {
      img.setAttribute("src", originalSrc);
    } else {
      img.removeAttribute("src");
    }

    img.setAttribute("alt", originalAlt);
    img.addEventListener("load", () => cleanupLoadedImage(img), { once: true });
    img.addEventListener("error", () => cleanupLoadedImage(img), { once: true });

    if (img.complete) {
      cleanupLoadedImage(img);
    }
  }

  function findVideoOverlayContainer(video) {
    return (
      video.closest('[data-testid="videoPlayer"]') ||
      video.closest('[data-testid="videoComponent"]') ||
      video.parentElement ||
      video
    );
  }

  function enforceDeferredVideo(video) {
    if (!(video instanceof HTMLVideoElement) || video.dataset[VIDEO_MARKER] !== "1") {
      return;
    }

    video.pause();
  }

  function ensureDeferredVideoGuard(video) {
    if (!(video instanceof HTMLVideoElement) || video.dataset.feedFilterVideoGuardAttached === "1") {
      return;
    }

    video.dataset.feedFilterVideoGuardAttached = "1";
    video.addEventListener("play", () => enforceDeferredVideo(video), true);
    video.addEventListener("loadeddata", () => enforceDeferredVideo(video), true);
  }

  function createVideoOverlay(video) {
    const container = findVideoOverlayContainer(video);
    if (!(container instanceof HTMLElement)) {
      return null;
    }

    let overlay = container.querySelector(`[${VIDEO_OVERLAY_ATTR}="1"]`);
    if (overlay instanceof HTMLElement) {
      return overlay;
    }

    const computedStyle = window.getComputedStyle(container);
    if (computedStyle.position === "static") {
      container.dataset.feedFilterVideoOverlayPositioned = "1";
      container.style.position = "relative";
    }

    overlay = document.createElement("div");
    overlay.setAttribute(VIDEO_OVERLAY_ATTR, "1");
    overlay.setAttribute("role", "button");
    overlay.setAttribute("tabindex", "0");
    overlay.setAttribute("aria-label", `Hidden ${SITE.label} video. Click to load.`);
    overlay.innerHTML =
      '<div class="feed-filter-video-overlay-copy">' +
        '<span class="feed-filter-video-overlay-title">Video hidden</span>' +
        '<span class="feed-filter-video-overlay-subtitle">Click to load</span>' +
      "</div>";

    const renderedHeight = video.clientHeight || Number(video.getAttribute("height")) || 0;
    if (renderedHeight > 0) {
      overlay.style.minHeight = `${renderedHeight}px`;
    } else {
      overlay.style.minHeight = "180px";
    }

    container.appendChild(overlay);
    return overlay;
  }

  function cleanupLoadedVideo(video) {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    video.dataset.feedFilterVideoLoaded = "1";
    delete video.dataset[VIDEO_MARKER];
    video.removeAttribute(VIDEO_ATTR);

    const originalPreload = video.dataset.feedFilterOriginalVideoPreload;
    if (originalPreload) {
      video.setAttribute("preload", originalPreload);
    } else {
      video.removeAttribute("preload");
    }

    const originalAutoplay = video.dataset.feedFilterOriginalVideoAutoplay;
    if (originalAutoplay === "1") {
      video.setAttribute("autoplay", "");
    } else {
      video.removeAttribute("autoplay");
    }

    const container = findVideoOverlayContainer(video);
    if (container instanceof HTMLElement) {
      const overlay = container.querySelector(`[${VIDEO_OVERLAY_ATTR}="1"]`);
      if (overlay) {
        overlay.remove();
      }

      if (container.dataset.feedFilterVideoOverlayPositioned === "1") {
        container.style.removeProperty("position");
        delete container.dataset.feedFilterVideoOverlayPositioned;
      }
    }
  }

  function loadDeferredVideo(video) {
    if (!(video instanceof HTMLVideoElement) || video.dataset[VIDEO_MARKER] !== "1") {
      return;
    }

    cleanupLoadedVideo(video);
    video.play().catch(() => {});
  }

  function deferVideo(video) {
    if (shouldSkipVideo(video)) {
      return;
    }

    video.dataset[VIDEO_MARKER] = "1";
    video.dataset.feedFilterOriginalVideoPreload = video.getAttribute("preload") || "";
    video.dataset.feedFilterOriginalVideoAutoplay = video.hasAttribute("autoplay") ? "1" : "";

    video.setAttribute("preload", "none");
    video.removeAttribute("autoplay");
    video.setAttribute(VIDEO_ATTR, "1");
    ensureDeferredVideoGuard(video);
    createVideoOverlay(video);
    enforceDeferredVideo(video);
  }

  function scan(root = document) {
    if (!(root instanceof Element || root instanceof Document)) {
      return;
    }

    scanRedditPostFilters(root);

    if (root instanceof HTMLImageElement) {
      deferImage(root);
      return;
    }

    if (root instanceof HTMLVideoElement) {
      deferVideo(root);
      return;
    }

    root.querySelectorAll("img").forEach((img) => {
      deferImage(img);
    });

    root.querySelectorAll("video").forEach((video) => {
      deferVideo(video);
    });
  }

  function handleActivation(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const img = target.closest(`img[${IMAGE_ATTR}="1"]`);
    if (!img) {
      return;
    }

    if (event.type === "keydown") {
      const keyEvent = event;
      if (keyEvent.key !== "Enter" && keyEvent.key !== " ") {
        return;
      }
      keyEvent.preventDefault();
    }

    event.preventDefault();
    loadDeferredImage(img);
    return;
  }

  function handleVideoActivation(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const overlay = target.closest(`[${VIDEO_OVERLAY_ATTR}="1"]`);
    if (!overlay) {
      return;
    }

    if (event.type === "keydown") {
      const keyEvent = event;
      if (keyEvent.key !== "Enter" && keyEvent.key !== " ") {
        return;
      }
      keyEvent.preventDefault();
    }

    event.preventDefault();
    event.stopPropagation();

    const container = overlay.parentElement;
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const video = container.querySelector(`video[${VIDEO_ATTR}="1"]`);
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    loadDeferredVideo(video);
  }

  injectStyles();
  scan(document);

  document.addEventListener("click", handleActivation, true);
  document.addEventListener("keydown", handleActivation, true);
  document.addEventListener("click", handleVideoActivation, true);
  document.addEventListener("keydown", handleVideoActivation, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          scan(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
