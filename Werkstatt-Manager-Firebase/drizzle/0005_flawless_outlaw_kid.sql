ALTER TABLE `invoices` ADD `issued_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `paid_at` text;