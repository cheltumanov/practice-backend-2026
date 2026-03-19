import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";

import { getPrisma } from "../db/prisma.js";
import { badRequest, unauthorized } from "../lib/httpError.js";
import { parseBody } from "../lib/validate.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return jwt.sign({ sub: userId }, secret, { expiresIn: "7d" });
}

export function createAuthRouter() {
  const router = express.Router();
  const prisma = getPrisma();

  router.post("/register", parseBody(registerSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true },
      });

      const token = signToken(user.id);
      res.status(201).json({ user, token });
    } catch (err) {
      if (err?.code === "P2002") return next(badRequest("Email already in use", "EMAIL_TAKEN"));
      next(err);
    }
  });

  router.post("/login", parseBody(loginSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return next(unauthorized("Invalid credentials", "INVALID_CREDENTIALS"));

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return next(unauthorized("Invalid credentials", "INVALID_CREDENTIALS"));

      const token = signToken(user.id);
      res.status(200).json({
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
        token,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

