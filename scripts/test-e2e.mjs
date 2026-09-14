import { spawn } from "node:child_process";
import pg from "pg";

if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env first.");

const databaseName = `everyonelockin_e2e_${process.pid}_${Date.now().toString(36)}`;
const testUrl = new URL(process.env.DATABASE_URL);
testUrl.pathname = `/${databaseName}`;
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
const env = {
  ...process.env,
  DATABASE_URL: testUrl.toString(),
  DEMO_MODE: "true",
  E2E_ISOLATED: "true",
  HOST: "127.0.0.1",
  PORT: "5188",
};
let activeChild;
let interrupted = false;

function run(args) {
  return new Promise((resolve, reject) => {
    if (interrupted) return resolve(1);
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    activeChild = child;
    child.once("error", reject);
    child.once("exit", (code) => {
      activeChild = undefined;
      resolve(code ?? 1);
    });
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
    activeChild?.kill(signal);
  });
}

await admin.connect();
let created = false;
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  console.log("Preparing an isolated browser-test database.");
  let code = await run(["--import", "tsx", "scripts/db.ts", "migrate"]);
  if (code === 0)
    code = await run(["--import", "tsx", "scripts/db.ts", "seed"]);
  if (code === 0)
    code = await run(["node_modules/@react-router/dev/bin.cjs", "build"]);
  if (code === 0)
    code = await run([
      "node_modules/@playwright/test/cli.js",
      "test",
      ...process.argv.slice(2),
    ]);
  process.exitCode = code;
} finally {
  try {
    if (created) {
      await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
      console.log("Isolated browser-test database removed.");
    }
  } finally {
    await admin.end();
  }
}
