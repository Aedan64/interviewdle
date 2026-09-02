CREATE TABLE `progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`question_date` text NOT NULL,
	`answer` text NOT NULL,
	`score_tenths` integer NOT NULL,
	`result_label` text NOT NULL,
	`hits_json` text DEFAULT '[]' NOT NULL,
	`misses_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_progress_user_date` ON `progress` (`user_id`,`question_date`);