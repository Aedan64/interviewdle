export const CAREERS = [
  { id: "hardware", label: "Computer Hardware Engineering", shortLabel: "Hardware Engineering" },
  { id: "electrical", label: "Electrical Engineering", shortLabel: "Electrical Engineering" },
] as const;

export type CareerId = (typeof CAREERS)[number]["id"];
export const DEFAULT_CAREER: CareerId = "hardware";

export function isCareerId(value: unknown): value is CareerId {
  return CAREERS.some((career) => career.id === value);
}

export function careerLabel(career: CareerId) {
  return CAREERS.find((item) => item.id === career)!.label;
}
