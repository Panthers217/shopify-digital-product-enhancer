import { useState, useMemo, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Banner,
  Text,
  Badge,
  InlineStack,
  useIndexResourceState,
} from "@shopify/polaris";

// Import components
import ProductFilters from "../components/ProductFilters";
import BulkProgressBanner from "../components/BulkProgressBanner";
import ProductTable from "../components/ProductTable";
import DeleteProductModal from "../components/DeleteProductModal";
import AddImageModal from "../components/AddImageModal";
import MetafieldsModal from "../components/MetafieldsModal";
import styles from "../styles/app-index.module.css";

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
              featuredImage {
                url
                altText
              }
              downloadUrl: metafield(namespace: "digital", key: "download_url") {
                value
              }
              license: metafield(namespace: "digital", key: "license") {
                value
              }
            }
          }
        }
      }`
  );

  const responseJson = await response.json();
  const products = responseJson.data.products.edges.map((edge) => edge.node);
  
  // Debug: Log how many products have images
  console.log(`Loaded ${products.length} products, ${products.filter(p => p.featuredImage).length} have images`);

  return { products };
};

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");
    
    console.log("Action received:", action);

    // Handle "Delete Product" action
    if (action === "deleteProduct") {
    const productId = formData.get("productId");
    const productTitle = formData.get("productTitle");

    const response = await admin.graphql(
      `#graphql
        mutation productDelete($input: ProductDeleteInput!) {
          productDelete(input: $input) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            id: productId,
          },
        },
      },
    );

    const responseJson = await response.json();
    
    if (responseJson.data.productDelete.userErrors.length > 0) {
      return {
        error: responseJson.data.productDelete.userErrors[0].message,
      };
    }

    return {
      success: true,
      productTitle,
      action: "deleteProduct",
    };
  }

  // Handle "Add Image" action
  if (action === "addImage") {
    const productId = formData.get("productId");
    const productTitle = formData.get("productTitle");
    const imageUrl = formData.get("imageUrl");
    const imageAlt = formData.get("imageAlt");

    const response = await admin.graphql(
      `#graphql
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          productId: productId,
          media: [
            {
              originalSource: imageUrl,
              alt: imageAlt || null,
              mediaContentType: "IMAGE",
            },
          ],
        },
      },
    );

    const responseJson = await response.json();
    
    if (responseJson.data.productCreateMedia.mediaUserErrors.length > 0) {
      return {
        error: responseJson.data.productCreateMedia.mediaUserErrors[0].message,
      };
    }

    return {
      success: true,
      productTitle,
      action: "addImage",
    };
  }

  // Handle "Update Metafields" action
  if (action === "updateMetafields") {
    const productId = formData.get("productId");
    const productTitle = formData.get("productTitle");
    const downloadUrl = formData.get("downloadUrl");
    const license = formData.get("license");

    const metafieldsToSet = [];

    // Add download_url metafield
    metafieldsToSet.push({
      namespace: "digital",
      key: "download_url",
      value: downloadUrl || "",
      type: "single_line_text_field",
    });

    // Add license metafield
    metafieldsToSet.push({
      namespace: "digital",
      key: "license",
      value: license || "",
      type: "single_line_text_field",
    });

    const response = await admin.graphql(
      `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            id: productId,
            metafields: metafieldsToSet,
          },
        },
      },
    );

    const responseJson = await response.json();
    
    if (responseJson.data.productUpdate.userErrors.length > 0) {
      return {
        error: responseJson.data.productUpdate.userErrors[0].message,
      };
    }

    return {
      success: true,
      productTitle,
      action: "updateMetafields",
    };
  }

  // Handle "Mark as Digital" action
  if (action === "markDigital") {
    const productId = formData.get("productId");
    const productTitle = formData.get("productTitle");
    const currentTags = formData.get("currentTags");
    
    // Parse existing tags and add new ones if not present
    const tagsArray = currentTags ? currentTags.split(",") : [];
    const newTags = [...new Set([...tagsArray, "digital-product", "no-shipping"])];

    const response = await admin.graphql(
      `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
              tags
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            id: productId,
            tags: newTags,
          },
        },
      },
    );

    const responseJson = await response.json();
    
    if (responseJson.data.productUpdate.userErrors.length > 0) {
      return {
        error: responseJson.data.productUpdate.userErrors[0].message,
      };
    }

    return {
      success: true,
      productTitle,
      action: "markDigital",
    };
  }

  // Handle "Generate Product" action (existing)
  if (!action || action === "generateProduct") {
    console.log("Starting product generation...");
    const color = ["Red", "Orange", "Yellow", "Green"][
      Math.floor(Math.random() * 4)
    ];
    
    console.log(`Creating ${color} Snowboard...`);
    
    // Step 1: Create product
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
            userErrors {
              field
              message
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
    
    console.log("Product creation response:", JSON.stringify(responseJson, null, 2));
    
    // Check for errors in product creation
    if (responseJson.data?.productCreate?.userErrors?.length > 0) {
      console.error("Product creation errors:", responseJson.data.productCreate.userErrors);
      return {
        error: responseJson.data.productCreate.userErrors[0].message,
      };
    }
    
    const product = responseJson.data?.productCreate?.product;
    if (!product) {
      return {
        error: "Failed to create product",
      };
    }
    
    const variant = product.variants?.edges?.[0]?.node;
    if (!variant) {
      return {
        error: "Failed to create product variant",
      };
    }
    
    // Step 2: Update variant price
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
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          productId: product.id,
          variants: [{ id: variant.id, price: "100.00" }],
        },
      },
    );
    const variantResponseJson = await variantResponse.json();
    
    // Check for errors in variant update
    if (variantResponseJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
      return {
        error: variantResponseJson.data.productVariantsBulkUpdate.userErrors[0].message,
      };
    }
    
    // Step 3: Add an image to the newly created product
    const imageUrl = `https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-${Math.floor(Math.random() * 6) + 1}_large.png`;
    const imageResponse = await admin.graphql(
      `#graphql
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          productId: product.id,
          media: [
            {
              originalSource: imageUrl,
              alt: `${color} Snowboard`,
              mediaContentType: "IMAGE",
            },
          ],
        },
      },
    );
    const imageResponseJson = await imageResponse.json();
    
    // Check for errors in image creation (non-fatal, just log)
    if (imageResponseJson.data?.productCreateMedia?.mediaUserErrors?.length > 0) {
      console.warn("Failed to add image:", imageResponseJson.data.productCreateMedia.mediaUserErrors[0].message);
    }

    return {
      success: true,
      product: product,
      variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
      action: "generateProduct",
    };
  }

  // If we get here, unknown action
  return {
    error: "Unknown action",
  };
  } catch (error) {
    console.error("Error in action:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      response: error.response,
    });
    return {
      error: error.message || "An unexpected error occurred",
    };
  }
};

export default function Index() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchQuery, setSearchQuery] = useState("");
  const [digitalFilter, setDigitalFilter] = useState(['show-all']);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState({ success: 0, failed: 0 });
  const [metafieldsModalActive, setMetafieldsModalActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [license, setLicense] = useState("");
  const [urlError, setUrlError] = useState("");
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [imageModalActive, setImageModalActive] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageUrlError, setImageUrlError] = useState("");

  // Client-side filtering by title and digital status
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(query)
      );
    }

    // Apply digital filter
    if (digitalFilter.includes('digital-only')) {
      filtered = filtered.filter((product) =>
        product.tags.includes('digital-product')
      );
    } else if (digitalFilter.includes('hide-digital')) {
      filtered = filtered.filter((product) =>
        !product.tags.includes('digital-product')
      );
    }
    // show-all: no filtering needed

    return filtered;
  }, [products, searchQuery, digitalFilter]);

  // Setup bulk selection
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(filteredProducts);

  // Show toast notifications based on action results
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.action === "markDigital") {
      shopify.toast.show(`Updated ${fetcher.data.productTitle}`);
    } else if (fetcher.data?.success && fetcher.data?.action === "updateMetafields") {
      shopify.toast.show(`Updated metadata for ${fetcher.data.productTitle}`);
      setMetafieldsModalActive(false);
    } else if (fetcher.data?.success && fetcher.data?.action === "deleteProduct") {
      shopify.toast.show(`Deleted ${fetcher.data.productTitle}`);
      setDeleteModalActive(false);
      // Reload to refresh the list
      window.location.reload();
    } else if (fetcher.data?.success && fetcher.data?.action === "addImage") {
      shopify.toast.show(`Added image to ${fetcher.data.productTitle}`);
      setImageModalActive(false);
      // Reload to show new image
      window.location.reload();
    } else if (fetcher.data?.success && fetcher.data?.action === "generateProduct") {
      shopify.toast.show(`Successfully created ${fetcher.data.product?.title || "test product"}`);
      // Reload to show new product
      window.location.reload();
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const isCreatingProduct =
    fetcher.state === "submitting" && fetcher.formMethod === "POST";

  const generateProduct = () => {
    const formData = new FormData();
    formData.append("action", "generateProduct");
    fetcher.submit(formData, { method: "POST" });
  };

  const markAsDigital = (product) => {
    const formData = new FormData();
    formData.append("action", "markDigital");
    formData.append("productId", product.id);
    formData.append("productTitle", product.title);
    formData.append("currentTags", product.tags.join(","));
    fetcher.submit(formData, { method: "POST" });
  };

  const openMetafieldsModal = (product) => {
    setSelectedProduct(product);
    setDownloadUrl(product.downloadUrl?.value || "");
    setLicense(product.license?.value || "");
    setUrlError("");
    setMetafieldsModalActive(true);
  };

  const closeMetafieldsModal = () => {
    setMetafieldsModalActive(false);
    setSelectedProduct(null);
    setDownloadUrl("");
    setLicense("");
    setUrlError("");
  };

  const validateUrl = (url) => {
    if (!url) return true; // Empty is valid
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleMetafieldsSave = () => {
    // Validate URL
    if (downloadUrl && !validateUrl(downloadUrl)) {
      setUrlError("Please enter a valid URL");
      return;
    }

    setUrlError("");

    const formData = new FormData();
    formData.append("action", "updateMetafields");
    formData.append("productId", selectedProduct.id);
    formData.append("productTitle", selectedProduct.title);
    formData.append("downloadUrl", downloadUrl);
    formData.append("license", license);
    fetcher.submit(formData, { method: "POST" });
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setDeleteModalActive(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalActive(false);
    setProductToDelete(null);
  };

  const confirmDelete = () => {
    const formData = new FormData();
    formData.append("action", "deleteProduct");
    formData.append("productId", productToDelete.id);
    formData.append("productTitle", productToDelete.title);
    fetcher.submit(formData, { method: "POST" });
  };

  const openImageModal = (product) => {
    setSelectedProduct(product);
    setImageUrl("");
    setImageAlt("");
    setImageUrlError("");
    setImageModalActive(true);
  };

  const closeImageModal = () => {
    setImageModalActive(false);
    setSelectedProduct(null);
    setImageUrl("");
    setImageAlt("");
    setImageUrlError("");
  };

  const handleImageSave = () => {
    // Validate URL
    if (!imageUrl) {
      setImageUrlError("Image URL is required");
      return;
    }
    if (!validateUrl(imageUrl)) {
      setImageUrlError("Please enter a valid URL");
      return;
    }

    setImageUrlError("");

    const formData = new FormData();
    formData.append("action", "addImage");
    formData.append("productId", selectedProduct.id);
    formData.append("productTitle", selectedProduct.title);
    formData.append("imageUrl", imageUrl);
    formData.append("imageAlt", imageAlt);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleImageUrlChange = (value) => {
    setImageUrl(value);
    setImageUrlError("");
  };

  const handleDownloadUrlChange = (value) => {
    setDownloadUrl(value);
    setUrlError("");
  };

  // Bulk mark as digital - process sequentially
  const bulkMarkAsDigital = async () => {
    const selectedProducts = filteredProducts.filter((product) =>
      selectedResources.includes(product.id)
    );

    // Filter out products that are already digital
    const productsToUpdate = selectedProducts.filter(
      (product) => !product.tags.includes("digital-product")
    );

    if (productsToUpdate.length === 0) {
      shopify.toast.show("All selected products are already marked as digital");
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: productsToUpdate.length });
    setBulkResults({ success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < productsToUpdate.length; i++) {
      const product = productsToUpdate[i];
      
      try {
        const formData = new FormData();
        formData.append("action", "markDigital");
        formData.append("productId", product.id);
        formData.append("productTitle", product.title);
        formData.append("currentTags", product.tags.join(","));

        // Submit and wait for response
        const response = await fetch(window.location.pathname, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to update ${product.title}:`, error);
        failedCount++;
      }

      // Update progress
      setBulkProgress({ current: i + 1, total: productsToUpdate.length });
      setBulkResults({ success: successCount, failed: failedCount });
    }

    setBulkProcessing(false);
    clearSelection();
    
    // Show final result toast
    shopify.toast.show(
      `Bulk update complete: ${successCount} successful, ${failedCount} failed`
    );

    // Reload the page to refresh data
    window.location.reload();
  };

  const resourceName = {
    singular: 'product',
    plural: 'products',
  };

  const promotedBulkActions = [
    {
      content: 'Mark selected as Digital',
      onAction: bulkMarkAsDigital,
    },
  ];

  return (
    <Page
      title="Product Dashboard"
      primaryAction={{
        content: 'Generate Test Product',
        onAction: generateProduct,
        loading: isCreatingProduct,
      }}
    >
      <div className={styles.pageShell}>
      <div className={styles.pageEntrance}>
      <div className={styles.cardSurface}>
      <Card>
        <div className={`${styles.headerSection} ${styles.animatedSection}`}>
          <Text as="h2" variant="headingMd">
            Digital Product Workflow
          </Text>
          <div className={styles.subtleText}>
            <Text as="p" variant="bodyMd" tone="subdued">
              Manage product tags, images, and metafields in one clean workspace.
            </Text>
          </div>
          <div className={styles.metricsRow}>
            <InlineStack gap="200" wrap>
              <Badge tone="info">{products.length} total products</Badge>
              <Badge tone="success">
                {products.filter((p) => p.tags.includes("digital-product")).length} digital
              </Badge>
              <Badge>
                {products.filter((p) => p.featuredImage?.url).length} with images
              </Badge>
            </InlineStack>
          </div>
        </div>

        {/* Bulk Processing Progress */}
        {bulkProcessing && (
          <div className={styles.animatedSection}>
            <BulkProgressBanner 
              bulkProgress={bulkProgress} 
              bulkResults={bulkResults} 
            />
          </div>
        )}

        {/* Selection Info Banner */}
        {selectedResources.length > 0 && !bulkProcessing && (
          <div className={`${styles.selectionBanner} ${styles.animatedSection}`}>
            <Banner>
              <Text as="p" variant="bodyMd">
                {selectedResources.length} product{selectedResources.length !== 1 ? 's' : ''} selected
              </Text>
            </Banner>
          </div>
        )}

        <div className={`${styles.filtersWrap} ${styles.animatedSection}`}>
          <Text as="h3" variant="headingSm">
            Find and Filter
          </Text>
          <ProductFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            digitalFilter={digitalFilter}
            setDigitalFilter={setDigitalFilter}
          />
        </div>

        <div className={`${styles.tableWrap} ${styles.animatedSection}`}>
          <ProductTable
            products={filteredProducts}
            resourceName={resourceName}
            selectedResources={selectedResources}
            allResourcesSelected={allResourcesSelected}
            handleSelectionChange={handleSelectionChange}
            promotedBulkActions={promotedBulkActions}
            bulkProcessing={bulkProcessing}
            onMarkAsDigital={markAsDigital}
            onOpenImageModal={openImageModal}
            onOpenMetafieldsModal={openMetafieldsModal}
            onOpenDeleteModal={openDeleteModal}
          />
        </div>

        {filteredProducts.length > 0 && (
          <div className={styles.footerMeta}>
            <Text as="p" variant="bodySm" tone="subdued">
              Showing {filteredProducts.length} of {products.length} product
              {products.length !== 1 ? "s" : ""}
              {digitalFilter.includes('digital-only') && <> (digital only)</>}
              {digitalFilter.includes('hide-digital') && <> (non-digital only)</>}
              {" "} · {filteredProducts.filter(p => p.tags.includes('digital-product')).length} digital
              {" "} · {products.filter(p => p.featuredImage?.url).length} have images
            </Text>
          </div>
        )}
      </Card>
      </div>
      </div>
      </div>

      {/* Modals */}
      <DeleteProductModal
        active={deleteModalActive}
        product={productToDelete}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />

      <AddImageModal
        active={imageModalActive}
        product={selectedProduct}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        imageUrlError={imageUrlError}
        onClose={closeImageModal}
        onImageUrlChange={handleImageUrlChange}
        onImageAltChange={setImageAlt}
        onSave={handleImageSave}
      />

      <MetafieldsModal
        active={metafieldsModalActive}
        product={selectedProduct}
        downloadUrl={downloadUrl}
        license={license}
        urlError={urlError}
        onClose={closeMetafieldsModal}
        onDownloadUrlChange={handleDownloadUrlChange}
        onLicenseChange={setLicense}
        onSave={handleMetafieldsSave}
      />
    </Page>
  );
}

export const ErrorBoundary = boundary.error;

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
