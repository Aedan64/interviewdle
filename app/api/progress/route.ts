import { createRemoteJWKSet, jwtVerify } from "jose";
import { getDatabase } from "interviewdle-db-runtime";
import { DEFAULT_CAREER, isCareerId } from "@/data/careers";
import { getDailyQuestion } from "@/data/question-bank";
import { isCalendarDate } from "@/lib/daily";
import { gradeLocally } from "@/lib/local-grader";
import { readAccountProgress, writeAccountProgress } from "@/lib/progress-store";

const issuer = process.env.CLERK_ISSUER_URL ?? "https://immense-parrot-301.clerk.accounts.dev";
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
  const career = new URL(request.url).searchParams.get("career") ?? DEFAULT_CAREER;
  if (!isCareerId(career)) return Response.json({ error: "Invalid career" }, { status: 400 });
  try {
    const progress = await readAccountProgress(getDatabase(), id, career);
    return Response.json(progress, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load career progress:", error);
    return Response.json({ error: "Account progress is temporarily unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { career?: unknown; date?: unknown; answer?: unknown; questionId?: unknown } | null;
    const career = body?.career ?? DEFAULT_CAREER;
    if (!body || !isCareerId(career) || !isCalendarDate(body.date) || typeof body.answer !== "string" || !body.answer.trim() || body.answer.length > 900) {
      return Response.json({ error: "Invalid result" }, { status: 400 });
    }
    const question = getDailyQuestion(career, body.date);
    if (body.questionId !== undefined && body.questionId !== question.id) {
      return Response.json({ error: "The question does not match this career and date" }, { status: 400 });
    }
    const answer = body.answer.trim();
    // Save the same local rubric result, never a client-supplied score.
    await writeAccountProgress(getDatabase(), id, career, body.date, answer, gradeLocally(question, answer));
    return Response.json({ saved: true, career });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
    console.error("Unable to save career progress:", error);
    return Response.json({ error: "Account progress is temporarily unavailable" }, { status: 503 });
  }
}
