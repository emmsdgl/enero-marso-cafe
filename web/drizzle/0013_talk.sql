CREATE TABLE "talk_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branches" text[] NOT NULL,
	"staff_id" uuid,
	"kiosk_id" uuid,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"ms" integer NOT NULL,
	"audio" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "talk_clips_size" CHECK (octet_length("talk_clips"."audio") <= 1500000),
	CONSTRAINT "talk_clips_length" CHECK ("talk_clips"."ms" between 0 and 65000)
);
--> statement-breakpoint
CREATE TABLE "talk_floor" (
	"branch_id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talk_heard" (
	"clip_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"live" boolean DEFAULT false NOT NULL,
	"heard_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "talk_heard_clip_id_staff_id_pk" PRIMARY KEY("clip_id","staff_id")
);
--> statement-breakpoint
CREATE TABLE "talk_presence" (
	"session_id" text PRIMARY KEY NOT NULL,
	"staff_id" uuid,
	"kiosk_id" uuid,
	"name" text NOT NULL,
	"branches" text[] NOT NULL,
	"track_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "talk_presence_who" CHECK ("talk_presence"."staff_id" is not null or "talk_presence"."kiosk_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "talk" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "talk_clips" ADD CONSTRAINT "talk_clips_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_clips" ADD CONSTRAINT "talk_clips_kiosk_id_kiosks_id_fk" FOREIGN KEY ("kiosk_id") REFERENCES "public"."kiosks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_floor" ADD CONSTRAINT "talk_floor_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_heard" ADD CONSTRAINT "talk_heard_clip_id_talk_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."talk_clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_heard" ADD CONSTRAINT "talk_heard_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_presence" ADD CONSTRAINT "talk_presence_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_presence" ADD CONSTRAINT "talk_presence_kiosk_id_kiosks_id_fk" FOREIGN KEY ("kiosk_id") REFERENCES "public"."kiosks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "talk_clips_created" ON "talk_clips" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "talk_presence_seen" ON "talk_presence" USING btree ("seen_at");