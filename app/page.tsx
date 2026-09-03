"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Flame,
  Mail,
  Moon,
  RotateCcw,
  Share2,
  Sparkles,
  Sun,
  Target,
  Trophy,
} from "lucide-react";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";

import { SpeedInsights } from "@vercel/speed-insights/next";

/* =========================
   QUESTIONS
========================= */

const QUESTIONS = [
  {
    category: "Digital Logic",
    difficulty: "Easy",
    question:
      "What is the difference between combinational logic and sequential logic?",
    ideal:
      "Combinational logic produces an output based only on its current inputs. Sequential logic also depends on stored state from earlier inputs, usually held in memory elements such as flip-flops or registers.",
  },
  {
    category: "Computer Architecture",
    difficulty: "Easy",
    question:
      "What does a CPU cache do, and why is it faster than main memory?",
    ideal:
      "A CPU cache stores frequently used data and instructions close to the processor. It uses faster memory and has much lower access latency than main memory, so the CPU spends less time waiting for data.",
  },
  {
    category: "Embedded Systems",
    difficulty: "Medium",
    question:
      "What is an interrupt, and when would you use one instead of polling?",
    ideal:
      "An interrupt is a signal that temporarily pauses normal execution and runs a handler for an event. I would use it when a device needs a fast response without making the CPU repeatedly check its status, as polling would.",
  },
  {
    category: "FPGA & Debugging",
    difficulty: "Medium",
    question:
      "Your FPGA design works in simulation but not on the physical board. What would you check first?",
    ideal:
      "I would verify the pin assignments, power and voltage levels, clock and reset signals, and that the correct bitstream was programmed. Then I would review timing constraints and probe signals stage by stage to isolate the mismatch.",
  },
];

/* =========================
   TYPES
========================= */

type Result = {
  score: number;
  label: string;
  verdict: string;
  strengths: string[];
  improvements: string[];
};

type Theme = "light" | "dark";
type ShareFormat = "story" | "wide";

/* =========================
   DATE HELPERS
========================= */

function getEasternDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function questionNumberFromDate(dateString: string) {
  const startDate = new Date("2026-09-01T00:00:00Z");
  const currentDate = new Date(`${dateString}T00:00:00Z`);

  const daysSinceStart = Math.floor(
    (currentDate.getTime() - startDate.getTime()) / 86400000
  );

  return Math.max(1, daysSinceStart + 1);
}

function streakFrom(dates: string[]) {
  const completed = new Set(dates);

  const todayEastern = getEasternDate();
  const cursor = new Date(`${todayEastern}T00:00:00Z`);

  let total = 0;

  while (true) {
    const key = cursor.toISOString().slice(0, 10);

    if (!completed.has(key)) break;

    total++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return total;
}

function fallbackVerdict(label: string) {
  if (label === "Interview Ready") {
    return "This answer would likely satisfy an interviewer without needing much clarification.";
  }

  if (label === "Strong") {
    return "This is a solid interview response, though a little more precision or depth could make it stronger.";
  }

  if (label === "Needs More Depth") {
    return "This shows some understanding, but an interviewer would likely want a clearer or more complete explanation.";
  }

  if (label === "Weak") {
    return "This answer would raise concerns because important concepts are missing or unclear.";
  }

  return "This answer would not demonstrate enough relevant understanding in a technical interview.";
}

/* =========================
   PAGE
========================= */

export default function Home() {
  const { isSignedIn, getToken } = useAuth();

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [rewrite, setRewrite] = useState(false);
  const [grading, setGrading] = useState(false);

  const [menu, setMenu] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareFormat, setShareFormat] =
    useState<ShareFormat>("story");

  const [streak, setStreak] = useState(0);
  const [played, setPlayed] = useState(0);
  const [completedDates, setCompletedDates] =
    useState<string[]>([]);

  const [theme, setTheme] = useState<Theme>("light");

  const today = getEasternDate();
  const number = questionNumberFromDate(today);

  const q = useMemo(
    () => QUESTIONS[(number - 1) % QUESTIONS.length],
    [number]
  );

  /* =========================
     THEME
  ========================= */

  useEffect(() => {
    const saved = localStorage.getItem("interviewdle-theme");

    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("interviewdle-theme", theme);
  }, [theme]);

  /* =========================
     LOCAL PROGRESS
  ========================= */

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("interviewdle") || "{}"
    );

    const dates: string[] = Array.isArray(saved.completedDates)
      ? saved.completedDates
      : saved.date && saved.result
        ? [saved.date]
        : [];

    setCompletedDates(dates);
    setStreak(streakFrom(dates));
    setPlayed(dates.length);

    if (saved.date === today && saved.result) {
      setAnswer(saved.answer || "");

      const oldResult = saved.result;

      /*
       * Supports both the new grader format
       * and older saved keyword-format results.
       */
      const normalized: Result = {
        score: oldResult.score ?? 0,
        label: oldResult.label ?? "Needs More Depth",

        verdict:
          oldResult.verdict ??
          fallbackVerdict(oldResult.label ?? "Needs More Depth"),

        strengths:
          oldResult.strengths ??
          oldResult.hits ??
          [],

        improvements:
          oldResult.improvements ??
          oldResult.misses ??
          [],
      };

      setResult(normalized);
    }
  }, [today]);

  /* =========================
     ACCOUNT PROGRESS
  ========================= */

  useEffect(() => {
    if (!isSignedIn) return;

    void (async () => {
      try {
        const token = await getToken();

        const response = await fetch("/api/progress", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();

        const dates: string[] = data.dates || [];

        setCompletedDates(dates);
        setPlayed(dates.length);
        setStreak(streakFrom(dates));

        const latest = data.latest;

        if (latest?.question_date === today) {
          const label = latest.result_label || "Needs More Depth";

          const savedResult: Result = {
            score: latest.score_tenths / 10,
            label,

            /*
             * The current DB doesn't have a verdict column yet,
             * so older/synced results get a generated verdict.
             */
            verdict: fallbackVerdict(label),

            /*
             * Reuse existing DB JSON columns:
             * hits_json = strengths
             * misses_json = improvements
             */
            strengths: JSON.parse(latest.hits_json || "[]"),
            improvements: JSON.parse(latest.misses_json || "[]"),
          };

          setAnswer(latest.answer || "");
          setResult(savedResult);
        }
      } catch (error) {
        console.error("Could not load progress:", error);
      }
    })();
  }, [isSignedIn, getToken, today]);

  /* =========================
     SAVE PROGRESS
  ========================= */

  async function saveProgress(clean: string, next: Result) {
    if (!isSignedIn) return;

    try {
      const token = await getToken();

      await fetch("/api/progress", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          date: today,
          answer: clean,
          score: next.score,
          label: next.label,

          /*
           * Reuse existing DB fields for now.
           */
          hits: next.strengths,
          misses: next.improvements,
        }),
      });
    } catch (error) {
      console.error("Could not save progress:", error);
    }
  }

  /* =========================
     SUBMIT / AI GRADER
  ========================= */

  async function submit() {
    const clean = answer.trim();

    if (clean.length < 18 || grading) return;

    /*
     * Existing "own words" check.
     */
    const signals = [
      "in conclusion",
      "it is important to note",
      "furthermore",
      "plays a crucial role",
      "delve",
    ];

    const aiSignalCount = signals.filter((signal) =>
      clean.toLowerCase().includes(signal)
    ).length;

    if (
      (clean.length > 420 || aiSignalCount >= 2) &&
      !rewrite
    ) {
      setRewrite(true);
      return;
    }

    setGrading(true);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: q.question,
          answer: clean,
          idealAnswer: q.ideal,
          category: q.category,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        console.error(
          "Grading API error:",
          errorData
        );

        throw new Error("Grading failed");
      }

      const next = (await response.json()) as Result;

      const dates = completedDates.includes(today)
        ? completedDates
        : [today, ...completedDates];

      setCompletedDates(dates);
      setResult(next);
      setRewrite(false);
      setStreak(streakFrom(dates));
      setPlayed(dates.length);

      localStorage.setItem(
        "interviewdle",
        JSON.stringify({
          date: today,
          answer: clean,
          result: next,
          completedDates: dates,
        })
      );

      void saveProgress(clean, next);
    } catch (error) {
      console.error("Could not grade answer:", error);

      alert(
        "We couldn't grade your answer right now. Please try again."
      );
    } finally {
      setGrading(false);
    }
  }

  /* =========================
     SHARE IMAGE
  ========================= */

  function createShareCanvas() {
    if (!result) return null;

    const isStory = shareFormat === "story";

    const width = isStory ? 1080 : 1600;
    const height = isStory ? 1920 : 900;

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(
      0,
      0,
      width,
      height
    );

    gradient.addColorStop(0, "#172019");
    gradient.addColorStop(1, "#263329");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(223,243,107,0.10)";
    ctx.beginPath();

    ctx.arc(
      width * 0.86,
      height * 0.12,
      width * 0.3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    const left = isStory ? 90 : 110;

    ctx.fillStyle = "#dff36b";
    ctx.font = `800 ${isStory ? 34 : 30}px Arial`;

    ctx.fillText(
      "INTERVIEWDLE",
      left,
      isStory ? 180 : 105
    );

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = `${isStory ? 30 : 26}px Arial`;

    ctx.fillText(
      `Interviewdle #${String(number).padStart(3, "0")}`,
      left,
      isStory ? 270 : 175
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${isStory ? 210 : 150}px Arial`;

    const scoreText = String(result.score);

    ctx.fillText(
      scoreText,
      left,
      isStory ? 650 : 425
    );

    const scoreWidth = ctx.measureText(scoreText).width;

    ctx.fillStyle = "rgba(255,255,255,0.60)";
    ctx.font = `${isStory ? 58 : 44}px Arial`;

    ctx.fillText(
      "/10",
      left + scoreWidth + 20,
      isStory ? 650 : 425
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${isStory ? 70 : 50}px Georgia`;

    ctx.fillText(
      result.label,
      left,
      isStory ? 760 : 515
    );

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `${isStory ? 34 : 28}px Arial`;

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

    ctx.fillStyle = "rgba(255,255,255,0.60)";
    ctx.font = `${isStory ? 30 : 24}px Arial`;

    ctx.fillText(
      "One question. Every day. A better answer each time.",
      left,
      height - (isStory ? 140 : 75)
    );

    return canvas;
  }

  function downloadShareImage() {
    const canvas = createShareCanvas();

    if (!canvas) return;

    const link = document.createElement("a");

    link.download =
      `interviewdle-${String(number).padStart(3, "0")}-${shareFormat}.png`;

    link.href = canvas.toDataURL("image/png");

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
      `${streak} day streak.`;

    const canonicalUrl = "https://interviewdle.com";

    const canvas = createShareCanvas();

    if (canvas && navigator.share) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );

        if (blob) {
          const file = new File(
            [blob],
            `interviewdle-${number}.png`,
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
              title: "My Interviewdle Result",
              text,
              url: canonicalUrl,
              files: [file],
            });

            return;
          }
        }

        await navigator.share({
          title: "My Interviewdle Result",
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

      alert("Result copied to clipboard!");
    } catch {
      alert("Could not open sharing on this device.");
    }
  }

  /* =========================
     SHARE TO X
  ========================= */

  function shareToX() {
    if (!result) return;

    const text = encodeURIComponent(
      `I scored ${result.score}/10 on Interviewdle ` +
        `#${String(number).padStart(3, "0")} — ${result.label}. ` +
        `${streak} day streak.`
    );

    const url = encodeURIComponent(
      "https://interviewdle.com"
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

    const subject = encodeURIComponent(
      `My Interviewdle #${String(number).padStart(3, "0")} Result`
    );

    const body = encodeURIComponent(
      `I scored ${result.score}/10 on Interviewdle ` +
        `#${String(number).padStart(3, "0")} — ${result.label}.\n\n` +
        `${streak} day streak\n` +
        `${q.category}\n\n` +
        `Try Interviewdle:\nhttps://interviewdle.com`
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

      {/* HEADER */}

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

          {/* THEME PICKER */}

          <div
            className="theme-picker"
            role="group"
            aria-label="Color theme"
          >
            <button
              className={
                theme === "light" ? "active" : ""
              }
              onClick={() => setTheme("light")}
              aria-label="Use light theme"
              title="Light theme"
            >
              <Sun size={16} />
            </button>

            <button
              className={
                theme === "dark" ? "active" : ""
              }
              onClick={() => setTheme("dark")}
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
        {/* CAREER */}

        <section className="career-row">
          <div>
            <p className="eyebrow">
              YOUR CAREER
            </p>

            <button
              className="career-select"
              onClick={() => setMenu(!menu)}
            >
              <span className="chip-icon">
                ⌁
              </span>

              Computer Hardware Engineer

              <ChevronDown size={17} />
            </button>

            {menu && (
              <div className="career-menu">
                <button
                  onClick={() =>
                    setMenu(false)
                  }
                >
                  <Check size={16} />
                  Computer Hardware Engineer
                </button>

                <p>
                  More careers coming soon
                </p>
              </div>
            )}
          </div>

          <div className="mini-stats">
            <div>
              <b>{streak}</b>
              <span>DAY STREAK</span>
            </div>

            <div>
              <b>
                {played
                  ? Math.round(
                      ((played - 1) * 82 +
                        Math.max(
                          result?.score || 0,
                          7
                        ) *
                          10) /
                        played
                    )
                  : 0}
                %
              </b>

              <span>AVG. SCORE</span>
            </div>
          </div>
        </section>

        {/* GAME */}

        <section className="game-card">
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

          {/* QUESTION */}

          <div className="question-wrap">
            <span className="question-number">
              Q
            </span>

            <h2>
              {q.question}
            </h2>
          </div>

          {!result ? (
            <>
              {/* ANSWER SCREEN */}

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
                Answer like you&apos;re speaking
                to an interviewer.
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
                  disabled={grading}
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
                      This answer sounds unusually
                      polished.
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
                  answer.trim().length < 18 ||
                  grading
                }
              >
                {grading
                  ? "Interviewer is grading..."
                  : rewrite
                    ? "Check My Rewrite"
                    : "Submit Answer"}

                {!grading && <span>↵</span>}
              </button>

              <p className="privacy">
                <Target size={15} />
                Your response is evaluated like a
                real interview answer—not just
                checked for keywords.
              </p>
            </>
          ) : (
            /* =========================
               RESULT SCREEN
            ========================= */

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
                    Graded like a technical
                    interview response.
                  </p>
                </div>
              </div>

              {/* INTERVIEWER VERDICT */}

              <article className="ideal">
                <p className="eyebrow">
                  INTERVIEWER VERDICT
                </p>

                <p>
                  {result.verdict}
                </p>
              </article>

              {/* FEEDBACK */}

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
                      identified in this response.
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
                      This answer did not need any
                      major improvements.
                    </p>
                  )}
                </article>
              </div>

              {/* IDEAL ANSWER */}

              <article className="ideal">
                <p className="eyebrow">
                  INTERVIEW-READY ANSWER
                </p>

                <p>
                  “{q.ideal}”
                </p>
              </article>

              {/* RESULT FOOTER */}

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

              {/* SHARE PANEL */}

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
                        shareFormat === "story"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setShareFormat("story")
                      }
                    >
                      <span>
                        9:16
                      </span>

                      Instagram Story
                    </button>

                    <button
                      className={
                        shareFormat === "wide"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setShareFormat("wide")
                      }
                    >
                      <span>
                        16:9
                      </span>

                      Desktop / Social
                    </button>
                  </div>

                  {/* SHARE PREVIEW */}

                  <div
                    className={`share-preview ${shareFormat}`}
                  >
                    <p className="share-brand">
                      INTERVIEWDLE
                    </p>

                    <p className="share-number">
                      Interviewdle #
                      {String(number).padStart(
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

                    <div className="share-details">
                      <span>
                        {q.category}
                      </span>

                      <span>
                        {streak} day streak
                      </span>
                    </div>

                    <p className="share-tagline">
                      One question. Every day. A
                      better answer each time.
                    </p>
                  </div>

                  {/* SHARE BUTTONS */}

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

        {/* FOOTER */}

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
