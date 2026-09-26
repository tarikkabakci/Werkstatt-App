CREATE TABLE `company_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`workshop_name` text DEFAULT '' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`street` text DEFAULT '' NOT NULL,
	`postal_code` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`tax_number` text DEFAULT '' NOT NULL,
	`iban` text DEFAULT '' NOT NULL,
	`bic` text DEFAULT '' NOT NULL,
	`bank` text DEFAULT '' NOT NULL,
	`small_business_notice` text DEFAULT 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.' NOT NULL,
	`payment_days` integer DEFAULT 14 NOT NULL,
	`invoice_prefix` text DEFAULT 'RE' NOT NULL,
	`estimate_prefix` text DEFAULT 'KV' NOT NULL
);
