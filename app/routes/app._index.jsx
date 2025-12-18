import { useState, useMemo } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 20) {
          edges {
            node {
              id
              title
              productType
              status
              tags
            }
          }
        }
      }`
  );

  const responseJson = await response.json();
  const products = responseJson.data.products.edges.map((edge) => edge.node);

  return { products };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side filtering by title
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }
    const query = searchQuery.toLowerCase();
    return products.filter((product) =>
      product.title.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const isCreatingProduct =
    fetcher.state === "submitting" && fetcher.formMethod === "POST";

  const handleProductClick = (productId) => {
    shopify.intents.invoke?.("edit:shopify/Product", {
      value: productId,
    });
  };

  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page heading="Product Dashboard">
      <s-button slot="primary-action" onClick={generateProduct} {...(isCreatingProduct ? { loading: true } : {})}>
        Generate Test Product
      </s-button>

      <s-section>
        <s-stack direction="block" gap="large">
          {/* Search Input */}
          <s-text-field
            label="Search products"
            value={searchQuery}
            placeholder="Search by product title..."
            onInput={(e) => setSearchQuery(e.target.value)}
            clearButton
            onClearButtonClick={() => setSearchQuery("")}
          />

          {/* Products Table */}
          {filteredProducts.length === 0 ? (
            <s-empty-state heading="No products found">
              <s-paragraph>
                {searchQuery
                  ? "Try adjusting your search to find what you're looking for."
                  : "Get started by adding products to your store or generating a test product."}
              </s-paragraph>
              {!searchQuery && (
                <s-button onClick={generateProduct}>
                  Generate Test Product
                </s-button>
              )}
            </s-empty-state>
          ) : (
            <s-table>
              <s-thead>
                <s-tr>
                  <s-th>Title</s-th>
                  <s-th>Product Type</s-th>
                  <s-th>Status</s-th>
                  <s-th>Tags</s-th>
                </s-tr>
              </s-thead>
              <s-tbody>
                {filteredProducts.map((product) => (
                  <s-tr
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <s-td>
                      <s-text variant="strong">{product.title}</s-text>
                    </s-td>
                    <s-td>{product.productType || "—"}</s-td>
                    <s-td>
                      <s-badge
                        variant={
                          product.status === "ACTIVE"
                            ? "success"
                            : product.status === "DRAFT"
                            ? "info"
                            : "default"
                        }
                      >
                        {product.status}
                      </s-badge>
                    </s-td>
                    <s-td>
                      {product.tags.length > 0 ? (
                        <s-stack direction="inline" gap="extra-tight" wrap>
                          {product.tags.map((tag, index) => (
                            <s-tag key={`${product.id}-${tag}-${index}`}>
                              {tag}
                            </s-tag>
                          ))}
                        </s-stack>
                      ) : (
                        "—"
                      )}
                    </s-td>
                  </s-tr>
                ))}
              </s-tbody>
            </s-table>
          )}

          {/* Results count */}
          {filteredProducts.length > 0 && (
            <s-text variant="subdued">
              Showing {filteredProducts.length} of {products.length} product
              {products.length !== 1 ? "s" : ""}
            </s-text>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
