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
