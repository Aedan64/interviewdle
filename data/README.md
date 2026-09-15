# Editing the daily question and rubric

Interviewdle contains 365 built-in questions. You can replace any day's question without touching the grader.

1. Open `data/question-overrides.json` on GitHub.
2. Click the pencil icon.
3. Add an entry using the Interviewdle number you want to replace.
4. Commit the change to `main`. Vercel will deploy it automatically.

Example that replaces Interviewdle #15:

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
