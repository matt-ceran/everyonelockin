import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["DATABASE_URL", "DEMO_MODE"] as const) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [reactRouter()],
    resolve: { tsconfigPaths: true },
    ssr: { noExternal: ["@atlaskit/pragmatic-drag-and-drop"] },
  };
});
