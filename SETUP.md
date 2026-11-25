# Setup: invite-only beta

The page (`index.html`) runs on GitHub Pages. A small Cloudflare Worker (`worker/worker.js`) holds your Claude API key, checks invite codes, and caps use per friend per day. Your key never reaches anyone's browser.

## 1. Anthropic

1. At console.anthropic.com, create an API key and add credit.
2. Under Limits, set a **monthly spend limit** (for example $20). This is your hard ceiling.

## 2. Cloudflare Worker (free plan is enough)

1. Sign up at dash.cloudflare.com.
2. **Storage & Databases > KV > Create**. Name it `screen-translator-usage`.
3. **Workers & Pages > Create > Create Worker**. Name it `screen-translator`, click Deploy.
4. Click **Edit code**, delete what's there, paste all of `worker/worker.js`, click **Deploy**.
5. Go to the Worker's **Settings > Bindings > Add > KV namespace**. Variable name `USAGE`, pick `screen-translator-usage`.
6. **Settings > Variables and Secrets**, add:

| Name | Type | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | your `sk-ant-...` key |
| `INVITE_CODES` | Secret | the JSON of codes and names |
| `ADMIN_TOKEN` | Secret | a long password for the usage report |
| `ALLOWED_ORIGINS` | Text | `https://eab114.github.io` |
| `DAILY_LIMIT` | Text | `150` |

7. Copy the Worker's address, like `https://screen-translator.yourname.workers.dev`.

## 3. Point the page at the Worker

In `index.html`, find `const API = "https://screen-translator.REPLACE-ME.workers.dev";` and put in your Worker address. Commit and push.

## 4. GitHub Pages

Repo **Settings > Pages > Deploy from a branch > main / (root)**. The site appears at `https://eab114.github.io/screen-translator/`.

## Running the beta

- **Add or remove a friend:** edit the `INVITE_CODES` secret. Removing a code cuts access right away.
- **See who used it today:** open `https://<your-worker>/usage?token=<ADMIN_TOKEN>`. Add `&day=2026-11-30` for another day.
- **Test locally:** add `null` to `ALLOWED_ORIGINS` (as `https://eab114.github.io,null`) to allow opening `index.html` from your disk. Remove it afterward.
