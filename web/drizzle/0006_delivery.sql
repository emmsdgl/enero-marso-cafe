CREATE TABLE "payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"qr_payload" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "payment_accounts_way_to_pay" CHECK ("payment_accounts"."account_number" is not null or "payment_accounts"."qr_payload" is not null)
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "delivery_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "free_delivery_meters" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "max_delivery_meters" integer DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "delivery_min_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "distance_meters" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_account_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_verified_by" uuid;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_updated_by_staff_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_accounts_branch" ON "payment_accounts" USING btree ("branch_id","sort");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_account_id_payment_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."payment_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_verified_by_staff_id_fk" FOREIGN KEY ("payment_verified_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_gcash_ref" ON "orders" USING btree ("gcash_ref");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_free_delivery" CHECK ("branches"."free_delivery_meters" in (0, 100, 250, 500, 1000, 2000));--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_max_delivery" CHECK ("branches"."max_delivery_meters" in (2000, 3000, 5000, 8000, 10000));--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_delivery_min_order" CHECK ("branches"."delivery_min_order" in (0, 200, 300, 500));