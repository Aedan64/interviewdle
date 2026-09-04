import { NextRequest, NextResponse } from "next/server";

type GradeRequest = {
  question: string;
  answer: string;
  idealAnswer: string;
  category: string;
};

type GradeResult = {
  score: number;
  label:
    | "Interview Ready"
    | "Strong"
    | "Needs More Depth"
    | "Weak"
    | "Off Track";
  verdict: string;
  strengths: string[];
  improvements: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GradeRequest;

    const { question, answer, idealAnswer, category } = body;

    if (!question || !answer || !idealAnswer) {
      return NextResponse.json(
        { error: "Missing grading information" },
        { status: 400 }
      );
    }

    const clean = answer.trim();

    if (clean.length < 12) {
      return NextResponse.json({
        score: 1,
        label: "Off Track",
        verdict:
          "This answer is too short to demonstrate meaningful understanding in an interview.",
        strengths: [],
        improvements: [
          "Give a complete explanation of the concept.",
          "Explain your reasoning instead of only naming terms.",
        ],
      } satisfies GradeResult);
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const gradingPrompt = `
You are a senior technical interviewer evaluating a candidate's spoken interview response.

ROLE AREA:
${category}

QUESTION:
${question}

REFERENCE ANSWER:
${idealAnswer}

CANDIDATE ANSWER:
${answer}

Grade this the way a real technical interviewer would.

Do NOT reward keyword stuffing.

Penalize:
- gibberish
- irrelevant answers
- confident technical inaccuracies
- contradictions
- vague filler
- keyword lists without explanation
- answers that mention the right terms but do not show understanding

Reward:
- technical correctness
- directly answering the question
- clear explanation
- actual understanding
- concise professional communication
- useful technical detail when appropriate

Use this approximate weighting:

Technical correctness: 40%
Directness and relevance: 25%
Depth of understanding: 20%
Communication and clarity: 15%

Score interpretation:

9.0-10.0 = Interview Ready
7.0-8.9 = Strong
5.0-6.9 = Needs More Depth
3.0-4.9 = Weak
0.0-2.9 = Off Track

The verdict should sound like feedback from an interviewer.

Do not generate a follow-up question.

Strengths and improvements should each contain at most 3 short items.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: gradingPrompt,
        text: {
          format: {
            type: "json_schema",
            name: "interview_grade",
            strict: true,
            schema: {
              type: "object",
              properties: {
                score: {
                  type: "number",
                  minimum: 0,
                  maximum: 10,
                },
                label: {
                  type: "string",
                  enum: [
                    "Interview Ready",
                    "Strong",
                    "Needs More Depth",
                    "Weak",
                    "Off Track",
                  ],
                },
                verdict: {
                  type: "string",
                },
                strengths: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  maxItems: 3,
                },
                improvements: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  maxItems: 3,
                },
              },
              required: [
                "score",
                "label",
                "verdict",
                "strengths",
                "improvements",
              ],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error("OpenAI grading error:", errorText);

      return NextResponse.json(
        { error: "Grading service failed" },
        { status: 500 }
      );
    }

    const data = await response.json();

    const outputText =
      data.output?.[0]?.content?.find(
        (item: { type?: string; text?: string }) =>
          item.type === "output_text"
      )?.text;

    if (!outputText) {
      throw new Error("No grading response returned");
    }

    const grade = JSON.parse(outputText) as GradeResult;

    grade.score = Math.round(grade.score * 10) / 10;

    return NextResponse.json(grade);
  } catch (error) {
    console.error("Interview grader failed:", error);

    return NextResponse.json(
      { error: "Unable to grade response" },
      { status: 500 }
    );
  }
}
