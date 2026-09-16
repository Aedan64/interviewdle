import type { CareerId } from "../data/careers";
import type { GradeResult } from "./local-grader";

export type ProgressRow = {
  question_date: string;
  answer: string;
  score_tenths: number;
  result_label: string;
  hits_json: string;
  misses_json: string;
};

export interface ProgressDatabase {
  prepare(statement: string): {
    bind(...values: unknown[]): {
      first(): Promise<unknown>;
      all(): Promise<unknown>;
      run(): Promise<unknown>;
    };
  };
}

// Keep legacy Hardware rows intact. The new table uses SQL supported by both
// Postgres and D1 and is created on first Electrical use, without a manual migration.
const CREATE_TRACK_PROGRESS = `CREATE TABLE IF NOT EXISTS track_progress (
  user_id TEXT NOT NULL,
  career TEXT NOT NULL,
  question_date TEXT NOT NULL,
  answer TEXT NOT NULL,
  score_tenths INTEGER NOT NULL,
  result_label TEXT NOT NULL,
  hits_json TEXT NOT NULL DEFAULT '[]',
  misses_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, career, question_date)
)`;

async function scope(db: ProgressDatabase, id: string, career: CareerId) {
  if (career === "hardware") return { table: "progress", where: "user_id = ?", values: [id] };
  await db.prepare(CREATE_TRACK_PROGRESS).bind().run();
  return { table: "track_progress", where: "user_id = ? AND career = ?", values: [id, career] };
}

export async function readAccountProgress(db: ProgressDatabase, id: string, career: CareerId) {
  const { table, where, values } = await scope(db, id, career);
  const latest = await db.prepare(`SELECT question_date, answer, score_tenths, result_label, hits_json, misses_json FROM ${table} WHERE ${where} ORDER BY question_date DESC LIMIT 1`).bind(...values).first() as ProgressRow | null;
  const rows = await db.prepare(`SELECT question_date FROM ${table} WHERE ${where} ORDER BY question_date DESC`).bind(...values).all() as { results: { question_date: string }[] };
  const dates = rows.results.map((row) => row.question_date);
  return { career, latest, dates, played: dates.length };
}

export async function writeAccountProgress(db: ProgressDatabase, id: string, career: CareerId, date: string, answer: string, result: GradeResult) {
  const { table, values } = await scope(db, id, career);
  const columns = career === "hardware" ? "user_id" : "user_id, career";
  const conflict = `${columns}, question_date`;
  const fields = [...values, date, answer, Math.round(result.score * 10), result.label, JSON.stringify(result.strengths), JSON.stringify(result.improvements), new Date().toISOString()];
  await db.prepare(`INSERT INTO ${table} (${columns}, question_date, answer, score_tenths, result_label, hits_json, misses_json, created_at)
    VALUES (${fields.map(() => "?").join(", ")})
    ON CONFLICT (${conflict}) DO UPDATE SET answer = excluded.answer, score_tenths = excluded.score_tenths,
      result_label = excluded.result_label, hits_json = excluded.hits_json, misses_json = excluded.misses_json`).bind(...fields).run();
}
