PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_work_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer` text DEFAULT '' NOT NULL,
	`car` text DEFAULT '' NOT NULL,
	`plate` text DEFAULT '' NOT NULL,
	`appointment_date` text DEFAULT '' NOT NULL,
	`appointment_time` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`technician` text DEFAULT 'Noch nicht zugewiesen' NOT NULL,
	`status` text DEFAULT 'Neu' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`amount` real DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_work_orders`("id", "customer", "car", "plate", "appointment_date", "appointment_time", "title", "technician", "status", "priority", "amount") SELECT "id", '', '', '', '', '', "title", 'Noch nicht zugewiesen', "status", "priority", "amount" FROM `work_orders`;--> statement-breakpoint
DROP TABLE `work_orders`;--> statement-breakpoint
ALTER TABLE `__new_work_orders` RENAME TO `work_orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
