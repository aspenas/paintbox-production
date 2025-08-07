/**
 * Environment configuration helper
 * Safely access environment variables with fallbacks
 */

// Lazy getters to prevent circular dependencies
export const env = {
  companyCam: {
    get apiToken() {
      return typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_COMPANYCAM_API_TOKEN || ""
        : "";
    },
  },
  get isDevelopment() {
    return process.env.NODE_ENV === "development";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
