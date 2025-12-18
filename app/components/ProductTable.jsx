import { useFetcher } from "react-router";
import PropTypes from "prop-types";
import { 
  IndexTable, 
  Thumbnail, 
  Badge, 
  Text,
  EmptyState,
  Button,
  ButtonGroup,
  InlineStack,
} from "@shopify/polaris";

export default function ProductTable({ 
  products, 
  resourceName,
  selectedResources,
  allResourcesSelected,
  handleSelectionChange,
  promotedBulkActions,
  bulkProcessing,
  onMarkAsDigital,
  onOpenImageModal,
  onOpenMetafieldsModal,
  onOpenDeleteModal,
}) {
  const fetcher = useFetcher();

  const isMarkingDigital = (productId) => {
    return (
      fetcher.state === "submitting" &&
      fetcher.formData?.get("action") === "markDigital" &&
      fetcher.formData?.get("productId") === productId
    );
  };

  const isAlreadyDigital = (tags) => {
    return tags.includes("digital-product");
  };

  if (products.length === 0) {
    return (
      <EmptyState
        heading="No products found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>Try adjusting your search to find what you&apos;re looking for.</p>
      </EmptyState>
    );
  }

  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      selected={selectedResources.includes(product.id)}
      disabled={bulkProcessing}
    >
      <IndexTable.Cell>
        <Thumbnail
          source={product.featuredImage?.url || ''}
          alt={product.featuredImage?.altText || product.title}
          size="small"
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200" align="start" blockAlign="center">
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {product.title}
          </Text>
          {isAlreadyDigital(product.tags) && (
            <Badge tone="info">Digital</Badge>
          )}
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>{product.productType || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={product.status === "ACTIVE" ? "success" : "info"}>
          {product.status}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {product.tags.length > 0 ? product.tags.join(", ") : "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            size="slim"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsDigital(product);
            }}
            loading={isMarkingDigital(product.id)}
            disabled={isAlreadyDigital(product.tags)}
          >
            {isAlreadyDigital(product.tags) ? "Digital" : "Mark as Digital"}
          </Button>
          <Button
            size="slim"
            onClick={(e) => {
              e.stopPropagation();
              onOpenImageModal(product);
            }}
          >
            Add Image
          </Button>
          <Button
            size="slim"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMetafieldsModal(product);
            }}
          >
            Metadata
          </Button>
          <Button
            size="slim"
            tone="critical"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDeleteModal(product);
            }}
          >
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <IndexTable
      resourceName={resourceName}
      itemCount={products.length}
      selectedItemsCount={
        allResourcesSelected ? 'All' : selectedResources.length
      }
      onSelectionChange={handleSelectionChange}
      headings={[
        { title: 'Image' },
        { title: 'Title' },
        { title: 'Product Type' },
        { title: 'Status' },
        { title: 'Tags' },
        { title: 'Actions' },
      ]}
      promotedBulkActions={promotedBulkActions}
      disabled={bulkProcessing}
    >
      {rowMarkup}
    </IndexTable>
  );
}

ProductTable.propTypes = {
  products: PropTypes.array.isRequired,
  resourceName: PropTypes.object.isRequired,
  selectedResources: PropTypes.array.isRequired,
  allResourcesSelected: PropTypes.bool.isRequired,
  handleSelectionChange: PropTypes.func.isRequired,
  promotedBulkActions: PropTypes.array.isRequired,
  bulkProcessing: PropTypes.bool.isRequired,
  onMarkAsDigital: PropTypes.func.isRequired,
  onOpenImageModal: PropTypes.func.isRequired,
  onOpenMetafieldsModal: PropTypes.func.isRequired,
  onOpenDeleteModal: PropTypes.func.isRequired,
};
