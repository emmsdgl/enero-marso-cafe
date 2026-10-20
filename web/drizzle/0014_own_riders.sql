ALTER TABLE "branches" ADD COLUMN "delivery_base_fee" integer DEFAULT 49 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "delivery_base_meters" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "delivery_per_km" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "cash_on_delivery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cash_tendered" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rider_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_staff_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_rider_status" ON "orders" USING btree ("rider_id","status");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_delivery_base_fee" CHECK ("branches"."delivery_base_fee" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_delivery_base_meters" CHECK ("branches"."delivery_base_meters" in (1000, 2000, 3000, 5000));--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_delivery_per_km" CHECK ("branches"."delivery_per_km" between 0 and 200);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_tendered" CHECK ("orders"."cash_tendered" is null or "orders"."cash_tendered" between 1 and 100000);