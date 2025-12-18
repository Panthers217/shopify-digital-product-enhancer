import PropTypes from "prop-types";
import { Banner, Text, ProgressBar, InlineStack } from "@shopify/polaris";

export default function BulkProgressBanner({ bulkProgress, bulkResults }) {
  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e1e3e5' }}>
      <Banner tone="info">
        <div style={{ marginBottom: '8px' }}>
          <Text as="p" variant="bodyMd">
            Processing {bulkProgress.current} of {bulkProgress.total} products...
          </Text>
        </div>
        <ProgressBar
          progress={(bulkProgress.current / bulkProgress.total) * 100}
          size="small"
        />
        <div style={{ marginTop: '8px' }}>
          <InlineStack gap="400">
            <Text as="span" variant="bodySm" tone="success">
              ✓ {bulkResults.success} successful
            </Text>
            {bulkResults.failed > 0 && (
              <Text as="span" variant="bodySm" tone="critical">
                ✗ {bulkResults.failed} failed
              </Text>
            )}
          </InlineStack>
        </div>
      </Banner>
    </div>
  );
}

BulkProgressBanner.propTypes = {
  bulkProgress: PropTypes.shape({
    current: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
  }).isRequired,
  bulkResults: PropTypes.shape({
    success: PropTypes.number.isRequired,
    failed: PropTypes.number.isRequired,
  }).isRequired,
};
