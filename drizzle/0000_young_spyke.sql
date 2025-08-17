CREATE TABLE `guinness_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guinness_topics_title_unique` ON `guinness_topics` (`title`);--> statement-breakpoint
CREATE UNIQUE INDEX `guinness_topics_hash_unique` ON `guinness_topics` (`hash`);