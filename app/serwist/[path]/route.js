import { createSerwistRoute } from "@serwist/turbopack";

export const {
  dynamic,
  dynamicParams,
  revalidate,
  generateStaticParams,
  GET,
} = createSerwistRoute({
  additionalPrecacheEntries: [
    {
      url: "/offline",
      revision: "daily-finance-v1",
    },
  ],
  swSrc: "app/sw.js",
  useNativeEsbuild: true,
});