import { DEFAULT_CAREER, isCareerId, type CareerId } from "../data/careers";
import { getEasternDate } from "./daily";

const EVENT = "interviewdle-career-change";
export function getSelectedCareer(): CareerId {
  if (typeof window === "undefined") return DEFAULT_CAREER;
  const linkCareer = new URL(window.location.href).searchParams.get("track");
  if (isCareerId(linkCareer)) return linkCareer;
  try {
    const saved = localStorage.getItem("interviewdle-career");
    return isCareerId(saved) ? saved : DEFAULT_CAREER;
  } catch { return DEFAULT_CAREER; }
}

export function selectCareer(career: CareerId) {
  try { localStorage.setItem("interviewdle-career", career); } catch { /* A tab still works if storage is disabled. */ }
  const url = new URL(window.location.href);
  url.searchParams.set("track", career);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeCareer(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Re-read on focus and at Eastern midnight, including after a sleeping tab wakes. */
export function subscribeEasternDate(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    onChange();
    const now = Date.now();
    const day = getEasternDate(new Date(now));
    // Binary search for the next calendar boundary; DST days can be 23 or 25 hours.
    let low = now, high = now + 26 * 60 * 60 * 1000;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (getEasternDate(new Date(middle)) === day) low = middle;
      else high = middle;
    }
    clearTimeout(timer);
    timer = setTimeout(schedule, high - now + 50);
  };
  schedule();
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", schedule);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", schedule);
    document.removeEventListener("visibilitychange", schedule);
  };
}
