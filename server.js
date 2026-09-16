import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createRequestHandler } from "@react-router/express";

const build = await import("./build/server/index.js");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(
  "/assets",
  express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
);
app.use(express.static("build/client"));
app.use(express.static("public", { maxAge: "1h" }));
app.use(morgan("tiny"));
app.all(
  "/{*splat}",
  createRequestHandler({ build, mode: process.env.NODE_ENV }),
);

const server = host ? app.listen(port, host) : app.listen(port);
console.log(`Serving on port ${port}`);
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => server?.close(console.error));
}
