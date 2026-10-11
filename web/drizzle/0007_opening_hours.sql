CREATE TABLE "branch_hours" (
	"branch_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"opens_at" integer,
	"closes_at" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "branch_hours_branch_id_weekday_pk" PRIMARY KEY("branch_id","weekday"),
	CONSTRAINT "branch_hours_weekday" CHECK ("branch_hours"."weekday" between 0 and 6),
	CONSTRAINT "branch_hours_times" CHECK (("branch_hours"."opens_at" is null and "branch_hours"."closes_at" is null) or ("branch_hours"."opens_at" between 0 and 1439 and "branch_hours"."closes_at" between 0 and 1439 and "branch_hours"."opens_at" <> "branch_hours"."closes_at"))
);
--> statement-breakpoint
CREATE TABLE "branch_special_days" (
	"branch_id" text NOT NULL,
	"day" date NOT NULL,
	"opens_at" integer,
	"closes_at" integer,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_special_days_branch_id_day_pk" PRIMARY KEY("branch_id","day"),
	CONSTRAINT "branch_special_days_times" CHECK (("branch_special_days"."opens_at" is null and "branch_special_days"."closes_at" is null) or ("branch_special_days"."opens_at" between 0 and 1439 and "branch_special_days"."closes_at" between 0 and 1439 and "branch_special_days"."opens_at" <> "branch_special_days"."closes_at"))
);
--> statement-breakpoint
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_special_days" ADD CONSTRAINT "branch_special_days_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The hours the site has shown until now: the main cafe 6 PM - 1 AM and closed Mondays;
-- Cafe Noir 9 AM - 1 AM, with a short Tuesday (1 PM - 10 PM). Minutes from midnight.
INSERT INTO "branch_hours" ("branch_id", "weekday", "opens_at", "closes_at") VALUES
  ('main', 0, 1080, 60), ('main', 1, NULL, NULL), ('main', 2, 1080, 60), ('main', 3, 1080, 60),
  ('main', 4, 1080, 60), ('main', 5, 1080, 60), ('main', 6, 1080, 60),
  ('noir', 0, 540, 60), ('noir', 1, 540, 60), ('noir', 2, 780, 1320), ('noir', 3, 540, 60),
  ('noir', 4, 540, 60), ('noir', 5, 540, 60), ('noir', 6, 540, 60)
ON CONFLICT DO NOTHING;
