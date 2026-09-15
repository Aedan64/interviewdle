import assert from "node:assert/strict";
import { QUESTIONS } from "../data/questions";
import { gradeLocally } from "../lib/local-grader";

assert.equal(QUESTIONS.length, 365, "question bank must cover a full year");
assert.equal(new Set(QUESTIONS.map((question) => question.question)).size, 365, "questions must be unique");
const weakReferences = QUESTIONS
  .map((question) => ({ id: question.id, score: gradeLocally(question, question.ideal).score }))
  .filter((result) => result.score < 8);
assert.deepEqual(weakReferences, [], `reference answers failed: ${JSON.stringify(weakReferences)}`);

const first = QUESTIONS[0];
assert.ok(gradeLocally(first, first.ideal).score >= 9, "reference answer should be interview-ready");
assert.ok(
  gradeLocally(first, "Sequential circuits depend on the input and memory that stores previous state, while combinational circuits depend only on the current input.").score >= 7,
  "a concise correct answer should score strongly",
);
assert.ok(gradeLocally(first, "banana car window vacation sandwich highway because nothing").score <= 3, "irrelevant prose should fail");
assert.ok(gradeLocally(first, "asdf qwrty zxcv asdf qwrty zxcv").score <= 1.5, "gibberish should fail");
assert.ok(gradeLocally(first, "current input stored state flip-flop register clock").score < 7, "keyword dumping should not pass as strong");

console.log("Local grader checks passed for 365 unique questions.");
