# Architecture — Digital Product Enhancer

This document explains how the app is structured, how data flows from Shopify's API to the browser, and the key decisions made in each layer.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Embedded App Context](#2-embedded-app-context)
3. [Authentication Flow](#3-authentication-flow)
4. [React Router Loader / Action Pattern](#4-react-router-loader--action-pattern)
5. [GraphQL Data Layer](#5-graphql-data-layer)
6. [Component Composition](#6-component-composition)
7. [Bulk Operations Pattern](#7-bulk-operations-pattern)
8. [Session Storage](#8-session-storage)
9. [Route Structure](#9-route-structure)

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Shopify Admin (iframe)                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │            React Router App (Vite/Node)          │    │
│  │                                                 │    │
│  │  Browser (React + Polaris + App Bridge)         │    │
│  │       ↕  useFetcher / loader data               │    │
│  │  Server (React Router loaders & actions)        │    │
│  │       ↕  authenticate.admin()                   │    │
│  │  Shopify Admin GraphQL API                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↕  OAuth + session token
    Shopify Partner Platform
         ↕
    Prisma (SQLite) — session storage
```

The app runs inside an **iframe embedded in Shopify Admin**. Every page load and every form submission goes through Node.js server-side code before touching the GraphQL API. The browser never holds Shopify API credentials.

---

## 2. Embedded App Context

Shopify embedded apps live inside an iframe within the Shopify Admin UI. This has several implications:

- **App Bridge** (`@shopify/app-bridge-react`) provides the bridge between the iframe and the parent Shopify Admin shell. It powers toast notifications, title bar buttons, and navigation that render outside the iframe.
- **Polaris** (`@shopify/polaris`) provides the component library that matches Shopify's design system, so the app looks native inside Admin.
- **Session tokens** are passed from the Shopify Admin parent frame to the embedded app on every request.

```jsx
// app/routes/app.jsx — Layout wrapper
<AppProvider embedded apiKey={apiKey}>       // App Bridge provider
  <PolarisAppProvider i18n={{}}>            // Polaris provider
    <Outlet />                               // Child routes render here
  </PolarisAppProvider>
</AppProvider>
```

All routes nested under `app.jsx` inherit both providers automatically via React Router's nested route layout system.

---

## 3. Authentication Flow

Authentication is handled by `@shopify/shopify-app-react-router` using the **OAuth 2.0 Authorization Code Grant** flow.

```
1. Merchant installs app from Shopify Partner Dashboard
       ↓
2. Shopify redirects to /auth with shop parameter
       ↓
3. app/routes/auth.$.jsx handles the OAuth callback
       ↓
4. Access token is exchanged and stored in Prisma (sessions table)
       ↓
5. Every subsequent request calls authenticate.admin(request)
       ↓
6. Middleware verifies the session token, refreshes if expired,
   and returns an authenticated `admin` client for GraphQL calls
```

```js
// app/shopify.server.js
export const { authenticate, apiVersion } = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  sessionStorage: new PrismaSessionStorage(prisma),
  // ...
});

// Used in every loader and action:
const { admin } = await authenticate.admin(request);
```

If a session is invalid or expired, `authenticate.admin()` automatically redirects the merchant through the OAuth flow again — no manual token management needed.

---

## 4. React Router Loader / Action Pattern

This is the core data pattern in the app. It replaces traditional REST API calls + `useState` with a cleaner server-driven model.

### Loaders — reading data

A `loader` function runs **on the server** before the page renders. The browser never makes a separate API call for initial data.

```js
// app/routes/app._index.jsx
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);  // verify session

  const response = await admin.graphql(`
    query getProducts {
      products(first: 20) {
        edges { node { id title tags featuredImage { url } ... } }
      }
    }
  `);

  const { data } = await response.json();
  return { products: data.products.edges.map(e => e.node) };
};

// In the component — data is already available, no loading spinner needed
const { products } = useLoaderData();
```

### Actions — writing data

An `action` function runs **on the server** when a form is submitted or `useFetcher.submit()` is called. This is where all GraphQL mutations live.

```js
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "markDigital") {
    // GraphQL mutation — runs server-side
    await admin.graphql(`mutation productUpdate(...) { ... }`, { variables });
    return { success: true, action: "markDigital" };
  }
  // ...other actions
};
```

### useFetcher — client-side action calls without navigation

`useFetcher` lets the component submit actions and read their results without triggering a full page navigation, keeping modal state, filter state, and scroll position intact.

```js
const fetcher = useFetcher();

// Submit an action programmatically
const markAsDigital = (product) => {
  const formData = new FormData();
  formData.append("action", "markDigital");
  formData.append("productId", product.id);
  fetcher.submit(formData, { method: "POST" });
};

// Read the result reactively
useEffect(() => {
  if (fetcher.data?.success && fetcher.data?.action === "markDigital") {
    shopify.toast.show(`Updated ${fetcher.data.productTitle}`);
  }
}, [fetcher.data]);
```

---

## 5. GraphQL Data Layer

All Shopify data access goes through the **Admin GraphQL API**. There is no REST API usage.

### Queries (reads)

| Operation | Purpose |
|-----------|---------|
| `products(first: 20)` | Load product list with images, tags, status |
| `metafield(namespace: "digital", key: "download_url")` | Inline metafield on product query |
| `metafield(namespace: "digital", key: "license")` | Inline metafield on product query |

Metafields are queried inline on the product object using **field aliases**, avoiding a separate query:

```graphql
node {
  id
  title
  downloadUrl: metafield(namespace: "digital", key: "download_url") { value }
  license: metafield(namespace: "digital", key: "license") { value }
}
```

### Mutations (writes)

| Mutation | Triggered by |
|----------|-------------|
| `productUpdate` (tags) | Mark as Digital button |
| `productUpdate` (metafields) | Save in Metadata modal |
| `productCreateMedia` | Save in Add Image modal |
| `productDelete` | Confirm in Delete modal |
| `productCreate` + `productVariantsBulkUpdate` | Generate Test Product button |

All mutations return `userErrors` which are checked before returning a success response. Errors are surfaced to the user via App Bridge toasts.

---

## 6. Component Composition

The UI is split into focused, single-responsibility components. The `app._index.jsx` route owns all state and passes it down as props — no shared state library is needed at this scale.

```
app._index.jsx  (state owner — loader data, modal states, filter state)
│
├── ProductFilters.jsx       (search input + filter toggle — no internal state)
├── BulkProgressBanner.jsx   (progress bar — display only)
├── ProductTable.jsx         (IndexTable + per-row action buttons)
│   └── uses its own useFetcher for per-row "Mark as Digital" loading state
├── DeleteProductModal.jsx   (confirmation modal)
├── AddImageModal.jsx        (image URL form)
└── MetafieldsModal.jsx      (download URL + license form)
```

Client-side filtering uses `useMemo` to avoid recalculating on every render:

```js
const filteredProducts = useMemo(() => {
  let filtered = products;
  if (searchQuery.trim()) {
    filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }
  if (digitalFilter.includes("digital-only")) {
    filtered = filtered.filter(p => p.tags.includes("digital-product"));
  }
  return filtered;
}, [products, searchQuery, digitalFilter]);   // only recalculates when these change
```

---

## 7. Bulk Operations Pattern

Bulk tagging processes products **sequentially** rather than in parallel. This is intentional.

```
Why not parallel (Promise.all)?
→ Shopify GraphQL API uses a leaky-bucket rate limiter.
→ Firing 20 mutations simultaneously would exhaust the bucket
  and cause 429 errors mid-batch.
→ Sequential processing keeps cost well under the refill rate.
```

```js
for (let i = 0; i < productsToUpdate.length; i++) {
  const formData = new FormData();
  formData.append("action", "markDigital");
  formData.append("productId", productsToUpdate[i].id);

  const response = await fetch(window.location.pathname, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  result.success ? successCount++ : failedCount++;

  // Update progress bar after each product
  setBulkProgress({ current: i + 1, total: productsToUpdate.length });
}
```

Each iteration hits the React Router `action` endpoint, which re-authenticates and runs the mutation. Progress state is updated after every product, so the UI bar moves in real time.

---

## 8. Session Storage

Shopify sessions (access tokens) are stored in a **Prisma-managed SQLite database**.

```prisma
// prisma/schema.prisma
model Session {
  id            String    @id
  shop          String
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String
  userId        BigInt?
}
```

`PrismaSessionStorage` from `@shopify/shopify-app-session-storage-prisma` handles reading and writing sessions automatically. For production deployment at scale, this database would be replaced with PostgreSQL or MySQL and a connection pool.

---

## 9. Route Structure

Routes use **file-system based routing** via `@react-router/fs-routes` `flatRoutes()`.

```
File name                        → URL                  → Purpose
─────────────────────────────────────────────────────────────────────
app/routes/app.jsx               → /app (layout)        → Polaris + AppBridge wrapper
app/routes/app._index.jsx        → /app                 → Main product dashboard
app/routes/app.additional.jsx    → /app/additional      → Secondary page
app/routes/auth.$.jsx            → /auth/*              → OAuth callback handler
app/routes/webhooks.app.*.jsx    → /webhooks/app/*      → Shopify webhook receivers
```

The `.` separator in filenames creates nested routes without nested folders. `app._index.jsx` maps to the index (default) child of the `app` layout because of the `_index` convention.

The `<Outlet />` in `app.jsx` renders whichever child route matches the current URL — so `app._index.jsx` renders at `/app` and `app.additional.jsx` renders at `/app/additional`, both sharing the same Polaris/AppBridge providers.

---

*For setup and feature documentation see [README.md](README.md).*
