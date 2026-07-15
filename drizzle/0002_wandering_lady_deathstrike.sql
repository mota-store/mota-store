CREATE TABLE `balance_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('deposit','purchase','refund','admin_credit','admin_debit','coupon','adjustment') NOT NULL,
	`description` text,
	`related_order_id` int,
	`related_coupon_id` int,
	`new_balance` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `balance_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coupon_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`value` int NOT NULL,
	`description` text,
	`maxRedemptions` int NOT NULL DEFAULT 1,
	`currentRedemptions` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `affiliate_link` varchar(512);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `products` ADD `stock` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` longtext;--> statement-breakpoint
ALTER TABLE `users` ADD `resetToken` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `resetTokenExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_user_id_product_id_unique` UNIQUE(`user_id`,`product_id`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `balance_transactions` ADD CONSTRAINT `balance_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;