import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  buildDirectory: process.env.E2E_ISOLATED === "true" ? "build-test" : "build",
} satisfies Config;
