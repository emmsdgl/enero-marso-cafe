ALTER TABLE "orders" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "invite_hash" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "invite_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "invite_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "orders_email_sent" ON "orders" USING btree ("email_sent_at");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_invite_hash_unique" UNIQUE("invite_hash");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_email" CHECK ("orders"."customer_email" is null or char_length("orders"."customer_email") between 3 and 254);