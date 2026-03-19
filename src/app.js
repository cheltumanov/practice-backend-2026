import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";

function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: { title: "Survey API", version: "0.1.0" },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: { 200: { description: "OK" } },
        },
      },
    },
  };
}

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  const spec = buildOpenApiSpec();
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/openapi.json", (_req, res) => res.json(spec));

  app.use((err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = status === 500 ? "Internal Server Error" : String(err?.message ?? "Error");
    res.status(status).json({ error: { message } });
  });

  return app;
}

