ALTER TABLE "order_messages" ADD COLUMN "kind" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_messages" ADD COLUMN "meta" jsonb;