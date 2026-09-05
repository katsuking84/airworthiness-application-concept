CREATE TABLE `document_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`requirement_id` text NOT NULL,
	`name` text NOT NULL,
	`expected_size` integer NOT NULL,
	`part_count` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_document_uploads_application` ON `document_uploads` (`application_id`);--> statement-breakpoint
CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`window_started_at` text NOT NULL
);--> statement-breakpoint
ALTER TABLE `users` ADD `password_algorithm` text DEFAULT 'pbkdf2-sha256-100000' NOT NULL;
