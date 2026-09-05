import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "upcoming",
  "live",
  "ended",
  "cancelled",
]);

export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "approved",
  "denied",
  "cancelled",
  "checked_in",
]);

// ── users ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  privyUserId: text("privy_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  linkedWallet: text("linked_wallet"),
  ensSubname: text("ens_subname").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── events ─────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  coverImageCid: text("cover_image_cid"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  price: numeric("price", { precision: 18, scale: 8 }).notNull().default("0"),
  capacity: integer("capacity"), // null = unlimited
  requiresApproval: boolean("requires_approval").notNull().default(false),
  escrowContractAddress: text("escrow_contract_address"),
  status: eventStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── join_requests ──────────────────────────────────────

export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    paymentTxHash: text("payment_tx_hash"),
    ticketId: text("ticket_id"),
    selfieCheckNullifier: text("selfie_check_nullifier"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("join_requests_event_user_unique").on(table.eventId, table.userId),
    unique("join_requests_event_nullifier_unique").on(
      table.eventId,
      table.selfieCheckNullifier
    ),
  ]
);

// ── co_hosts ───────────────────────────────────────────

export const coHosts = pgTable(
  "co_hosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissions: jsonb("permissions").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("co_hosts_event_user_unique").on(table.eventId, table.userId),
  ]
);
