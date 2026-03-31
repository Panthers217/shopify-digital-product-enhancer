import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const requiredEnvVars = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SCOPES",
];

const resolvedAppUrl =
  process.env.SHOPIFY_APP_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim() || "";

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]?.trim());

if (!resolvedAppUrl) {
  missingEnvVars.push("SHOPIFY_APP_URL or RENDER_EXTERNAL_URL");
}

if (missingEnvVars.length > 0) {
  const renderHint = missingEnvVars.includes("SHOPIFY_APP_URL or RENDER_EXTERNAL_URL")
    ? "Render hint: either set SHOPIFY_APP_URL manually (for example, https://your-service.onrender.com) or make sure RENDER_EXTERNAL_URL is available for this web service."
    : "Set the missing variables in your deployment environment settings.";

  throw new Error(
    `[Startup config error] Missing required environment variable(s): ${missingEnvVars.join(", ")}. ${renderHint}`,
  );
}

try {
  new URL(resolvedAppUrl);
} catch {
  throw new Error(
    "[Startup config error] App URL must be a valid absolute URL via SHOPIFY_APP_URL or RENDER_EXTERNAL_URL (for example, https://your-service.onrender.com).",
  );
}

const scopes = process.env.SCOPES.split(",").map((scope) => scope.trim()).filter(Boolean);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.October25,
  scopes,
  appUrl: resolvedAppUrl,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
