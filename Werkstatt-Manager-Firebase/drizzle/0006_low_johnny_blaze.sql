ALTER TABLE `customers` ADD `first_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `last_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `street` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `postal_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_method` text DEFAULT 'ueberweisung' NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `registration_image_key` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `registration_image_name` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `registration_image_type` text;