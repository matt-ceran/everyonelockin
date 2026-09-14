import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/platform/db/schema.server.ts",
  out: "./db/migrations",
});
