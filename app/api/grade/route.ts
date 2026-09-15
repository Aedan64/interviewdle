import { NextRequest, NextResponse } from "next/server";
import { getQuestionById } from "@/data/questions";
import { gradeLocally } from "@/lib/local-grader";

type GradeRequest = {
  questionId?: number;
  answer?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GradeRequest;
    const question = getQuestionById(Number(body.questionId));
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";

    if (!question || !answer) {
      return NextResponse.json({ error: "Invalid question or answer" }, { status: 400 });
    }

    return NextResponse.json(gradeLocally(question, answer));
  } catch (error) {
    console.error("Local Interviewdle grader failed:", error);
    return NextResponse.json({ error: "Unable to grade response" }, { status: 500 });
  }
}
