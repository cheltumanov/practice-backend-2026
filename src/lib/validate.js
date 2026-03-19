import { ZodError } from "zod";

import { badRequest } from "./httpError.js";

export function parseBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest("Validation error", "VALIDATION_ERROR"),
        );
      }
      next(err);
    }
  };
}

