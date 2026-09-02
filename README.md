# Interviewdle

Interviewdle is a daily interview-practice web app designed to help students and early-career engineers improve how they answer technical interview questions.

Every day, users receive one interview question based on their selected career path. After submitting an answer, Interviewdle gives a score, highlights important concepts that were covered or missed, and shows an interview-ready example answer.

The goal is simple: **one question every day, better interview answers over time.**

## Live Site

https://interviewdle.com

## Current Career Track

* Computer Hardware Engineering

Additional majors and career paths are planned for future versions.

## Features

* One technical interview question per day
* Daily question resets at midnight Eastern Time
* Technical answer scoring
* Feedback showing concepts covered
* Feedback showing concepts that could be added
* Interview-ready example answers
* AI-style response detection that encourages users to answer in their own words
* Daily streak tracking
* Total questions completed
* Average score tracking
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

## Daily Question System

Interviewdle uses a shared daily question rather than generating a different question for every user.

The date is calculated using:

```text
America/New_York
```

This means the daily Interviewdle changes at midnight Eastern Time for everyone, regardless of where the user is located.

The timezone automatically handles EST and EDT.

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
* Larger question banks
* Difficulty progression
* Personalized question history
* User profiles
* Detailed performance analytics
* Category-specific performance
* Weekly and monthly progress
* Leaderboards
* Achievements
* Improved AI-generated-answer detection
* Better scoring using an AI evaluation model
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
