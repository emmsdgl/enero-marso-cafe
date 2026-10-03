import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** The two locations. Ids match src/data/branches.ts. */
export const branches = pgTable("branches", {
  id: text("id").primaryKey(), // "main" | "noir"
  name: text("name").notNull(),
});

/**
 * One row per person who works for Enero Marso. Access comes from this table, not from having a login:
 * a Neon Auth user without an active staff row can't see anything.
 */
export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id").unique(), // set when the person finishes account setup
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: text("role", { enum: ["employee", "manager", "admin"] }).notNull(),
    branchId: text("branch_id").references(() => branches.id), // null for admin (both branches)
    pinHash: text("pin_hash"), // for the clock-in tablet
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("staff_role_branch", sql`(${t.role} = 'admin') or (${t.branchId} is not null)`),
  ],
);

/** Internet connections (public IPs) that count as "on the branch Wi-Fi" for clocking in from a phone */
export const branchNetworks = pgTable(
  "branch_networks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: text("branch_id").notNull().references(() => branches.id),
    ip: text("ip").notNull(),
    label: text("label").notNull(),
    createdBy: uuid("created_by").references(() => staff.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("branch_networks_branch_ip").on(t.branchId, t.ip)],
);

/** Devices registered as a branch's shared clock-in tablet. Only a hash of the device token is stored. */
export const kiosks = pgTable("kiosks", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: text("branch_id").notNull().references(() => branches.id),
  label: text("label").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdBy: uuid("created_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/** Clock in / clock out. An entry with no clock_out is a shift in progress (at most one per person). */
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").notNull().references(() => staff.id),
    branchId: text("branch_id").notNull().references(() => branches.id),
    clockIn: timestamp("clock_in", { withTimezone: true }).notNull().defaultNow(),
    clockOut: timestamp("clock_out", { withTimezone: true }),
    inMethod: text("in_method", { enum: ["tablet", "wifi", "manual"] }).notNull(),
    outMethod: text("out_method", { enum: ["tablet", "wifi", "manual"] }),
    inIp: text("in_ip"),
    outIp: text("out_ip"),
    note: text("note"),
    editedBy: uuid("edited_by").references(() => staff.id),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("time_entries_one_open_shift").on(t.staffId).where(sql`${t.clockOut} is null`),
    index("time_entries_branch_in").on(t.branchId, t.clockIn),
    check("time_entries_out_after_in", sql`${t.clockOut} is null or ${t.clockOut} > ${t.clockIn}`),
  ],
);

/** Who changed what: account changes, edited time records, network and tablet registrations */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => staff.id),
    action: text("action").notNull(),
    detail: jsonb("detail"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_at").on(t.at)],
);

export type Staff = typeof staff.$inferSelect;
export type Role = Staff["role"];
export type TimeEntry = typeof timeEntries.$inferSelect;
