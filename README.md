# Screen Translator

Snip any part of your screen, paste it in, and get a translation into the language you choose. The original and the translation are shown side by side, with the detected language named.

## How to use

1. Open the page (GitHub Pages link, or open `index.html` in Chrome or Firefox).
2. Enter your invite code and click **Save code**.
3. Pick a language under **Translate into**.
4. Snip part of your screen (Windows: Win+Shift+S, Mac: Cmd+Ctrl+Shift+4), click the page and press Ctrl+V or Cmd+V.

**Live mode** shares a window (for example a video player) and translates new on-screen text every few seconds.

## How it works

- `index.html` is the whole app and runs on GitHub Pages.
- `worker/worker.js` is a Cloudflare Worker that holds the Claude API key, checks invite codes and applies a daily limit. See [SETUP.md](SETUP.md).
- Screenshots go to Anthropic's Claude for reading and translation and are not stored by this site.
- It reads text on screen. It does not translate spoken audio.
