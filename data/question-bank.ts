import { z } from "zod";
import { QUESTIONS, type InterviewQuestion } from "./questions";
import electricalBank from "./electrical-question-bank.json";
import electricalOverrides from "./electrical-question-overrides.json";
import { DEFAULT_CAREER, type CareerId } from "./careers";
import { questionNumberFromDate } from "../lib/daily";

const group = z.array(z.string().trim().min(1)).min(1);
const questionSchema = z.object({
  id: z.number().int().positive(),
  category: z.string().trim().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  question: z.string().trim().min(10),
  ideal: z.string().trim().min(20).max(900),
  rubric: z.object({
    required: z.array(group).min(1),
    optional: z.array(group),
    misconceptions: z.array(z.string().trim().min(1)).optional(),
    minimumWords: z.number().int().min(1).max(100).optional(),
  }),
});

const base = z.array(questionSchema).min(365).parse(electricalBank);
const overrides = z.record(questionSchema.omit({ id: true })).parse(electricalOverrides);
const ids = new Set(base.map((question) => question.id));
if (ids.size !== base.length || Object.keys(overrides).some((id) => !ids.has(Number(id)))) {
  throw new Error("Electrical questions need unique IDs and overrides must reference an existing ID.");
}

export const ELECTRICAL_QUESTIONS: InterviewQuestion[] = base.map((question) => ({
  ...question, ...overrides[String(question.id)], id: question.id,
}));

export function getQuestions(career: CareerId = DEFAULT_CAREER): InterviewQuestion[] {
  return career === "electrical" ? ELECTRICAL_QUESTIONS : QUESTIONS;
}

export function getQuestionById(id: number, career: CareerId = DEFAULT_CAREER) {
  return getQuestions(career).find((question) => question.id === id);
}

export function getDailyQuestion(career: CareerId, date: string) {
  const bank = getQuestions(career);
  return bank[(questionNumberFromDate(date) - 1) % bank.length];
}
