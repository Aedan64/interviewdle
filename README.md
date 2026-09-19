# Interviewdle

Interviewdle is a daily interview-practice web app designed to help students and early-career engineers improve how they answer technical interview questions.

Every day, users receive one interview question based on their selected career path. After submitting an answer, Interviewdle gives a score, highlights important concepts that were covered or missed, and shows an interview-ready example answer.

The goal is simple: **one question every day, better interview answers over time.**

## Live Site

https://interviewdle.com

## Career Tracks

* Computer Hardware Engineering
* Electrical Engineering

Choose a tab to switch tracks. Each has its own daily question, saved result, completion count, and streak. The selection is remembered on the device, and shared links open the selected track.

## Features

* One technical interview question per day
* Daily question resets at midnight Eastern Time
* Local rubric-based answer scoring with no paid AI/API usage
* Feedback showing concepts covered
* Feedback showing concepts that could be added
* Interview-ready example answers
* Low-quality and keyword-stuffing detection
* 365 daily hardware-engineering questions
* 365 individually authored Electrical Engineering questions, answers, and rubrics across 13 subjects
* Daily streak tracking
* Total questions completed
* Today's score per track
* Guest mode
* Account sign-in
* Progress syncing across devices for signed-in users

## Result Sharing

Users can share their daily Interviewdle result.

Current sharing options include:

* Download result as an image
* Instagram Story format — 9:16
* Desktop / social format — 16:9
* Native device sharing
* Post result to X
* Email result
* Share daily score and streak

Shared results should direct users back to:

https://interviewdle.com

## Authentication

Interviewdle currently uses Clerk for authentication.

Supported sign-in options can include:

* Google
* Email
* Other providers configured through Clerk

Authentication is used to save user progress across devices.

## Tech Stack

* Next.js
* React
* TypeScript
* Clerk
* Drizzle ORM
* Cloudflare / Vinext hosting
* CSS
* Lucide icons

## Environment Variables

Environment variables should be stored locally and should **never be committed to GitHub**.

Create an environment file such as:

```text
.env.local
```

The exact variables depend on the authentication and database configuration being used.

Example:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

The grader does not need `OPENAI_API_KEY` or any other paid AI key.

Never place real API keys, secrets, database credentials, or authentication tokens directly inside the source code.

Make sure `.env`, `.env.local`, and other environment files remain listed in `.gitignore`.

## Local Development

Clone the repository:

```bash
git clone https://github.com/Aedan64/interviewdle.git
```

Enter the project:

```bash
cd interviewdle
```

Install dependencies:

```bash
npm install
```

Create the required environment file and add your environment variables.

Then start the development server:

```bash
npm run dev
```

Open the local development URL shown in the terminal.

## Deployment

The repository supports both hosting targets:

* Cloudflare uses `npm run dev`, `npm run build`, and the Vinext Worker in `worker/index.ts`. It keeps using the configured D1 and R2 bindings.
* Vercel uses `vercel.json`, `npm run dev:vercel`, and `npm run build:vercel`. It uses Vercel Postgres for signed-in progress.

To configure Vercel:

1. Import the repository into Vercel and leave the framework as Next.js.
2. Create a Postgres database from the Vercel Storage or Marketplace tab and connect it to the project. This supplies `POSTGRES_URL`.
3. Run the SQL in `db/vercel-schema.sql` against that database using the database provider's SQL console.
4. Add these environment variables in the Vercel project for Preview and Production:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_ISSUER_URL=https://your-clerk-issuer
POSTGRES_URL=
```

Use `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for the browser key. The app also accepts the legacy `CLERK_PUBLISHABLE_KEY` name, but the public variable takes precedence. Use the issuer URL without `/.well-known/jwks.json`; the API appends that path when validating tokens.

Deploy with the default Vercel build settings. The checked-in `vercel.json` selects `npm ci`, `npm run build:vercel`, and `next dev` for local Vercel-mode development.

## Daily Question System

Interviewdle uses a shared daily question rather than generating a different question for every user.

The date is calculated using:

```text
America/New_York
```

This means the daily Interviewdle changes at midnight Eastern Time for everyone, regardless of where the user is located.

The timezone automatically handles EST and EDT.

The Hardware bank contains 365 prompts covering 73 topics in five interview styles. The Electrical bank contains 365 individually authored questions with distinct model answers, interleaving 13 categories: circuits, AC/transients, analog, semiconductors, power electronics, power systems, machines, signals/DSP, controls, electromagnetics/RF, instrumentation, PCB/EMC, and design/troubleshooting.

Both use the calendar-day number starting September 1, 2026, and repeat after their bank is exhausted. Open tabs update at Eastern midnight and when returning after sleep. Each track cycles independently, and switching does not reset or overwrite another track's progress.

Browse [all 365 Electrical questions](data/ELECTRICAL-QUESTIONS.md). Edit the Electrical bank in `data/electrical-question-bank.json` or add replacements in `data/electrical-question-overrides.json`. Hardware retains `data/question-overrides.json`. Instructions are in [data/README.md](data/README.md).

## Local Grading

Answers are graded inside the Interviewdle server using the selected question's rubric. The grader checks required concepts, accepted synonyms, optional depth, relevance, explanation quality, minimum length, repeated/gibberish text, keyword dumping, and listed misconceptions. It sends no answer to OpenAI and consumes no AI tokens.

This is rule-based practice feedback: it cannot reliably recognize every valid paraphrase or technical contradiction. Improve a question's accepted phrases and misconception rules as you review answers. Question data is public, so this is a practice tool rather than a secure examination.

## Progress compatibility

Existing Hardware account rows remain in `progress`. Electrical account results use `track_progress`, keyed by account, career, and date. The application creates that table on first use through the existing database connection; no new service or API key is required. The database user must have permission to create tables. Creation is idempotent for concurrent requests.

Browser saves are scoped to both career and signed-in account (or guest). Old `interviewdle` browser data remains available to the Hardware guest. An old client with no `career` field still uses Hardware. The progress API recomputes saved scores using the selected career's local rubric.

## Validation

Run `npm run test:careers` for bank integrity, grading, API routing, Eastern/DST rotation, legacy saves, and independent account progress. Run `npm run build:vercel` for the production build, with the existing Clerk publishable key configured.

After building, run `npx playwright install chromium` once, then `npm run test:browser`. This regression check keeps sign-in unloaded and verifies guest play, grading, saved results, account recovery, and mobile layout. Authentication must never block the daily game; while Clerk connects, guests can play and save results on their device.

## Current Question Categories

The current Computer Hardware Engineering track includes topics such as:

* Digital Logic
* Computer Architecture
* Embedded Systems
* FPGA Design
* Hardware Debugging

Future versions can expand the question bank significantly.

## Planned Features

Potential future improvements include:

* More majors and job roles
* Difficulty progression
* Personalized question history
* User profiles
* Detailed performance analytics
* Category-specific performance
* Weekly and monthly progress
* Leaderboards
* Achievements
* A private question-editor dashboard
* Custom interview practice
* Friends and social features
* More share-card designs
* LinkedIn sharing
* Interview preparation recommendations

## Project Structure

Important files currently include:

```text
app/
  page.tsx
  globals.css
  layout.tsx
  api/

db/
components/
lib/
hooks/
```

### `app/page.tsx`

Contains the main Interviewdle interface and game logic, including:

* Daily question display
* Answer submission
* Answer scoring
* Results
* Streaks
* Sharing
* Authentication UI

### `app/globals.css`

Contains the main visual styling for Interviewdle, including:

* Main interface
* Interview card
* Answer section
* Result screen
* Share result panel
* Mobile responsiveness

## Security

Do not commit:

* `.env`
* `.env.local`
* Clerk secret keys
* database secrets
* API keys
* access tokens
* private credentials

Only variables explicitly intended for browser use should use the `NEXT_PUBLIC_` prefix.

## Repository

https://github.com/Aedan64/interviewdle

## Goal

Interviewdle is meant to make technical interview preparation feel more like a daily habit than a long study session.

**One question. Every day. A better answer each time.**
