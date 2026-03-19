import "dotenv/config";

process.env.JWT_SECRET ??= "test-secret";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/survey_api?schema=public";

