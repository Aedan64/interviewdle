import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";

const issuer = "https://immense-parrot-301.clerk.accounts.dev";
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

async function userId(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const row = await env.DB.prepare("SELECT question_date, answer, score_tenths, result_label, hits_json, misses_json FROM progress WHERE user_id = ? ORDER BY question_date DESC LIMIT 1").bind(id).first();
  const dates = await env.DB.prepare("SELECT question_date FROM progress WHERE user_id = ? ORDER BY question_date DESC LIMIT 400").bind(id).all<{ question_date: string }>();
  return Response.json({ latest: row, dates: dates.results.map((item) => item.question_date), played: dates.results.length });
}

export async function POST(request: Request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { date?: string; answer?: string; score?: number; label?: string; hits?: string[]; misses?: string[] };
  if (!body.date || !body.answer || typeof body.score !== "number" || !body.label) return Response.json({ error: "Invalid result" }, { status: 400 });
  await env.DB.prepare("INSERT INTO progress (user_id, question_date, answer, score_tenths, result_label, hits_json, misses_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, question_date) DO UPDATE SET answer = excluded.answer, score_tenths = excluded.score_tenths, result_label = excluded.result_label, hits_json = excluded.hits_json, misses_json = excluded.misses_json")
    .bind(id, body.date, body.answer.slice(0,900), Math.round(body.score*10), body.label, JSON.stringify(body.hits ?? []), JSON.stringify(body.misses ?? []), new Date().toISOString()).run();
  return Response.json({ saved: true });
}
