CREATE TYPE "public"."event_status" AS ENUM('draft', 'upcoming', 'live', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."join_request_status" AS ENUM('pending', 'approved', 'denied', 'cancelled', 'checked_in');--> statement-breakpoint
CREATE TABLE "co_hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "co_hosts_event_user_unique" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" text,
	"cover_image_cid" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"price" numeric(18, 8) DEFAULT '0' NOT NULL,
	"capacity" integer,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"escrow_contract_address" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "join_request_status" DEFAULT 'pending' NOT NULL,
	"payment_tx_hash" text,
	"ticket_id" text,
	"selfie_check_nullifier" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "join_requests_event_user_unique" UNIQUE("event_id","user_id"),
	CONSTRAINT "join_requests_event_nullifier_unique" UNIQUE("event_id","selfie_check_nullifier")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_user_id" text NOT NULL,
	"email" text NOT NULL,
	"linked_wallet" text,
	"ens_subname" text,
	"first_name" text,
	"last_name" text,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_privy_user_id_unique" UNIQUE("privy_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_ens_subname_unique" UNIQUE("ens_subname")
);
--> statement-breakpoint
ALTER TABLE "co_hosts" ADD CONSTRAINT "co_hosts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_hosts" ADD CONSTRAINT "co_hosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;