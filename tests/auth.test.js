import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { getPrisma } from "../src/db/prisma.js";
import { createApp } from "../src/app.js";

describe("auth", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    await prisma.answerOption.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.survey.deleteMany();
    await prisma.user.deleteMany();
  });

  it("register creates user and returns token", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(typeof res.body.token).toBe("string");
  });

  it("login returns token for valid credentials", async () => {
    const app = createApp();
    await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
    expect(typeof res.body.token).toBe("string");
  });

  it("login rejects invalid password", async () => {
    const app = createApp();
    await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/auth/login").send({
      email: "test@example.com",
      password: "wrong",
    });

    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe("INVALID_CREDENTIALS");
  });
});

