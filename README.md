# Feed Filter Chrome Extension

This extension does five things:

- Adds a 4 second pause screen on `reddit.com`, `instagram.com`, `facebook.com`, `tiktok.com`, and `x.com`
- Blocks the Instagram Reels feed page at `instagram.com/reels/` while still allowing direct reel links
- Blocks YouTube Shorts pages and hides Shorts shelves/cards on `youtube.com`
- Hides Facebook Reels blocks/links on `facebook.com`
- Replaces Reddit post images with a placeholder until the user clicks the image to load it

## Install in Chrome (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the folder with the extension:
   - `~/Downloads/MyNetzer/feed-filter`

## Notes

- It works on dynamically loaded content (infinite scroll) using mutation observers.
- The social-site pause runs at `document_start` and keeps the page hidden for 4 seconds before revealing it.
- The Instagram blocker only blocks the `/reels/` feed route, not direct `/reel/...` links.
- The YouTube blocker hides Shorts shelves/links as they appear and blocks direct `/shorts/...` pages.
- The Reddit image blocker runs at `document_start` so images can be deferred before they finish loading.
- If Facebook/Reddit changes their HTML structure, selectors may need small updates.
