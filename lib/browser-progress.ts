import type { CareerId } from "../data/careers";
import { isCalendarDate } from "./daily";

export type SavedResult = {
  score: number; label: string; verdict: string;
  strengths: string[]; improvements: string[];
};

export type LocalProgress = {
  date?: string;
  answer?: string;
  result?: SavedResult;
  completedDates: string[];
};

type StorageReader = Pick<Storage, "getItem">;

export function progressStorageKey(career: CareerId, viewerId: string | null) {
  return `interviewdle:progress:${career}:${viewerId ?? "guest"}`;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function normalizeResult(value: unknown): SavedResult | undefined {
  if (!value || typeof value !== "object") return;
  const result = value as Record<string, unknown>;
  if (typeof result.score !== "number" || !Number.isFinite(result.score) || result.score < 0 || result.score > 10 || typeof result.label !== "string") return;
  return {
    score: result.score, label: result.label,
    verdict: typeof result.verdict === "string" ? result.verdict : "Review the concepts you covered and the suggestions below.",
    strengths: stringList(result.strengths ?? result.hits),
    improvements: stringList(result.improvements ?? result.misses),
  };
}

export function readLocalProgress(storage: StorageReader, career: CareerId, viewerId: string | null): LocalProgress {
  try {
    // Only the Hardware guest inherits the pre-track browser save. New tracks
    // and signed-in viewers never borrow another track's or account's result.
    const raw = storage.getItem(progressStorageKey(career, viewerId))
      ?? (career === "hardware" && !viewerId ? storage.getItem("interviewdle") : null);
    const data = JSON.parse(raw ?? "{}");
    if (!data || typeof data !== "object") return { completedDates: [] };
    const date = isCalendarDate(data.date) ? data.date : undefined;
    const result = normalizeResult(data.result);
    const dates = Array.isArray(data.completedDates) ? data.completedDates.filter(isCalendarDate) : date && result ? [date] : [];
    return { date, result, answer: typeof data.answer === "string" ? data.answer : "", completedDates: [...new Set<string>(dates)] };
  } catch {
    return { completedDates: [] };
  }
}
