CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`raw_text` text NOT NULL,
	`raw_delivery_at` text,
	`parsed_json` text,
	`next_run_at` integer,
	`timezone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_run_at` integer,
	`tg_user_id` integer NOT NULL,
	FOREIGN KEY (`tg_user_id`) REFERENCES `tg_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tg_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
