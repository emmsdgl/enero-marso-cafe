CREATE TABLE "rider_locations" (
	"rider_id" uuid PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rider_locations_accuracy" CHECK ("rider_locations"."accuracy" between 0 and 2000)
);
--> statement-breakpoint
ALTER TABLE "rider_locations" ADD CONSTRAINT "rider_locations_rider_id_staff_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;