# Digital Product Enhancer

A Shopify embedded app for managing digital products at scale. Built to streamline workflows for merchants selling downloadable content, this app provides bulk operations, metadata management, and advanced filtering capabilities.

## Features

- **Product Dashboard** - View and manage up to 20 products with real-time data from Shopify Admin GraphQL API
- **Bulk Operations** - Mark multiple products as digital with sequential processing and progress tracking
- **Smart Filtering** - Filter products by digital status (show all, digital only, hide digital) with live search
- **Metadata Management** - Store download URLs and license information using custom metafields
- **Image Management** - Add product images via external URLs with alt text support
- **Product Actions** - Delete products with confirmation modal and safety warnings
- **Digital Badges** - Visual indicators for products tagged as digital

## Tech Stack

- **Frontend**: React 18 with React Router v7 (Remix architecture)
- **UI Framework**: Shopify Polaris (full React component library)
- **API**: Shopify Admin GraphQL API (October25)
- **Database**: Prisma ORM with SQLite
- **Authentication**: Shopify App Bridge + OAuth
- **Dev Tools**: Shopify CLI, Vite, Docker (Codespaces)

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

*Coming soon - Dashboard, Bulk Operations, Metadata Modal*

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