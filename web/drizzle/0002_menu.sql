CREATE TABLE "menu_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"sizes" jsonb,
	"kind" text NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"prices" jsonb NOT NULL,
	"star" boolean DEFAULT false NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"home_pick" integer,
	"sort" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "menu_notes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_addons" ADD CONSTRAINT "menu_addons_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_updated_by_staff_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_categories_branch_slug" ON "menu_categories" USING btree ("branch_id","slug");--> statement-breakpoint
CREATE INDEX "menu_items_category" ON "menu_items" USING btree ("category_id","sort");