(() => {
  const HIDDEN_MARKER = "feedFilterHidden";

  function hideElement(element) {
    if (!element || element.dataset[HIDDEN_MARKER] === "1") {
      return;
    }
    element.dataset[HIDDEN_MARKER] = "1";
    element.style.setProperty("display", "none", "important");
  }

  function findReasonableContainer(node) {
    if (!node) {
      return null;
    }

    return (
      node.closest('[role="article"]') ||
      node.closest("div[data-pagelet]") ||
      node.closest('[role="feed"] > div') ||
      node.closest("li") ||
      node
    );
  }

  function hideReelLinks(root = document) {
    const reelSelectors = [
      'a[href*="/reel/"]',
      'a[href*="/reels/"]',
      'a[href*="facebook.com/reel/"]',
      'a[href*="facebook.com/reels/"]',
      'a[aria-label*="Reels"]',
      'a[aria-label*="Reel"]',
      '[aria-label="Reels"]',
      '[aria-label="Reels and short videos"]'
    ];

    root.querySelectorAll(reelSelectors.join(",")).forEach((link) => {
      const container = findReasonableContainer(link);
      if (container && container !== document.body) {
        hideElement(container);
      } else {
        hideElement(link);
      }
    });
  }

  function run() {
    hideReelLinks(document);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          hideReelLinks(node);
        }
      }
    }
  });

  run();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
