# Editing the daily question and rubric

Interviewdle has separate Hardware and Electrical tracks. Both use local rubrics and require no AI API key.

| Track | Editable replacements | Full bank |
| --- | --- | --- |
| Hardware | `data/question-overrides.json` | `data/questions.ts` |
| Electrical | `data/electrical-question-overrides.json` | `data/electrical-question-bank.json` |

Browse Electrical prompts by ID in [ELECTRICAL-QUESTIONS.md](ELECTRICAL-QUESTIONS.md). Its 365 entries are individual questions with distinct reference answers, not prompt templates. Categories alternate through the schedule.

1. Open the replacement file for the track you want to change on GitHub.
2. Click the pencil icon.
3. Add an entry keyed by the question's bank ID (shown in the catalog or full bank).
4. Commit the change to `main`. Vercel will deploy it automatically.

Example replacing bank ID 15 (paste into the chosen track's replacement file):

```json
{
  "15": {
    "category": "Digital Logic",
    "difficulty": "Medium",
    "question": "Why can a setup-time violation cause metastability?",
    "ideal": "A setup-time violation means data changed too close to the sampling clock edge. The flip-flop may not resolve quickly to a valid zero or one, causing metastability. A synchronizer reduces the probability that it reaches downstream logic.",
    "rubric": {
      "required": [
        ["data changed near clock edge", "too close to clock edge", "setup violation"],
        ["cannot resolve", "metastability", "unstable output"],
        ["synchronizer", "two flip-flop", "2 flip-flop"]
      ],
      "optional": [
        ["probability", "mtbf"],
        ["downstream logic"]
      ],
      "misconceptions": [
        "metastability is always prevented",
        "setup time happens after the clock"
      ],
      "minimumWords": 15
    }
  }
}
```

Rubric rules:

- Each nested `required` array is one concept the answer should explain.
- Phrases inside the same nested array are accepted alternatives or synonyms.
- `optional` concepts add depth but are not necessary for a correct answer.
- `misconceptions` are incorrect claims that lower the score.
- `minimumWords` rejects answers too short to demonstrate understanding.
- Keep valid JSON: use double quotes, commas between entries, and no comma after the final entry.

To replace more days, add more numbered entries inside the same outer `{}` object.

## How the day is selected

The daily number starts at 1 on September 1, 2026. For the original 365-entry banks, slot = `((dailyNumber - 1) % 365) + 1`. Slots 1–365 match their bank IDs; day #366 returns to slot 1. Both tracks use Eastern calendar dates, including daylight saving time. A replacement applies whenever that bank ID appears again.

Keep IDs stable when editing. To add Electrical questions beyond the initial year, append entries to `electrical-question-bank.json` with new unique IDs; the live rotation uses the array length. Update the baseline count and cycle expectations in `tests/careers.test.ts` if extending the bank. Appending changes the rotation length and can change the scheduled question once the initial 365 days have passed, so plan additions before users reach that point.

## Validate before publishing

Run `npm run test:careers` and `npm run build:vercel`. Invalid Electrical replacement shapes or unknown IDs fail validation. Test your question with its reference answer, a shorter correct explanation, an unrelated answer, and a wrong claim. Optional and misconception rules may be empty, but required groups must contain meaningful phrases.

The local grader is heuristic. Accepted phrases improve coverage, but a phrase match is not proof that an arbitrary sentence is technically correct. Check scores when changing a rubric.

Background reference for reviewing the amplifier stability questions: [TI, Stability Analysis of Voltage-Feedback Op Amps](https://www.ti.com/lit/an/sloa020a/sloa020a.pdf).
