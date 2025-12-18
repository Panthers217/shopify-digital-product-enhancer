import PropTypes from "prop-types";
import { BlockStack, TextField, ChoiceList } from "@shopify/polaris";

export default function ProductFilters({ searchQuery, setSearchQuery, digitalFilter, setDigitalFilter }) {
  return (
    <BlockStack gap="400">
      <TextField
        label="Search products"
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by product title..."
        clearButton
        onClearButtonClick={() => setSearchQuery("")}
        autoComplete="off"
      />
      
      <ChoiceList
        title="Filter by digital status"
        choices={[
          { label: 'Show all', value: 'show-all' },
          { label: 'Show digital only', value: 'digital-only' },
          { label: 'Hide digital', value: 'hide-digital' },
        ]}
        selected={digitalFilter}
        onChange={setDigitalFilter}
      />
    </BlockStack>
  );
}

ProductFilters.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  digitalFilter: PropTypes.array.isRequired,
  setDigitalFilter: PropTypes.func.isRequired,
};
