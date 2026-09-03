CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_date TEXT NOT NULL,
  answer TEXT NOT NULL,
  score_tenths INTEGER NOT NULL,
  result_label TEXT NOT NULL,
  hits_json TEXT NOT NULL DEFAULT '[]',
  misses_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  CONSTRAINT progress_user_date_unique UNIQUE (user_id, question_date)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_date
  ON progress (user_id, question_date DESC);