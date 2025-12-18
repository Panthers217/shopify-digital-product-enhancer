import { useFetcher } from "react-router";
import PropTypes from "prop-types";
import { Modal, BlockStack, Text, Banner } from "@shopify/polaris";

export default function DeleteProductModal({ 
  active, 
  product, 
  onClose, 
  onConfirm 
}) {
  const fetcher = useFetcher();

  return (
    <Modal
      open={active}
      onClose={onClose}
      title="Delete Product"
      primaryAction={{
        content: 'Delete',
        onAction: onConfirm,
        destructive: true,
        loading: fetcher.state === "submitting" && fetcher.formData?.get("action") === "deleteProduct",
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        {product && (
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Are you sure you want to delete <strong>{product.title}</strong>?
            </Text>
            <Banner tone="warning">
              <p>This action cannot be undone. The product will be permanently removed from your store.</p>
            </Banner>
          </BlockStack>
        )}
      </Modal.Section>
    </Modal>
  );
}

DeleteProductModal.propTypes = {
  active: PropTypes.bool.isRequired,
  product: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
