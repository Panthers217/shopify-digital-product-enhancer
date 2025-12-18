import { useFetcher } from "react-router";
import PropTypes from "prop-types";
import { Modal, Form, FormLayout, Text, TextField, Banner } from "@shopify/polaris";

export default function AddImageModal({ 
  active, 
  product, 
  imageUrl,
  imageAlt,
  imageUrlError,
  onClose,
  onImageUrlChange,
  onImageAltChange,
  onSave,
}) {
  const fetcher = useFetcher();

  const handleImageUrlChange = (value) => {
    onImageUrlChange(value);
  };

  return (
    <Modal
      open={active}
      onClose={onClose}
      title="Add Product Image"
      primaryAction={{
        content: 'Add Image',
        onAction: onSave,
        loading: fetcher.state === "submitting" && fetcher.formData?.get("action") === "addImage",
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
          <Form onSubmit={onSave}>
            <FormLayout>
              <Text variant="bodyMd" as="p" tone="subdued">
                Product: <strong>{product.title}</strong>
              </Text>
              
              <TextField
                label="Image URL"
                value={imageUrl}
                onChange={handleImageUrlChange}
                placeholder="https://example.com/image.jpg"
                error={imageUrlError}
                helpText="Enter a publicly accessible image URL (JPG, PNG, GIF, WebP)"
                autoComplete="off"
                requiredIndicator
              />

              <TextField
                label="Alt Text"
                value={imageAlt}
                onChange={onImageAltChange}
                placeholder="Description of the image"
                helpText="Optional: Alternative text for accessibility"
                autoComplete="off"
              />

              <Banner tone="info">
                <p>
                  The image will be added to the product gallery. You can upload images from external URLs
                  or use CDN-hosted images.
                </p>
              </Banner>
            </FormLayout>
          </Form>
        )}
      </Modal.Section>
    </Modal>
  );
}

AddImageModal.propTypes = {
  active: PropTypes.bool.isRequired,
  product: PropTypes.object,
  imageUrl: PropTypes.string.isRequired,
  imageAlt: PropTypes.string.isRequired,
  imageUrlError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onImageUrlChange: PropTypes.func.isRequired,
  onImageAltChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
