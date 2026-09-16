"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Download, Flame, Mail, Moon, RotateCcw, Share2, Sparkles, Sun, Target, Trophy } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/clerk-react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CAREERS, DEFAULT_CAREER, careerLabel, type CareerId } from "@/data/careers";
import { getDailyQuestion } from "@/data/question-bank";
import { getEasternDate, questionNumberFromDate, streakFrom, isCalendarDate } from "@/lib/daily";
import { getSelectedCareer, selectCareer, subscribeCareer, subscribeEasternDate } from "@/lib/browser-career";
import { normalizeResult, progressStorageKey, readLocalProgress, type SavedResult } from "@/lib/browser-progress";
import type { ProgressRow } from "@/lib/progress-store";

type Result = SavedResult;
type Theme = "light" | "dark";
type ShareFormat = "story" | "wide";
const serverCareer = () => DEFAULT_CAREER;
const serverDate = () => "";

export default function Home() {
  const { isLoaded, userId } = useAuth();
  const career = useSyncExternalStore(subscribeCareer, getSelectedCareer, serverCareer);
  const today = useSyncExternalStore(subscribeEasternDate, getEasternDate, serverDate);
  if (!today || !isLoaded) return <main className="shell" aria-busy="true"><p>Loading today’s interview…</p></main>;
  // Remounting isolates drafts, delayed responses, results and share cards when
  // the track, calendar day, or signed-in person changes.
  return <InterviewGame key={`${career}:${today}:${userId ?? "guest"}`} career={career} today={today} viewerId={userId ?? null} />;
}

function InterviewGame({ career, today, viewerId }: { career: CareerId; today: string; viewerId: string | null }) {
  const { isSignedIn, getToken } = useAuth();
  const careerName = careerLabel(career);
  const [initial] = useState(() => {
    try { return readLocalProgress(localStorage, career, viewerId); }
    catch { return { completedDates: [] } as ReturnType<typeof readLocalProgress>; }
  });
  const [answer, setAnswer] = useState(initial.date === today ? initial.answer ?? "" : "");
  const [result, setResult] = useState<Result | null>(initial.date === today ? initial.result ?? null : null);
  const [rewrite, setRewrite] = useState(false);
  const [grading, setGrading] = useState(false);
  const [syncing, setSyncing] = useState(Boolean(isSignedIn));
  const [notice, setNotice] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>("story");
  const [completedDates, setCompletedDates] = useState(initial.completedDates);
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem("interviewdle-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const attemptVersion = useRef(0);
  const submitting = useRef(false);
  const number = questionNumberFromDate(today);
  const q = getDailyQuestion(career, today);
  const streak = streakFrom(completedDates, today);
  const played = completedDates.length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("interviewdle-theme", theme); } catch { /* Theme still works for this visit. */ }
  }, [theme]);

  useEffect(() => {
    if (!isSignedIn) return;
    const abort = new AbortController();
    let cancelled = false;
    const startingAttempt = attemptVersion.current;
    void (async () => {
      try {
        const token = await getToken();
        if (cancelled) return;
        const response = await fetch(`/api/progress?career=${career}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: abort.signal,
        });
        if (!response.ok) throw new Error("Progress sync failed");
        const data = await response.json() as { dates?: unknown; latest?: ProgressRow | null };
        if (cancelled || attemptVersion.current !== startingAttempt) return;
        const dates = Array.isArray(data.dates) ? data.dates.filter(isCalendarDate) : [];
        setCompletedDates((current) => [...new Set([...current, ...dates])]);
        const latest = data.latest;
        if (latest?.question_date === today) {
          const saved = normalizeResult({
            score: latest.score_tenths / 10, label: latest.result_label,
            strengths: JSON.parse(latest.hits_json || "[]"),
            improvements: JSON.parse(latest.misses_json || "[]"),
          });
          if (saved) { setAnswer(latest.answer); setResult(saved); }
        }
      } catch {
        if (!cancelled) setNotice("Couldn’t sync account history. You can still practice on this device.");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => { cancelled = true; abort.abort(); };
  }, [isSignedIn, getToken, career, today]);

  async function saveProgress(clean: string, savedOnDevice: boolean) {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ career, questionId: q.id, date: today, answer: clean }),
      });
      if (!response.ok) throw new Error("Save failed");
    } catch {
      setNotice(savedOnDevice
        ? "Your result is saved on this device, but account sync failed."
        : "Your result could not be saved. Keep this page open to review it.");
    }
  }

  async function submit() {
    const clean = answer.trim();
    if (clean.length < 18 || submitting.current || syncing) return;
    if (getEasternDate() !== today) { setNotice("A new daily question is ready. Refresh to start it."); return; }
    const signals = ["in conclusion", "it is important to note", "furthermore", "plays a crucial role"];
    if ((clean.length > 420 || signals.filter((signal) => clean.toLowerCase().includes(signal)).length >= 2) && !rewrite) {
      setRewrite(true);
      return;
    }
    submitting.current = true;
    attemptVersion.current++;
    setGrading(true);
    setNotice("");
    try {
      const response = await fetch("/api/grade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ career, questionId: q.id, answer: clean }),
      });
      if (!response.ok) throw new Error("Grading failed");
      const next = normalizeResult(await response.json());
      if (!next) throw new Error("Invalid grade");
      const dates = [...new Set([today, ...completedDates])];
      setCompletedDates(dates);
      setResult(next);
      setRewrite(false);
      let savedOnDevice = false;
      try {
        localStorage.setItem(progressStorageKey(career, viewerId), JSON.stringify({
          date: today, questionId: q.id, answer: clean, result: next, completedDates: dates,
        }));
        savedOnDevice = true;
      } catch { setNotice("Your browser couldn’t save this result on this device."); }
      void saveProgress(clean, savedOnDevice);
    } catch {
      setNotice("We couldn’t grade your answer right now. Please try again.");
    } finally {
      submitting.current = false;
      setGrading(false);
    }
  }

  /* =========================
     SHARE IMAGE
  ========================= */

  function createShareCanvas() {
    if (!result) return null;

    const isStory =
      shareFormat === "story";

    const width = isStory ? 1080 : 1600;
    const height = isStory ? 1920 : 900;

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return null;

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        width,
        height
      );

    gradient.addColorStop(
      0,
      "#172019"
    );

    gradient.addColorStop(
      1,
      "#263329"
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    ctx.fillStyle =
      "rgba(223,243,107,0.10)";

    ctx.beginPath();

    ctx.arc(
      width * 0.86,
      height * 0.12,
      width * 0.3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    const left = isStory
      ? 90
      : 110;

    ctx.fillStyle = "#dff36b";

    ctx.font =
      `800 ${isStory ? 34 : 30}px Arial`;

    ctx.fillText(
      "INTERVIEWDLE",
      left,
      isStory ? 180 : 105
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.70)";

    ctx.font =
      `${isStory ? 30 : 26}px Arial`;

    ctx.fillText(
      `Interviewdle #${String(
        number
      ).padStart(3, "0")}`,
      left,
      isStory ? 270 : 175
    );

    ctx.fillStyle = "#ffffff";

    ctx.font =
      `700 ${isStory ? 210 : 150}px Arial`;

    const scoreText =
      String(result.score);

    ctx.fillText(
      scoreText,
      left,
      isStory ? 650 : 425
    );

    const scoreWidth =
      ctx.measureText(scoreText).width;

    ctx.fillStyle =
      "rgba(255,255,255,0.60)";

    ctx.font =
      `${isStory ? 58 : 44}px Arial`;

    ctx.fillText(
      "/10",
      left + scoreWidth + 20,
      isStory ? 650 : 425
    );

    ctx.fillStyle = "#ffffff";

    ctx.font =
      `700 ${isStory ? 70 : 50}px Georgia`;

    ctx.fillText(
      result.label,
      left,
      isStory ? 760 : 515
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.85)";

    ctx.font =
      `${isStory ? 34 : 28}px Arial`;

    ctx.fillText(careerName, left, isStory ? 825 : 565);

    ctx.fillText(
      q.category,
      left,
      isStory ? 880 : 610
    );

    ctx.fillText(
      `${streak} day streak`,
      left,
      isStory ? 940 : 660
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.60)";

    ctx.font =
      `${isStory ? 30 : 24}px Arial`;

    ctx.fillText(
      "One question. Every day. A better answer each time.",
      left,
      height -
        (isStory ? 140 : 75)
    );

    return canvas;
  }

  function downloadShareImage() {
    const canvas =
      createShareCanvas();

    if (!canvas) return;

    const link =
      document.createElement("a");

    link.download =
      `interviewdle-${career}-${String(
        number
      ).padStart(
        3,
        "0"
      )}-${shareFormat}.png`;

    link.href =
      canvas.toDataURL("image/png");

    link.click();
  }

  /* =========================
     NATIVE SHARE
  ========================= */

  async function shareResult() {
    if (!result) return;

    const text =
      `I scored ${result.score}/10 on Interviewdle ` +
      `#${String(number).padStart(3, "0")} — ${result.label}. ` +
      `${careerName}. ${streak} day streak.`;

    const canonicalUrl =
      `https://interviewdle.com/?track=${career}`;

    const canvas =
      createShareCanvas();

    if (
      canvas &&
      navigator.share
    ) {
      try {
        const blob =
          await new Promise<Blob | null>(
            (resolve) =>
              canvas.toBlob(
                resolve,
                "image/png"
              )
          );

        if (blob) {
          const file =
            new File(
              [blob],
              `interviewdle-${career}-${number}.png`,
              {
                type: "image/png",
              }
            );

          if (
            navigator.canShare &&
            navigator.canShare({
              files: [file],
            })
          ) {
            await navigator.share({
              title:
                "My Interviewdle Result",
              text,
              url: canonicalUrl,
              files: [file],
            });

            return;
          }
        }

        await navigator.share({
          title:
            "My Interviewdle Result",
          text,
          url: canonicalUrl,
        });

        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${text} ${canonicalUrl}`
      );

      alert(
        "Result copied to clipboard!"
      );
    } catch {
      alert(
        "Could not open sharing on this device."
      );
    }
  }

  /* =========================
     SHARE TO X
  ========================= */

  function shareToX() {
    if (!result) return;

    const text =
      encodeURIComponent(
        `I scored ${result.score}/10 on Interviewdle ` +
          `#${String(number).padStart(
            3,
            "0"
          )} — ${result.label}. ` +
          `${careerName}. ${streak} day streak.`
      );

    const url =
      encodeURIComponent(
        `https://interviewdle.com/?track=${career}`
      );

    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =========================
     EMAIL
  ========================= */

  function emailResult() {
    if (!result) return;

    const subject =
      encodeURIComponent(
        `My Interviewdle #${String(
          number
        ).padStart(
          3,
          "0"
        )} Result`
      );

    const body =
      encodeURIComponent(
        `I scored ${result.score}/10 on Interviewdle ` +
          `#${String(number).padStart(
            3,
            "0"
          )} — ${result.label}.\n\n` +
          `${careerName}\n${streak} day streak\n` +
          `${q.category}\n\n` +
          `Try Interviewdle:\nhttps://interviewdle.com/?track=${career}`
      );

    window.location.href =
      `mailto:?subject=${subject}&body=${body}`;
  }

  /* =========================
     REPLAY
  ========================= */

  function replayDemo() {
    setAnswer("");
    setResult(null);
    setRewrite(false);
    setShareOpen(false);
  }

  /* =========================
     UI
  ========================= */

  return (
    <main className="min-h-screen">
      <SpeedInsights />

      <header className="topbar">
        <div className="brand">
          <span
            className="brand-mark"
            aria-hidden="true"
          >
            <Sun size={19} />
          </span>

          <span>INTERVIEWDLE</span>
        </div>

        <div className="header-stats">
          <span>
            <Flame size={18} />
            {streak} day streak
          </span>

          <span className="desktop-only">
            <Trophy size={17} />
            {played} completed
          </span>

          <div
            className="theme-picker"
            role="group"
            aria-label="Color theme"
          >
            <button
              className={
                theme === "light"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTheme("light")
              }
              aria-label="Use light theme"
              title="Light theme"
            >
              <Sun size={16} />
            </button>

            <button
              className={
                theme === "dark"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTheme("dark")
              }
              aria-label="Use dark theme"
              title="Dark theme"
            >
              <Moon size={16} />
            </button>
          </div>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="sign-in">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <div className="shell">
        <section className="career-row">
          <div>
            <p className="eyebrow">
              YOUR CAREER
            </p>

            <div className="career-tabs" role="tablist" aria-label="Engineering career">
              {CAREERS.map((item, index) => (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  role="tab"
                  type="button"
                  aria-selected={career === item.id}
                  aria-controls="daily-interview-panel"
                  tabIndex={career === item.id ? 0 : -1}
                  onClick={() => selectCareer(item.id)}
                  onKeyDown={(event) => {
                    const next = event.key === "Home" ? 0 : event.key === "End" ? CAREERS.length - 1
                      : event.key === "ArrowRight" ? (index + 1) % CAREERS.length
                        : event.key === "ArrowLeft" ? (index + CAREERS.length - 1) % CAREERS.length : null;
                    if (next === null) return;
                    event.preventDefault();
                    selectCareer(CAREERS[next].id);
                    requestAnimationFrame(() => document.getElementById(`tab-${CAREERS[next].id}`)?.focus());
                  }}
                >
                  {item.shortLabel}
                </button>
              ))}
            </div>
            <p className="career-description">One daily question per track. New questions at midnight Eastern.</p>
          </div>

          <div className="mini-stats">
            <div>
              <b>{streak}</b>
              <span>DAY STREAK</span>
            </div>

            <div>
              <b>
                {result
                  ? Math.round(
                      result.score * 10
                    )
                  : 0}
                %
              </b>

              <span>TODAY&apos;S SCORE</span>
            </div>
          </div>
        </section>

        <section className="game-card" id="daily-interview-panel" role="tabpanel" aria-labelledby={`tab-${career}`} tabIndex={0}>
          <div className="card-head">
            <div>
              <p className="eyebrow">
                TODAY&apos;S INTERVIEW
              </p>

              <h1>
                Interviewdle{" "}
                <span>
                  #
                  {String(number).padStart(
                    3,
                    "0"
                  )}
                </span>
              </h1>
            </div>

            <div className="tags">
              <span>
                {q.category}
              </span>

              <span className="difficulty">
                ● {q.difficulty}
              </span>
            </div>
          </div>

          <div className="question-wrap">
            <span className="question-number">
              Q
            </span>

            <h2>
              {q.question}
            </h2>
          </div>

          {syncing && <p className="save-note" role="status">Loading saved progress…</p>}
          {notice && <p className="save-note" role="status">{notice}</p>}

          {!result ? (
            <>
              <SignedOut>
                <div className="save-note">
                  <span>
                    Play as a guest, or{" "}
                  </span>

                  <SignInButton mode="modal">
                    <button>
                      sign in to save progress
                      across devices
                    </button>
                  </SignInButton>
                  .
                </div>
              </SignedOut>

              <label htmlFor="answer">
                Answer like you&apos;re
                speaking to an interviewer.
              </label>

              <div
                className={`answer-box ${
                  rewrite ? "warn" : ""
                }`}
              >
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(event) =>
                    setAnswer(
                      event.target.value
                    )
                  }
                  placeholder="Explain it in your own words…"
                  maxLength={900}
                  disabled={grading || syncing}
                />

                <span>
                  {answer.length}/900
                </span>
              </div>

              {rewrite && (
                <div className="rewrite">
                  <Sparkles size={20} />

                  <div>
                    <b>
                      This answer sounds
                      unusually polished.
                    </b>

                    <p>
                      Try explaining it again in
                      your own words, like you
                      would in a real interview.
                    </p>
                  </div>
                </div>
              )}

              <button
                className="submit"
                onClick={submit}
                disabled={
                  answer.trim().length <
                    18 ||
                  grading || syncing
                }
              >
                {grading
                  ? "Checking your answer..."
                  : rewrite
                    ? "Check My Rewrite"
                    : "Submit Answer"}

                {!grading && (
                  <span>↵</span>
                )}
              </button>

              <p className="privacy">
                <Target size={15} />
                Your answer is checked against this question’s learning rubric.
              </p>
            </>
          ) : (
            <section className="results">
              <div className="score-row">
                <div className="score-badge">
                  <b>
                    {result.score}
                  </b>

                  <span>
                    / 10
                  </span>
                </div>

                <div>
                  <p className="eyebrow">
                    YOUR RESULT
                  </p>

                  <h3>
                    {result.label}
                  </h3>

                  <p>
                    {careerName} · Rubric-based feedback
                  </p>
                </div>
              </div>

              <article className="ideal">
                <p className="eyebrow">
                  ANSWER FEEDBACK
                </p>

                <p>
                  {result.verdict}
                </p>
              </article>

              <div className="feedback-grid">
                <article>
                  <h4>
                    What worked
                  </h4>

                  {result.strengths.length ? (
                    result.strengths.map(
                      (item) => (
                        <p key={item}>
                          <Check size={16} />
                          {item}
                        </p>
                      )
                    )
                  ) : (
                    <p>
                      No major strengths were
                      identified in this
                      response.
                    </p>
                  )}
                </article>

                <article>
                  <h4>
                    What would improve it
                  </h4>

                  {result.improvements.length ? (
                    result.improvements.map(
                      (item) => (
                        <p key={item}>
                          <span>+</span>
                          {item}
                        </p>
                      )
                    )
                  ) : (
                    <p>
                      This answer did not need
                      any major improvements.
                    </p>
                  )}
                </article>
              </div>

              <article className="ideal">
                <p className="eyebrow">
                  INTERVIEW-READY ANSWER
                </p>

                <p>
                  “{q.ideal}”
                </p>
              </article>

              <div className="result-footer">
                <span>
                  <Flame size={20} />
                  {streak} day streak
                </span>

                <div className="result-actions">
                  <button
                    onClick={() =>
                      setShareOpen(
                        !shareOpen
                      )
                    }
                  >
                    <Share2 size={16} />
                    Share Result
                  </button>

                  <button
                    onClick={replayDemo}
                  >
                    <RotateCcw size={16} />
                    Replay demo
                  </button>
                </div>
              </div>

              {shareOpen && (
                <div className="share-panel">
                  <div className="share-panel-head">
                    <div>
                      <p className="eyebrow">
                        SHARE YOUR RESULT
                      </p>

                      <h4>
                        Choose a format
                      </h4>
                    </div>
                  </div>

                  <div className="share-formats">
                    <button
                      className={
                        shareFormat ===
                        "story"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setShareFormat(
                          "story"
                        )
                      }
                    >
                      <span>
                        9:16
                      </span>

                      Instagram Story
                    </button>

                    <button
                      className={
                        shareFormat ===
                        "wide"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setShareFormat(
                          "wide"
                        )
                      }
                    >
                      <span>
                        16:9
                      </span>

                      Desktop / Social
                    </button>
                  </div>

                  <div
                    className={`share-preview ${shareFormat}`}
                  >
                    <p className="share-brand">
                      INTERVIEWDLE
                    </p>

                    <p className="share-number">
                      Interviewdle #
                      {String(
                        number
                      ).padStart(
                        3,
                        "0"
                      )}
                    </p>

                    <div className="share-score">
                      <b>
                        {result.score}
                      </b>

                      <span>
                        /10
                      </span>
                    </div>

                    <h3>
                      {result.label}
                    </h3>

                    <p className="share-track">{careerName}</p>

                    <div className="share-details">
                      <span>
                        {q.category}
                      </span>

                      <span>
                        {streak} day streak
                      </span>
                    </div>

                    <p className="share-tagline">
                      One question. Every day.
                      A better answer each time.
                    </p>
                  </div>

                  <div className="share-buttons">
                    <button
                      onClick={
                        downloadShareImage
                      }
                    >
                      <Download size={16} />
                      Save Image
                    </button>

                    <button
                      onClick={shareResult}
                    >
                      <Share2 size={16} />
                      Share
                    </button>

                    <button
                      onClick={shareToX}
                    >
                      <span>𝕏</span>
                      Post to X
                    </button>

                    <button
                      onClick={emailResult}
                    >
                      <Mail size={16} />
                      Email
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </section>

        <footer>
          <span>
            One question. Every day. A better
            answer each time.
          </span>

          <span>
            Built for real interview practice.
          </span>
        </footer>
      </div>
    </main>
  );
}
