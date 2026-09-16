import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { CAREERS } from "../data/careers";
import { ELECTRICAL_QUESTIONS, getQuestions, getQuestionById, getDailyQuestion } from "../data/question-bank";
import { getEasternDate, isCalendarDate, questionNumberFromDate, streakFrom } from "../lib/daily";
import { readLocalProgress, progressStorageKey } from "../lib/browser-progress";
import { readAccountProgress, writeAccountProgress, type ProgressDatabase } from "../lib/progress-store";
import { gradeLocally } from "../lib/local-grader";
import { POST as grade } from "../app/api/grade/route";

test("Electrical has 365 distinct prompts, distinct model answers, and complete rubrics", () => {
  const bank = ELECTRICAL_QUESTIONS;
  assert.equal(bank.length, 365);
  assert.equal(new Set(bank.map((q) => q.id)).size, 365);
  assert.equal(new Set(bank.map((q) => q.question.toLowerCase().replace(/[^a-z0-9]/g, ""))).size, 365);
  assert.equal(new Set(bank.map((q) => q.ideal)).size, 365, "No generic prompt variants sharing a model answer");
  assert.equal(new Set(bank.map((q) => q.category)).size, 13);
  assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 365 }, (_, i) => i + 1));
  for (const q of bank) {
    assert.ok(q.rubric.required.length >= 3, `Missing rubric for ${q.id}`);
    assert.ok(q.ideal.length <= 900);
    assert.ok(gradeLocally(q, q.ideal).score >= 8, `Reference answer rejected: ${q.id}`);
    assert.ok(gradeLocally(q, "asdf qwrty zxcv asdf qwrty zxcv").score < 3);
  }
});

test("Question IDs are resolved within the selected career; Hardware stays compatible", () => {
  assert.equal(getQuestions("hardware").length, 365);
  assert.match(getQuestionById(1)!.question, /combinational logic/);
  assert.match(getQuestionById(1, "electrical")!.question, /voltmeter/);
  assert.equal(getQuestionById(366, "electrical"), undefined);
});

test("Each career cycles through a complete year without repeating a question", () => {
  for (const career of CAREERS) {
    const seen = new Set();
    for (let i = 0; i < 365; i++) {
      const date = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);
      assert.equal(questionNumberFromDate(date), i + 1);
      seen.add(getDailyQuestion(career.id, date).id);
    }
    assert.equal(seen.size, 365);
    assert.equal(getDailyQuestion(career.id, "2027-09-01").id, 1);
  }
});

test("Eastern midnight, DST transitions, leap dates, and streaks use calendar days", () => {
  assert.equal(getEasternDate(new Date("2026-09-16T03:59:59Z")), "2026-09-15");
  assert.equal(getEasternDate(new Date("2026-09-16T04:00:00Z")), "2026-09-16");
  assert.equal(getEasternDate(new Date("2026-12-16T04:59:59Z")), "2026-12-15");
  assert.equal(getEasternDate(new Date("2026-12-16T05:00:00Z")), "2026-12-16");
  assert.equal(getEasternDate(new Date("2026-11-01T05:30:00Z")), getEasternDate(new Date("2026-11-01T06:30:00Z")));
  assert.equal(getEasternDate(new Date("2027-03-14T06:59:59Z")), getEasternDate(new Date("2027-03-14T07:00:00Z")));
  assert.equal(isCalendarDate("2028-02-29"), true);
  assert.equal(isCalendarDate("2027-02-29"), false);
  assert.equal(questionNumberFromDate("2028-03-01") - questionNumberFromDate("2028-02-28"), 2);
  assert.equal(streakFrom(["2026-09-15", "2026-09-14"], "2026-09-16"), 2);
  assert.equal(streakFrom(["2026-09-14"], "2026-09-16"), 0);
});

test("Browser progress separates careers and accounts while preserving legacy Hardware guest results", () => {
  const result = gradeLocally(getQuestionById(1)!, getQuestionById(1)!.ideal);
  const old = JSON.stringify({ date: "2026-09-16", answer: "hardware answer", result, completedDates: ["2026-09-16", "2026-09-16"] });
  const values = new Map([["interviewdle", old]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null };
  assert.deepEqual(readLocalProgress(storage, "hardware", null).completedDates, ["2026-09-16"]);
  assert.deepEqual(readLocalProgress(storage, "electrical", null).completedDates, []);
  assert.deepEqual(readLocalProgress(storage, "hardware", "user_A").completedDates, []);
  values.set(progressStorageKey("electrical", "user_A"), old);
  assert.equal(readLocalProgress(storage, "electrical", "user_A").answer, "hardware answer");
  assert.deepEqual(readLocalProgress(storage, "electrical", "user_B").completedDates, []);
  values.set(progressStorageKey("electrical", null), "broken json");
  assert.deepEqual(readLocalProgress(storage, "electrical", null).completedDates, []);
  assert.deepEqual(readLocalProgress({ getItem: () => { throw new Error("blocked"); } }, "electrical", null).completedDates, []);
});

test("Account storage preserves legacy Hardware, creates Electrical storage, and upserts each career independently", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE progress (user_id TEXT, question_date TEXT, answer TEXT, score_tenths INTEGER,
    result_label TEXT, hits_json TEXT, misses_json TEXT, created_at TEXT, UNIQUE(user_id, question_date))`);
  const adapter: ProgressDatabase = {
    prepare(sql) {
      return { bind(...values) {
        const statement = db.prepare(sql);
        const parameters = values as (string | number | null)[];
        return {
          first: async () => statement.get(...parameters) ?? null,
          all: async () => ({ results: statement.all(...parameters) }),
          run: async () => statement.run(...parameters),
        };
      } };
    },
  };
  try {
    const date = "2026-09-16";
    const hardware = getDailyQuestion("hardware", date), electrical = getDailyQuestion("electrical", date);
    await writeAccountProgress(adapter, "user_A", "hardware", date, hardware.ideal, gradeLocally(hardware, hardware.ideal));
    await writeAccountProgress(adapter, "user_A", "electrical", date, electrical.ideal, gradeLocally(electrical, electrical.ideal));
    const hw = await readAccountProgress(adapter, "user_A", "hardware");
    const ee = await readAccountProgress(adapter, "user_A", "electrical");
    assert.equal(hw.latest?.answer, hardware.ideal);
    assert.equal(ee.latest?.answer, electrical.ideal);
    assert.equal(hw.played, 1); assert.equal(ee.played, 1);
    await writeAccountProgress(adapter, "user_A", "electrical", date, "new attempt", gradeLocally(electrical, "new attempt"));
    assert.equal((await readAccountProgress(adapter, "user_A", "electrical")).played, 1);
    assert.equal((await readAccountProgress(adapter, "user_A", "hardware")).latest?.answer, hardware.ideal);
    assert.equal((await readAccountProgress(adapter, "user_B", "electrical")).played, 0);
  } finally { db.close(); }
});

test("Grading endpoint selects the correct rubric and works without outbound AI calls", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("No external requests permitted"); };
  try {
    const send = (body: unknown) => grade(new NextRequest("http://localhost/api/grade", { method: "POST", body: JSON.stringify(body) }));
    const q = getQuestionById(1, "electrical")!;
    const response = await send({ career: "electrical", questionId: 1, answer: q.ideal });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), gradeLocally(q, q.ideal));
    const hardware = getQuestionById(1)!;
    assert.equal((await send({ questionId: 1, answer: hardware.ideal })).status, 200);
    for (const body of [null, {}, { career: "unknown", questionId: 1, answer: q.ideal }, { career: "electrical", questionId: 999, answer: q.ideal }, { career: "electrical", questionId: 1, answer: "x".repeat(901) }]) {
      assert.equal((await send(body)).status, 400);
    }
    const paraphrase = "A voltmeter uses a high impedance input so only a small current flows into it. This keeps loading small and avoids changing the voltage being measured.";
    assert.ok(gradeLocally(q, paraphrase).score >= 7);
  } finally { globalThis.fetch = originalFetch; }
});
