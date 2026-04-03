# Production Deployment — Lessons Learned

Hard-won notes from deploying this app to Render and connecting it to a real Shopify store.

---

## App URL must match everywhere — exactly

The `SHOPIFY_APP_URL` environment variable in Render, the `application_url` in `shopify.app.prod.toml`, and the **App URL + Allowed redirection URL** fields in the Shopify Partner Dashboard must all point to the same production origin with no trailing slash:

```
https://shopify-digital-product-enhancer.onrender.com
```

If your dev Codespaces URL (`*.app.github.dev`) is still registered anywhere in the Partner Dashboard, the App Bridge `postMessage` handshake will fail with an origin mismatch error and the app will not load inside the iframe:

```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided
('https://cuddly-spoon-xxxx.app.github.dev') does not match the recipient
window's origin ('https://admin.shopify.com').
```

---

## Redirect URL must include `/auth/callback`

The allowed redirect URL in Partner Dashboard and in your toml must be:

```
https://shopify-digital-product-enhancer.onrender.com/auth/callback
```

Not the bare domain root — Shopify's OAuth flow expects the `/auth/callback` path.

---

## Do not override Content-Security-Policy in Render

Setting a static `frame-ancestors` header in `render.yaml` can conflict with the dynamic CSP that Shopify injects per-request for embedded apps. Let the `@shopify/shopify-app-react-router` package handle `frame-ancestors` via `addDocumentResponseHeaders` — it sets the correct shop-specific origin automatically.

---

## Root route needs Shopify boundary wiring

`app/root.jsx` must export both `ErrorBoundary` and `headers` using `boundary` from `@shopify/shopify-app-react-router/server` so that Shopify auth/embed response headers are preserved at the document level, not just on nested `app.jsx` routes:

```js
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError } from "react-router";

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

---

## SQLite is ephemeral on Render free tier

Render's free/starter web service does not persist disk between deploys. Session data stored in `file:./dev.sqlite` will be lost on every deploy. For a real production app:

- Use a Render Disk add-on and point `DATABASE_URL` to the mounted path (e.g. `file:/var/data/prod.sqlite`)
- Or migrate to a hosted database (PostgreSQL via Render, PlanetScale, Supabase, etc.)

---

## Dev vs production configs are strictly separate

| Config file | Used for |
|---|---|
| `shopify.app.dev.toml` | Local dev / Codespaces only |
| `shopify.app.prod.toml` | Render production deploys |

Never deploy with the dev toml — `automatically_update_urls_on_dev = true` will overwrite your production App URL in the Partner Dashboard with the current tunnel URL.

---

## After any config or URL change — full reinstall required

Changing App URL, redirect URLs, or environment variables requires this sequence every time:

1. Redeploy Render web service
2. Run `shopify app deploy --config shopify.app.prod.toml` to sync Partner Dashboard
3. Uninstall the app from your dev store
4. Reinstall via the Partner Dashboard install link
5. Test in an incognito window to avoid stale session/localStorage state

---

## Embedded app vs public web app

This is a Shopify **embedded admin app**, not a public-facing website. Merchants use it inside their own Shopify Admin under **Apps**. It runs in an iframe authenticated via OAuth. A direct browser visit to the Render URL will prompt for a shop domain — that is expected behavior, not a bug.

For portfolio purposes, record a screen walkthrough from inside Shopify Admin and link to the GitHub repo + architecture docs rather than expecting recruiters to install the app themselves.
