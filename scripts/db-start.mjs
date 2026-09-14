import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { setTimeout } from "node:timers/promises";

loadEnvFile(".env");
const name = "everyonelockin-db";
const existing = spawnSync(
  "docker",
  [
    "inspect",
    "--format",
    '{{index .Config.Labels "app.everyonelockin"}}',
    name,
  ],
  { encoding: "utf8" },
);
if (existing.status === 0 && existing.stdout.trim() !== "local-development") {
  throw new Error(
    "A different container already uses the development database name.",
  );
}
const args =
  existing.status === 0
    ? ["start", name]
    : [
        "run",
        "--detach",
        "--name",
        name,
        "--label",
        "app.everyonelockin=local-development",
        "--env",
        "POSTGRES_USER",
        "--env",
        "POSTGRES_PASSWORD",
        "--env",
        "POSTGRES_DB",
        "--publish",
        "127.0.0.1:54329:5432",
        "--volume",
        "everyonelockin-data:/var/lib/postgresql",
        "--health-cmd",
        "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB",
        "--health-interval",
        "5s",
        "--health-timeout",
        "5s",
        "--health-retries",
        "10",
        "postgres:18-alpine",
      ];
const result = spawnSync("docker", args, {
  stdio: "inherit",
  env: process.env,
});
if (result.status !== 0) process.exit(result.status ?? 1);
for (let attempt = 0; attempt < 30; attempt++) {
  const health = spawnSync(
    "docker",
    ["inspect", "--format", "{{.State.Health.Status}}", name],
    { encoding: "utf8" },
  );
  if (health.status === 0 && health.stdout.trim() === "healthy") {
    console.log("Development database ready on 127.0.0.1:54329.");
    process.exit(0);
  }
  await setTimeout(1000);
}
throw new Error(
  "Database did not become healthy within 30 seconds. Check docker logs everyonelockin-db.",
);
