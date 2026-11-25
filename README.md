# Screen Translator

Snip any part of your screen, paste it in, and get a translation into the language you choose. The original and the translation are shown side by side, with the detected language named.

## How to use

1. Open the page (GitHub Pages link, or open `index.html` in Chrome or Firefox).
2. Paste your Claude API key from [console.anthropic.com](https://console.anthropic.com) and click **Save key**.
3. Pick a language under **Translate into**.
4. Snip part of your screen (Windows: Win+Shift+S, Mac: Cmd+Ctrl+Shift+4), click the page and press Ctrl+V or Cmd+V.

**Live mode** shares a window (for example a video player) and translates new on-screen text every few seconds.

## Privacy and cost

- The page is a single HTML file with no server. Your API key is stored only in your own browser and is sent only to `api.anthropic.com`.
- Each translation is billed to your own Anthropic account. Set a monthly spend limit in the Console.
- It reads text on screen. It does not translate spoken audio.
