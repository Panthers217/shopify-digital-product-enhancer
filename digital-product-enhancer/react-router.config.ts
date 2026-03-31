import type { Config } from "@react-router/dev/config";

export default {
  // Allow Shopify domains to make action requests
  allowedActionOrigins: [
    "*.myshopify.com",
    "*.shopify.com",
    process.env.SHOPIFY_APP_URL,
  ].filter(Boolean),
} satisfies Config;
