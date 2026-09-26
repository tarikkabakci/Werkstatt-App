CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`category` text DEFAULT 'service' NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `vat_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `vat_rate` real DEFAULT 19 NOT NULL;