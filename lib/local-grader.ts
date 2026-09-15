import type { InterviewQuestion } from "@/data/questions";

export type GradeResult = {
  score: number;
  label: "Interview Ready" | "Strong" | "Needs More Depth" | "Weak" | "Off Track";
  verdict: string;
  strengths: string[];
  improvements: string[];
};

const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "what", "when", "where", "which", "while", "with", "would"]);
const EXPLANATION_WORDS = new Set(["because", "depends", "means", "therefore", "so", "while", "whereas", "which", "when", "allows", "causes", "prevents", "uses", "instead", "compared", "but"]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+<>=/^ ]/g, " ").replace(/\s+/g, " ").trim();
}

function stem(word: string) {
  if (word.length <= 4) return word;
  return word.replace(/(ingly|edly|ation|ments|ment|ing|ied|ies|ed|es|s)$/i, "");
}

function words(value: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function contentWords(value: string) {
  return words(value).filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function phraseMatches(answer: string, phrase: string) {
  const normalizedAnswer = normalize(answer);
  const normalizedPhrase = normalize(phrase);
  if (normalizedAnswer.includes(normalizedPhrase)) return true;
  const answerStems = new Set(contentWords(answer).map(stem));
  const phraseStems = contentWords(phrase).map(stem);
  return phraseStems.length > 0 && phraseStems.every((item) => answerStems.has(item));
}

function conceptMatches(answer: string, alternatives: string[]) {
  return alternatives.some((phrase) => phraseMatches(answer, phrase));
}

function friendlyConcept(group: string[]) {
  return group[0].replace(/\b[a-z]/, (letter) => letter.toUpperCase()).replace(/\bv=ir\b/i, "V = IR");
}

function labelFor(score: number): GradeResult["label"] {
  if (score >= 9) return "Interview Ready";
  if (score >= 7) return "Strong";
  if (score >= 5) return "Needs More Depth";
  if (score >= 3) return "Weak";
  return "Off Track";
}

export function gradeLocally(question: InterviewQuestion, rawAnswer: string): GradeResult {
  const answer = rawAnswer.trim().slice(0, 900);
  const answerWords = words(answer);
  const answerContent = contentWords(answer);
  const uniqueRatio = new Set(answerWords).size / Math.max(1, answerWords.length);
  const alphaRatio = (answer.match(/[a-z]/gi)?.length ?? 0) / Math.max(1, answer.length);
  const vowelRatio = (answer.match(/[aeiou]/gi)?.length ?? 0) / Math.max(1, answer.match(/[a-z]/gi)?.length ?? 1);
  const repeatedRun = /\b(\w+)\b(?:\s+\1\b){2,}/i.test(answer);

  const requiredHits = question.rubric.required.map((group) => conceptMatches(answer, group));
  const optionalHits = question.rubric.optional.map((group) => conceptMatches(answer, group));
  const requiredCount = requiredHits.filter(Boolean).length;
  const optionalCount = optionalHits.filter(Boolean).length;
  const requiredCoverage = requiredCount / Math.max(1, requiredHits.length);
  const optionalCoverage = optionalCount / Math.max(1, optionalHits.length);

  const referenceVocabulary = new Set(contentWords(`${question.question} ${question.ideal} ${question.rubric.required.flat().join(" ")}`).map(stem));
  const idealVocabulary = new Set(contentWords(question.ideal).map(stem));
  const answerVocabulary = new Set(answerContent.map(stem));
  const referenceSimilarity = [...idealVocabulary].filter((word) => answerVocabulary.has(word)).length / Math.max(1, idealVocabulary.size);
  const semanticCoverage = referenceSimilarity >= 0.72 ? Math.max(requiredCoverage, 0.92) : requiredCoverage;
  const relevantWords = answerContent.filter((word) => referenceVocabulary.has(stem(word))).length;
  const relevance = Math.min(1, relevantWords / Math.max(3, Math.min(10, answerContent.length * 0.35)));
  const explanationCount = answerWords.filter((word) => EXPLANATION_WORDS.has(word)).length;
  const looksLikeKeywordList = requiredCount >= 2 && explanationCount === 0 && !/[.!?]/.test(answer) && answerWords.length < requiredCount * 7;
  const gibberish = alphaRatio < 0.58 || vowelRatio < 0.18 || vowelRatio > 0.72 || repeatedRun || (answerWords.length >= 8 && uniqueRatio < 0.42);
  const misconceptionHits = (question.rubric.misconceptions ?? []).filter((phrase) => phraseMatches(answer, phrase));

  if (answerWords.length < (question.rubric.minimumWords ?? 10) || gibberish) {
    return {
      score: gibberish ? 0.5 : 1.5,
      label: "Off Track",
      verdict: gibberish ? "This response does not read as a meaningful technical explanation yet." : "This response is too short to demonstrate your understanding to an interviewer.",
      strengths: [],
      improvements: ["Answer in complete, understandable sentences.", `Explain ${friendlyConcept(question.rubric.required[0]).toLowerCase()}.`],
    };
  }

  let communication = 0.45;
  if (answerWords.length >= 18) communication += 0.35;
  if (explanationCount > 0) communication += 0.4;
  if (answerWords.length >= 25 && answerWords.length <= 140) communication += 0.2;
  if (uniqueRatio > 0.62) communication += 0.1;
  communication = Math.min(1.5, communication);

  let score = semanticCoverage * 7.4 + optionalCoverage * 0.4 + relevance * 1.1 + communication;
  score -= misconceptionHits.length * 2.2;
  if (looksLikeKeywordList) score -= 2;
  if (semanticCoverage === 0) score = Math.min(score, 2.5);
  if (semanticCoverage < 0.34) score = Math.min(score, 4.5);
  if (relevance < 0.2) score = Math.min(score, 3);
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  const label = labelFor(score);
  const strengths = question.rubric.required.filter((_, index) => requiredHits[index]).slice(0, 3).map((group) => `Correctly addressed ${friendlyConcept(group).toLowerCase()}.`);
  if (strengths.length < 3 && explanationCount > 0 && requiredCoverage >= 0.5) strengths.push("Explained the ideas instead of only listing terms.");

  const improvements = question.rubric.required.filter((_, index) => !requiredHits[index]).slice(0, 3).map((group) => `Explain ${friendlyConcept(group).toLowerCase()}.`);
  if (misconceptionHits.length > 0) improvements.unshift("Correct the technical misconception in your explanation.");
  if (looksLikeKeywordList) improvements.unshift("Connect the terms and explain how they relate.");
  if (improvements.length === 0 && optionalHits.some((hit) => !hit)) {
    const nextOptional = question.rubric.optional.find((_, index) => !optionalHits[index]);
    if (nextOptional) improvements.push(`For extra depth, mention ${friendlyConcept(nextOptional).toLowerCase()}.`);
  }
  if (improvements.length === 0) improvements.push("Keep this same structure and confidence in the interview.");

  const verdict = label === "Interview Ready"
    ? "Technically complete, relevant, and clearly explained. This would be a strong interview response."
    : label === "Strong"
      ? "You showed solid understanding. Adding the missing detail would make the response interview-ready."
      : label === "Needs More Depth"
        ? "You have the core direction, but an interviewer would want a more complete technical explanation."
        : label === "Weak"
          ? "Some relevant ideas are present, but the response misses important technical points."
          : "The response does not yet demonstrate the concepts the interviewer asked about.";

  return { score, label, verdict, strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3) };
}
