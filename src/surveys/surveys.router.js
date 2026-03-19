import express from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import { getPrisma } from "../db/prisma.js";
import { badRequest, unauthorized } from "../lib/httpError.js";
import { parseBody } from "../lib/validate.js";
import { addOptionSchema, addQuestionSchema, createSurveySchema, updateSurveySchema } from "./surveys.schemas.js";

function forbidIfNotAuthor(survey, userId) {
  if (!survey) return badRequest("Survey not found", "NOT_FOUND");
  if (survey.authorId !== userId) return unauthorized("Forbidden", "FORBIDDEN");
  return null;
}

export function createSurveysRouter() {
  const router = express.Router();
  const prisma = getPrisma();

  router.use(requireAuth());

  router.post("/", parseBody(createSurveySchema), async (req, res, next) => {
    try {
      const survey = await prisma.survey.create({
        data: {
          authorId: req.user.id,
          title: req.body.title,
          description: req.body.description,
        },
      });
      res.status(201).json({ survey });
    } catch (err) {
      next(err);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const surveys = await prisma.survey.findMany({
        where: { authorId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ surveys });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:surveyId", async (req, res, next) => {
    try {
      const survey = await prisma.survey.findUnique({
        where: { id: req.params.surveyId },
        include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
      });

      const err = forbidIfNotAuthor(survey, req.user.id);
      if (err) return next(err);

      res.status(200).json({ survey });
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:surveyId", parseBody(updateSurveySchema), async (req, res, next) => {
    try {
      const existing = await prisma.survey.findUnique({ where: { id: req.params.surveyId } });
      const err = forbidIfNotAuthor(existing, req.user.id);
      if (err) return next(err);
      if (existing.status !== "DRAFT") return next(badRequest("Only DRAFT surveys can be edited", "SURVEY_LOCKED"));

      const survey = await prisma.survey.update({
        where: { id: existing.id },
        data: req.body,
      });
      res.status(200).json({ survey });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:surveyId/questions", parseBody(addQuestionSchema), async (req, res, next) => {
    try {
      const survey = await prisma.survey.findUnique({ where: { id: req.params.surveyId } });
      const err = forbidIfNotAuthor(survey, req.user.id);
      if (err) return next(err);
      if (survey.status !== "DRAFT") return next(badRequest("Cannot change structure after publish", "SURVEY_LOCKED"));

      const question = await prisma.question.create({
        data: {
          surveyId: survey.id,
          type: req.body.type,
          text: req.body.text,
          order: req.body.order,
        },
      });
      res.status(201).json({ question });
    } catch (err) {
      if (err?.code === "P2002") return next(badRequest("Question order must be unique", "ORDER_TAKEN"));
      next(err);
    }
  });

  router.post("/:surveyId/questions/:questionId/options", parseBody(addOptionSchema), async (req, res, next) => {
    try {
      const survey = await prisma.survey.findUnique({ where: { id: req.params.surveyId } });
      const err = forbidIfNotAuthor(survey, req.user.id);
      if (err) return next(err);
      if (survey.status !== "DRAFT") return next(badRequest("Cannot change structure after publish", "SURVEY_LOCKED"));

      const question = await prisma.question.findUnique({ where: { id: req.params.questionId } });
      if (!question || question.surveyId !== survey.id) return next(badRequest("Question not found", "NOT_FOUND"));
      if (question.type === "TEXT") return next(badRequest("Cannot add options to TEXT question", "INVALID_QUESTION_TYPE"));

      const option = await prisma.option.create({
        data: {
          questionId: question.id,
          text: req.body.text,
          order: req.body.order,
        },
      });
      res.status(201).json({ option });
    } catch (err) {
      if (err?.code === "P2002") return next(badRequest("Option order must be unique", "ORDER_TAKEN"));
      next(err);
    }
  });

  router.post("/:surveyId/publish", async (req, res, next) => {
    try {
      const survey = await prisma.survey.findUnique({
        where: { id: req.params.surveyId },
        include: { questions: { include: { options: true } } },
      });
      const err = forbidIfNotAuthor(survey, req.user.id);
      if (err) return next(err);
      if (survey.status !== "DRAFT") return next(badRequest("Only DRAFT surveys can be published", "INVALID_STATUS"));
      if (survey.questions.length === 0) return next(badRequest("Survey must have at least one question", "EMPTY_SURVEY"));

      for (const q of survey.questions) {
        if ((q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && q.options.length === 0) {
          return next(badRequest("Choice questions must have options", "MISSING_OPTIONS"));
        }
      }

      const updated = await prisma.survey.update({
        where: { id: survey.id },
        data: { status: "PUBLISHED" },
      });
      res.status(200).json({ survey: updated });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:surveyId/close", async (req, res, next) => {
    try {
      const survey = await prisma.survey.findUnique({ where: { id: req.params.surveyId } });
      const err = forbidIfNotAuthor(survey, req.user.id);
      if (err) return next(err);
      if (survey.status !== "PUBLISHED") return next(badRequest("Only PUBLISHED surveys can be closed", "INVALID_STATUS"));

      const updated = await prisma.survey.update({
        where: { id: survey.id },
        data: { status: "CLOSED" },
      });
      res.status(200).json({ survey: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

