import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { createAuthRouter } from "./auth/auth.router.js";

function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: { title: "Survey API", version: "0.1.0" },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          summary: "Register user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Created" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "OK" } },
        },
      },
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

  app.use("/auth", createAuthRouter());

  const spec = buildOpenApiSpec();
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/openapi.json", (_req, res) => res.json(spec));

  app.use((err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = status === 500 ? "Internal Server Error" : String(err?.message ?? "Error");
    res.status(status).json({ error: { message, code: err?.code } });
  });

  return app;
}

