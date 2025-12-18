import { useFetcher } from "react-router";
import PropTypes from "prop-types";
import { Modal, Form, FormLayout, Text, TextField, Banner } from "@shopify/polaris";

export default function MetafieldsModal({ 
  active, 
  product, 
  downloadUrl,
  license,
  urlError,
  onClose,
  onDownloadUrlChange,
  onLicenseChange,
  onSave,
}) {
  const fetcher = useFetcher();

  const handleDownloadUrlChange = (value) => {
    onDownloadUrlChange(value);
  };

  return (
    <Modal
      open={active}
      onClose={onClose}
      title="Digital Metadata"
      primaryAction={{
        content: 'Save',
        onAction: onSave,
        loading: fetcher.state === "submitting" && fetcher.formData?.get("action") === "updateMetafields",
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
                label="Download URL"
                value={downloadUrl}
                onChange={handleDownloadUrlChange}
                placeholder="https://example.com/download/file.zip"
                error={urlError}
                helpText="Full URL where customers can download the digital product"
                autoComplete="off"
              />

              <TextField
                label="License"
                value={license}
                onChange={onLicenseChange}
                placeholder="e.g., Single User, Commercial, Personal Use"
                helpText="License type or terms for this digital product"
                autoComplete="off"
              />

              <Banner tone="info">
                <p>
                  These metafields are stored in the <strong>digital</strong> namespace
                  and can be used in your theme or apps to display download links and license information.
                </p>
              </Banner>
            </FormLayout>
          </Form>
        )}
      </Modal.Section>
    </Modal>
  );
}

MetafieldsModal.propTypes = {
  active: PropTypes.bool.isRequired,
  product: PropTypes.object,
  downloadUrl: PropTypes.string.isRequired,
  license: PropTypes.string.isRequired,
  urlError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onDownloadUrlChange: PropTypes.func.isRequired,
  onLicenseChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
