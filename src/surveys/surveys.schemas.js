import { z } from "zod";

export const createSurveySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export const updateSurveySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const addQuestionSchema = z.object({
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT"]),
  text: z.string().trim().min(1).max(2000),
  order: z.number().int().min(1),
});

export const addOptionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  order: z.number().int().min(1),
});

