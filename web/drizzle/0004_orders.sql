CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid,
	"name" text NOT NULL,
	"size" text,
	"upsized" boolean DEFAULT false NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit_price" integer NOT NULL,
	"qty" integer NOT NULL,
	"line_total" integer NOT NULL,
	"sort" integer NOT NULL,
	CONSTRAINT "order_items_qty" CHECK ("order_items"."qty" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"branch_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"fulfillment" text NOT NULL,
	"wanted_at" timestamp with time zone,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"notes" text,
	"address" text,
	"landmark" text,
	"lat" double precision,
	"lng" double precision,
	"plus_code" text,
	"delivery_provider" text,
	"delivery_fee" integer,
	"tracking_url" text,
	"subtotal" integer NOT NULL,
	"total" integer NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"gcash_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"out_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"accepted_by" uuid,
	"created_ip" text,
	CONSTRAINT "orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "orders_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "order_cutoff_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD COLUMN "upsize_price" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_accepted_by_staff_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order" ON "order_items" USING btree ("order_id","sort");--> statement-breakpoint
CREATE INDEX "orders_branch_created" ON "orders" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_created" ON "orders" USING btree ("customer_phone","created_at");--> statement-breakpoint
CREATE INDEX "orders_ip_created" ON "orders" USING btree ("created_ip","created_at");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_order_cutoff" CHECK ("branches"."order_cutoff_minutes" in (30, 45, 60));--> statement-breakpoint
-- Sections whose printed note says "Upsize +₱15" can be upsized for ₱15
UPDATE "menu_categories" SET "upsize_price" = 15 WHERE "note" ILIKE '%upsize +₱15%';
