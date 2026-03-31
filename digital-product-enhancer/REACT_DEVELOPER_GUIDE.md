# Shopify App Structure - React Developer's Guide

This guide explains the structure of this Shopify app from a React developer's perspective, helping you understand how the pieces fit together.

## Core Framework: React Router v7

This app uses **React Router** (formerly Remix) as the full-stack framework - not just for routing, but also for server-side logic. Think of it as Next.js but optimized for Shopify apps.

## Key Architecture Components

### 1. Routing Structure (File-based)

The routing system is file-based and automatic:

- [`app/routes.js`](app/routes.js) uses `flatRoutes()` for automatic file-based routing
- Routes are defined by file names in the `app/routes/` directory:
  - **`app.jsx`** - Layout wrapper (like a `_layout.jsx`)
  - **`app._index.jsx`** - Main page (`/app` route)
  - **`app.additional.jsx`** - Additional page (`/app/additional`)
  - **`auth.$.jsx`** - Catch-all auth route for OAuth

**File naming conventions:**
- `app.jsx` = `/app` (layout/parent route)
- `app._index.jsx` = `/app` (index route)
- `app.additional.jsx` = `/app/additional`
- `auth.$.jsx` = `/auth/*` (catch-all)

### 2. Server-Side Logic (Loaders & Actions)

Each route file can export server-side functions:

#### **Loaders** - Fetch data before rendering (like `getServerSideProps`)
```javascript
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { data: "some data" };
};
```

#### **Actions** - Handle POST/PUT/DELETE requests (like API routes)
```javascript
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  // Handle form submissions, mutations
  return { success: true };
};
```

### 3. React Components

Standard React components are exported as `default` from route files:

```jsx
export default function Index() {
  const data = useLoaderData();  // Access loader data
  const fetcher = useFetcher();  // Submit forms without navigation
  
  return <div>Your JSX here</div>;
}
```

**Key React Router Hooks:**
- **`useLoaderData()`** - Access data from the loader function
- **`useFetcher()`** - Submit forms without page navigation (like mutations)
- **`useSubmit()`** - Programmatically submit forms
- **`useNavigate()`** - Programmatic navigation

### 4. UI Layer - Polaris Web Components

Instead of importing React components, this app uses **Shopify Polaris web components** with custom HTML tags:

```jsx
<s-page heading="Page Title">
  <s-button slot="primary-action" onClick={handleClick}>
    Click me
  </s-button>
  
  <s-section heading="Section Title">
    <s-paragraph>
      This is text content with a <s-link href="/somewhere">link</s-link>
    </s-paragraph>
  </s-section>
</s-page>
```

**Common Polaris Components:**
- `<s-page>` - Page container
- `<s-section>` - Content sections
- `<s-button>` - Buttons
- `<s-paragraph>` - Text paragraphs
- `<s-link>` - Links (maintains iframe context)
- `<s-stack>` - Layout container
- `<s-box>` - Generic container
- `<s-app-nav>` - App navigation

These are **native web components**, not React components, so they work slightly differently than typical React libraries.

### 5. Shopify Integration

#### Server-Side ([`shopify.server.js`](app/shopify.server.js))
```javascript
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Use admin.graphql for queries/mutations
  const response = await admin.graphql(`
    query {
      shop {
        name
      }
    }
  `);
  
  return await response.json();
};
```

#### Client-Side (React Components)
```javascript
import { useAppBridge } from "@shopify/app-bridge-react";

export default function Component() {
  const shopify = useAppBridge();
  
  // Show toast notifications
  shopify.toast.show("Success!");
  
  // Navigate to Shopify resources
  shopify.intents.invoke("edit:shopify/Product", {
    value: "gid://shopify/Product/123"
  });
}
```

### 6. Data Flow Example

Here's how data flows in a typical interaction (from [`app._index.jsx`](app/routes/app._index.jsx)):

```
1. User clicks "Generate a product" button
   ↓
2. fetcher.submit({}, { method: "POST" }) triggers
   ↓
3. Calls the action function on server
   ↓
4. Action uses Shopify GraphQL to create product
   ↓
5. Returns JSON data
   ↓
6. fetcher.data updates in component
   ↓
7. React re-renders with new data
```

**Code example:**
```jsx
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    mutation createProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product { id title }
      }
    }
  `, {
    variables: { input: { title: "New Product" } }
  });
  
  return await response.json();
};

export default function Index() {
  const fetcher = useFetcher();
  
  const handleCreate = () => {
    fetcher.submit({}, { method: "POST" });
  };
  
  return (
    <s-button onClick={handleCreate}>
      {fetcher.state === "submitting" ? "Creating..." : "Create Product"}
    </s-button>
  );
}
```

### 7. Database - Prisma ORM

- **Schema**: [`prisma/schema.prisma`](prisma/schema.prisma) - Define database models
- **Client**: [`app/db.server.js`](app/db.server.js) - Prisma client instance
- **Primary Use**: Session storage (OAuth tokens)

**Example Usage:**
```javascript
import prisma from "./db.server";

const sessions = await prisma.session.findMany({
  where: { shop: "example.myshopify.com" }
});
```

### 8. Authentication Flow

**OAuth Process:**
1. User installs app from Shopify Admin
2. Redirected to `/auth` route
3. OAuth exchange happens via [`auth.$.jsx`](app/routes/auth.$.jsx)
4. Session stored in database
5. User redirected to app with authenticated session

**On Each Request:**
```javascript
const { admin, session } = await authenticate.admin(request);
// admin = GraphQL client
// session = { shop, accessToken, ... }
```

## Project Structure

```
digital-product-enhancer/
├── app/
│   ├── root.jsx              # HTML shell (like _document.jsx)
│   ├── routes.js             # Route configuration
│   ├── entry.server.jsx      # Server entry point
│   ├── shopify.server.js     # Shopify API config
│   ├── db.server.js          # Prisma database client
│   └── routes/               # All page routes
│       ├── app.jsx           # App layout with navigation
│       ├── app._index.jsx    # Home page
│       ├── app.additional.jsx # Additional page
│       └── auth.$.jsx        # OAuth handling
│
├── extensions/               # Future Shopify extensions
│                            # (UI extensions, checkout extensions, etc.)
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
│
├── public/                  # Static assets
│
├── package.json             # Dependencies & scripts
├── vite.config.js          # Build configuration
├── tsconfig.json           # TypeScript config
└── shopify.app.toml        # Shopify app config
```

## Key Differences from Standard React Apps

1. **No client-side router** - Server-rendered by default, hydrated on client
2. **Routes are server-first** - Loaders run on server before rendering
3. **Form submissions work without JavaScript** - Progressive enhancement
4. **Uses web components** - Not a React component library
5. **Embedded in Shopify Admin** - Runs in an iframe with special navigation requirements
6. **Built-in authentication** - OAuth handled automatically
7. **GraphQL-first** - Shopify Admin API accessed via GraphQL

## Important Gotchas

### Navigation in Embedded Apps
Always use these for navigation to maintain iframe session:
- ✅ `<s-link href="/path">` - Polaris link component
- ✅ `<Link to="/path">` - React Router Link
- ❌ `<a href="/path">` - Breaks embedded context

### Redirects
- ✅ Use `redirect` from `authenticate.admin`
- ❌ Don't use `redirect` from `react-router`

### Server vs Client Code
- Files ending in `.server.js` only run on server
- Loaders and actions always run on server
- Default exports (React components) run on both server and client

## Common Development Tasks

### Adding a New Page
1. Create file in `app/routes/` (e.g., `app.products.jsx`)
2. Export a loader (optional) for data fetching
3. Export a default component for the UI
4. Add navigation link in `app.jsx`

### Making GraphQL Queries
```javascript
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        edges {
          node { id title }
        }
      }
    }
  `);
  
  return await response.json();
};
```

### Handling Form Submissions
```javascript
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const title = formData.get("title");
  
  // Process the form data
  return { success: true };
};

export default function Page() {
  const fetcher = useFetcher();
  
  return (
    <fetcher.Form method="post">
      <input name="title" />
      <button type="submit">Submit</button>
    </fetcher.Form>
  );
}
```

## Development Workflow

1. **Start development server**: `npm run dev`
2. **Access app**: Press 'P' in terminal to open app URL
3. **Install app**: First time - install on development store
4. **Make changes**: Files auto-reload on save
5. **View changes**: Refresh browser to see updates

## Resources

- **React Router**: https://reactrouter.com/
- **Shopify App React Router**: https://shopify.dev/docs/api/shopify-app-react-router
- **Polaris Web Components**: https://shopify.dev/docs/api/app-home/polaris-web-components
- **Shopify Admin GraphQL API**: https://shopify.dev/docs/api/admin-graphql
- **App Bridge**: https://shopify.dev/docs/api/app-bridge-library

---

**In Summary**: This is essentially a **full-stack React app** optimized for Shopify's ecosystem with built-in authentication, GraphQL integration, and admin UI components. The framework handles the complexity of OAuth, embedded iframes, and API communication, letting you focus on building features.
