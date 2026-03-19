import jwt from "jsonwebtoken";

import { getPrisma } from "../db/prisma.js";
import { unauthorized } from "../lib/httpError.js";

export function requireAuth() {
  const prisma = getPrisma();

  return async (req, _res, next) => {
    try {
      const header = req.header("authorization") ?? "";
      const [, token] = header.split(" ");
      if (!token) return next(unauthorized("Missing bearer token", "MISSING_TOKEN"));

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET is required");

      let payload;
      try {
        payload = jwt.verify(token, secret);
      } catch {
        return next(unauthorized("Invalid token", "INVALID_TOKEN"));
      }

      const userId = payload?.sub;
      if (!userId || typeof userId !== "string") return next(unauthorized("Invalid token", "INVALID_TOKEN"));

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, createdAt: true },
      });
      if (!user) return next(unauthorized("Invalid token", "INVALID_TOKEN"));

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

