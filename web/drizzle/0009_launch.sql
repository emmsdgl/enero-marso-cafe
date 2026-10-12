CREATE TABLE "blocked_phones" (
	"phone" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"blocked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "blocked_phones" ADD CONSTRAINT "blocked_phones_blocked_by_staff_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;