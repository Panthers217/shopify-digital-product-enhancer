# Digital Product Enhancer

A production-pattern Shopify embedded app that helps merchants manage digital products at scale — tagging, metafield management, image assignment, and bulk operations, all from a single admin dashboard.

> **Portfolio note:** This project demonstrates end-to-end Shopify app development using the modern React Router v7 stack, the Shopify Admin GraphQL API, and the full Polaris design system. It intentionally covers patterns that appear frequently in real Shopify agency and platform-team work.

## What It Does

Merchants selling downloadable products (ebooks, software, templates, presets) need to tag products, store download links, and manage licenses — tasks Shopify's native admin does not streamline. This app solves that with a focused product management workspace.

## Features

| Feature | Details |
|---------|---------|
| **Product Dashboard** | Loads products with images, tags, and metafields via GraphQL |
| **Bulk Digital Tagging** | Marks multiple products as digital sequentially with live progress |
| **Smart Filtering** | Filter by digital status + live title search, client-side with `useMemo` |
| **Metafield Editor** | Stores `download_url` and `license` under the `digital` namespace |
| **Image Management** | Attaches images using `productCreateMedia` mutation |
| **Safe Deletion** | Confirmation modal before `productDelete` mutation fires |
| **Toast Feedback** | App Bridge toast notifications on every action success or error |
| **Embedded Auth** | Full Shopify OAuth + session persistence via Prisma |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Router v7 (loader/action SSR pattern) |
| UI | Shopify Polaris v13 (React component library) |
| Embedded Context | Shopify App Bridge v4 |
| API | Shopify Admin GraphQL API |
| Database | Prisma ORM + SQLite (session storage) |
| Auth | `@shopify/shopify-app-react-router` OAuth flow |
| Build | Vite, TypeScript, ESLint |
| Dev Environment | Shopify CLI, Docker/Codespaces |

## Architecture Overview

For a detailed explanation of how the app is structured — including the server/client data flow, GraphQL layer, authentication, and component composition — see [ARCHITECTURE.md](ARCHITECTURE.md).

### Quick data flow summary

```
Browser request
  → React Router loader (server-side)
    → authenticate.admin() verifies Shopify session
      → admin.graphql() fetches product data
        → loader returns JSON to React
          → Page renders with Polaris components

User action (button click / form)
  → useFetcher.submit() (client-side)
    → React Router action (server-side)
      → authenticate.admin() re-verifies session
        → admin.graphql() mutation runs
          → action returns result JSON
            → useEffect detects fetcher.data
              → shopify.toast.show() notifies user
```

## Architecture

### File Structure
```
digital-product-enhancer/
├── app/
│   ├── components/           # Reusable UI components
│   │   ├── ProductFilters.jsx
│   │   ├── ProductTable.jsx
│   │   ├── BulkProgressBanner.jsx
│   │   ├── DeleteProductModal.jsx
│   │   ├── AddImageModal.jsx
│   │   └── MetafieldsModal.jsx
│   ├── routes/               # File-based routing
│   │   ├── app._index.jsx    # Main dashboard
│   │   ├── app.jsx           # Layout wrapper
│   │   └── auth.*.jsx        # Authentication flows
│   ├── db.server.js          # Prisma client
│   └── shopify.server.js     # Shopify API config
├── prisma/
│   └── schema.prisma         # Database schema
└── extensions/               # App extensions
```

### Data Flow Pattern

This app follows React Router's **loader/action** pattern:

- **Loaders** - Server-side data fetching (GraphQL queries run before page render)
- **Actions** - Server-side mutations (form submissions trigger GraphQL mutations)
- **useFetcher** - Optimistic UI updates without full page reloads

Example from [app._index.jsx](digital-product-enhancer/app/routes/app._index.jsx):
```javascript
// Loader: Fetch products on page load
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`query { products(first: 20) { ... } }`);
  return { products };
};

// Action: Handle form submissions (mark digital, delete, etc.)
export const action = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  
  if (action === "markDigital") {
    // GraphQL mutation to update product tags
  }
};
```

## Setup in GitHub Codespaces

### Prerequisites
- Shopify Partner account
- Development store (with sample products)

### Installation

1. **Open in Codespaces**
   ```bash
   # Automatically opens in VS Code browser or desktop
   ```

2. **Install dependencies**
   ```bash
   cd digital-product-enhancer
   npm install
   ```

3. **Connect to Shopify**
   ```bash
   npm run dev
   ```
   - Follow CLI prompts to authenticate
   - Select your development store
   - App URL will be generated automatically

4. **Install app in your store**
   - CLI provides installation URL
   - Click link to install on test store
   - Grant required permissions (read/write products)

5. **Access the dashboard**
   - Navigate to Apps > Digital Product Enhancer in Shopify Admin
   - Generate test products or view existing catalog

## GraphQL Operations

### Queries Used
- `products` - Fetch product list with images, tags, and metafields
- `metafield` - Retrieve custom metadata (download URLs, licenses)

### Mutations Used
- `productUpdate` - Update tags and metafields
- `productDelete` - Remove products
- `productCreateMedia` - Add images via URL
- `productCreate` - Generate test products

## Component Breakdown

| Component | Purpose | Props |
|-----------|---------|-------|
| `ProductFilters` | Search and filter UI | `searchQuery`, `digitalFilter` |
| `ProductTable` | Main data table with bulk selection | `products`, `onMarkAsDigital`, `onOpenImageModal` |
| `BulkProgressBanner` | Progress bar for bulk operations | `bulkProgress`, `bulkResults` |
| `DeleteProductModal` | Confirmation dialog for deletions | `active`, `product`, `onConfirm` |
| `AddImageModal` | Image URL input form | `imageUrl`, `imageAlt`, `onSave` |
| `MetafieldsModal` | Metadata editor | `downloadUrl`, `license`, `onSave` |

## Screenshots

> Screenshots or a short screen recording of the dashboard, bulk operations flow, and metadata modal would go here. Recommended tool: [Loom](https://loom.com) for a 60-second walkthrough GIF.

## Key Engineering Decisions

**Sequential bulk processing** — Rather than firing all GraphQL mutations in parallel, the bulk tag operation processes products one at a time. This avoids Shopify API rate limit errors (bucket throttling) and keeps the UI progress bar accurate.

**useFetcher over full navigation** — Actions use `useFetcher` instead of standard form navigation so modals can stay open, progress can be shown inline, and the user does not lose filter/search state on mutation.

**Dedicated `digital` metafield namespace** — All custom metadata (download URLs, license keys) lives under `namespace: "digital"` to keep metafields isolated from other apps and easy to query or clean up.

**Polaris-first UI** — The Shopify Polaris component library is used for all primary UI rather than custom CSS, so the app looks native inside the Shopify Admin and passes Shopify's app review accessibility standards.

## Development Notes

- **Polaris Components**: Using full React library, not web components (`@shopify/polaris` v11+)
- **Sequential Processing**: Bulk operations process one product at a time to avoid rate limits
- **Metafields Namespace**: All custom fields stored under `digital` namespace
- **Error Handling**: GraphQL userErrors displayed via toast notifications
- **Reload Strategy**: Some mutations trigger page reload to refresh cached data

## Future Enhancements

- [ ] Pagination for large product catalogs
- [ ] File upload for images (vs URL-only)
- [ ] Batch tag editing
- [ ] Export digital products to CSV
- [ ] Analytics dashboard (downloads, revenue)

## License

MIT

---

**Built with** [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) | **Deployed on** Shopify App Platform