(() => {
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
  const IMAGE_MARKER = "feedFilterDeferredImage";
  const IMAGE_ATTR = "data-feed-filter-deferred-image";
  const STYLE_ID = "feed-filter-reddit-image-style";

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
        outline: 2px solid #0079d3;
        outline-offset: 2px;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function findPostContainer(node) {
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
      if (/(?:image|media|gallery|preview|thumbnail|poster|expando)/.test(text)) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  function shouldSkipImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return true;
    }

    if (img.dataset[IMAGE_MARKER] === "1" || img.dataset.feedFilterImageLoaded === "1") {
      return true;
    }

    if (!findPostContainer(img)) {
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

    if (/(?:avatar|community icon|user icon|award|emoji|sprite|icon)/.test(metadata)) {
      return true;
    }

    const renderedWidth = img.clientWidth || Number(img.getAttribute("width")) || 0;
    const renderedHeight = img.clientHeight || Number(img.getAttribute("height")) || 0;
    const largestSide = Math.max(renderedWidth, renderedHeight);

    if (largestSide > 0 && largestSide <= 64) {
      return true;
    }

    return !looksLikeImageUi(img);
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
    img.setAttribute("alt", "Hidden Reddit image. Click to load.");
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", "Hidden Reddit image. Click to load.");
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

  function scan(root = document) {
    if (!(root instanceof Element || root instanceof Document)) {
      return;
    }

    if (root instanceof HTMLImageElement) {
      deferImage(root);
      return;
    }

    root.querySelectorAll("img").forEach((img) => {
      deferImage(img);
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
  }

  injectStyles();
  scan(document);

  document.addEventListener("click", handleActivation, true);
  document.addEventListener("keydown", handleActivation, true);

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
