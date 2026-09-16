import { NextRequest, NextResponse } from "next/server";
import { getQuestionById } from "@/data/question-bank";
import { DEFAULT_CAREER, isCareerId } from "@/data/careers";
import { gradeLocally } from "@/lib/local-grader";

type GradeRequest = {
  career?: unknown;
  questionId?: number;
  answer?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GradeRequest | null;
    if (!body || !isCareerId(body.career ?? DEFAULT_CAREER)) {
      return NextResponse.json({ error: "Invalid career" }, { status: 400 });
    }
    const career = body.career ?? DEFAULT_CAREER;
    if (!isCareerId(career)) return NextResponse.json({ error: "Invalid career" }, { status: 400 });
    const question = getQuestionById(Number(body.questionId), career);
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";

    if (!question || !answer || answer.length > 900) {
      return NextResponse.json({ error: "Invalid question or answer" }, { status: 400 });
    }

    return NextResponse.json(gradeLocally(question, answer));
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error("Local Interviewdle grader failed:", error);
    return NextResponse.json({ error: "Unable to grade response" }, { status: 500 });
  }
}
