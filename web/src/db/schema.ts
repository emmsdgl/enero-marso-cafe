import { sql } from "drizzle-orm";
import { boolean, check, customType, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { CARD_KINDS } from "@/lib/chat-cards";
import { ORDER_STATUSES } from "@/lib/order-rules";
import { ROLES } from "@/lib/roles";

/** The two locations. Ids match src/data/branches.ts. */
export const branches = pgTable(
  "branches",
  {
    id: text("id").primaryKey(), // "main" | "noir"
    name: text("name").notNull(),
    /** Fine print under the menu, e.g. "All espresso drinks come with 2 shots of espresso." */
    menuNotes: jsonb("menu_notes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Managers switch online ordering on for launch, and off on a night they can't keep up */
    ordersOpen: boolean("orders_open").notNull().default(false),
    /** Online orders stop this many minutes before closing */
    orderCutoffMinutes: integer("order_cutoff_minutes").notNull().default(30),
    // Delivery: the branch's pin, and the rules managers set on Staff > Branch (see lib/delivery.ts)
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    deliveryOpen: boolean("delivery_open").notNull().default(false),
    freeDeliveryMeters: integer("free_delivery_meters").notNull().default(0), // 0 = no free delivery
    maxDeliveryMeters: integer("max_delivery_meters").notNull().default(5000),
    deliveryMinOrder: integer("delivery_min_order").notNull().default(0),
    // Our riders' fee outside the free area: the base fee covers the first stretch, then each started km
    deliveryBaseFee: integer("delivery_base_fee").notNull().default(49),
    deliveryBaseMeters: integer("delivery_base_meters").notNull().default(2000),
    deliveryPerKm: integer("delivery_per_km").notNull().default(8),
    /** Customers may pay the rider in cash (they say which bill, so the rider brings change) */
    cashOnDelivery: boolean("cash_on_delivery").notNull().default(false),
  },
  (t) => [
    check("branches_order_cutoff", sql`${t.orderCutoffMinutes} in (30, 45, 60)`),
    check("branches_free_delivery", sql`${t.freeDeliveryMeters} in (0, 100, 250, 500, 1000, 2000)`),
    check("branches_max_delivery", sql`${t.maxDeliveryMeters} in (2000, 3000, 5000, 8000, 10000)`),
    check("branches_delivery_min_order", sql`${t.deliveryMinOrder} in (0, 200, 300, 500)`),
    check("branches_delivery_base_fee", sql`${t.deliveryBaseFee} between 0 and 1000`),
    check("branches_delivery_base_meters", sql`${t.deliveryBaseMeters} in (1000, 2000, 3000, 5000)`),
    check("branches_delivery_per_km", sql`${t.deliveryPerKm} between 0 and 200`),
  ],
);

/** A day's hours are both times (minutes from midnight; a close before the open runs past midnight) or neither (closed) */
const hoursCheck = (opensAt: unknown, closesAt: unknown) =>
  sql`(${opensAt} is null and ${closesAt} is null) or (${opensAt} between 0 and 1439 and ${closesAt} between 0 and 1439 and ${opensAt} <> ${closesAt})`;

/** Each branch's weekly opening hours, one row per weekday. Managers edit them on Staff > Branch. */
export const branchHours = pgTable(
  "branch_hours",
  {
    branchId: text("branch_id").notNull().references(() => branches.id),
    weekday: integer("weekday").notNull(), // 0 = Sunday … 6 = Saturday
    opensAt: integer("opens_at"), // null with closes_at = closed that day
    closesAt: integer("closes_at"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (t) => [
    primaryKey({ columns: [t.branchId, t.weekday] }),
    check("branch_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("branch_hours_times", hoursCheck(t.opensAt, t.closesAt)),
  ],
);

/** A date with different hours from the usual week: closed for a holiday, or open late for an event */
export const branchSpecialDays = pgTable(
  "branch_special_days",
  {
    branchId: text("branch_id").notNull().references(() => branches.id),
    day: date("day", { mode: "string" }).notNull(), // the Manila calendar date
    opensAt: integer("opens_at"), // both null = closed all day
    closesAt: integer("closes_at"),
    note: text("note"), // "Christmas Day"
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.day] }), check("branch_special_days_times", hoursCheck(t.opensAt, t.closesAt))],
);

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
    role: text("role", { enum: ROLES }).notNull(),
    branchId: text("branch_id").references(() => branches.id), // null for admin (both branches)
    pinHash: text("pin_hash"), // for the clock-in tablet
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Removed from the team by the admin: no access, hidden from the team list, history kept
    removedAt: timestamp("removed_at", { withTimezone: true }),
    // Their personal setup link (only its hash is kept), good until it expires or a new one is made
    inviteHash: text("invite_hash").unique(),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    inviteSentAt: timestamp("invite_sent_at", { withTimezone: true }), // null: the admin copied the link instead of emailing it
    // Set up through an emailed link, so the email is theirs
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
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

/** A branch's menu sections (Caffeinated, Signature…). Prices in the section line up with its sizes. */
export const menuCategories = pgTable(
  "menu_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: text("branch_id").notNull().references(() => branches.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    note: text("note"),
    sizes: jsonb("sizes").$type<string[]>(), // null = one price per item
    kind: text("kind", { enum: ["drink", "food"] }).notNull(),
    upsizePrice: integer("upsize_price"), // "Upsize +₱15"; null = no upsize in this section
    sort: integer("sort").notNull(),
  },
  (t) => [uniqueIndex("menu_categories_branch_slug").on(t.branchId, t.slug)],
);

/** One drink or dish. prices[i] is its price in the section's sizes[i]; null = not offered in that size. */
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").notNull().references(() => menuCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    note: text("note"),
    description: text("description"), // what customers read when they tap (i) on the order page
    prices: jsonb("prices").$type<(number | null)[]>().notNull(),
    star: boolean("star").notNull().default(false), // marked ★ on the printed menu
    available: boolean("available").notNull().default(true), // false = sold out
    homePick: integer("home_pick"), // featured on the homepage, in this order
    sort: integer("sort").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by").references(() => staff.id),
  },
  (t) => [index("menu_items_category").on(t.categoryId, t.sort)],
);

/** Extras that go on a drink (extra shot, sinkers, oat milk…), per branch */
export const menuAddons = pgTable("menu_addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: text("branch_id").notNull().references(() => branches.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  available: boolean("available").notNull().default(true),
  sort: integer("sort").notNull(),
});

/**
 * Where delivery customers send money: a branch's GCash, Maya or bank accounts. The QR is kept
 * as the text inside it (checked as a peso payment code), and drawn fresh for customers.
 * Accounts are switched off rather than deleted, so past orders still show where they paid.
 */
export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: text("branch_id").notNull().references(() => branches.id),
    kind: text("kind", { enum: ["gcash", "maya", "bank", "other"] }).notNull(),
    label: text("label").notNull(), // "GCash", "BPI savings"
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number"), // for "send to this number"; optional when there's a QR
    qrPayload: text("qr_payload"),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by").references(() => staff.id),
  },
  (t) => [
    index("payment_accounts_branch").on(t.branchId, t.sort),
    check("payment_accounts_way_to_pay", sql`${t.accountNumber} is not null or ${t.qrPayload} is not null`),
  ],
);

/**
 * An online order. The customer's link carries a secret token; only its hash is stored here.
 * Names and prices are copied into order_items, so later menu edits never change an order.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull().unique(), // "EM-7KQ4P2", said out loud at the counter
    branchId: text("branch_id").notNull().references(() => branches.id),
    tokenHash: text("token_hash").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    fulfillment: text("fulfillment", { enum: ["pickup", "delivery"] }).notNull(),
    wantedAt: timestamp("wanted_at", { withTimezone: true }), // null = as soon as possible
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"), // optional: the order's private link is emailed once
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    notes: text("notes"),
    // Delivery (Lalamove) — filled from milestone 4
    address: text("address"),
    landmark: text("landmark"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    plusCode: text("plus_code"),
    deliveryProvider: text("delivery_provider", { enum: ["lalamove", "own_rider"] }),
    deliveryFee: integer("delivery_fee"), // null until staff confirm it
    trackingUrl: text("tracking_url"),
    distanceMeters: integer("distance_meters"), // straight line from the branch pin, at order time
    quotedAt: timestamp("quoted_at", { withTimezone: true }), // staff confirmed the order and the fee
    // Money, in whole pesos
    subtotal: integer("subtotal").notNull(),
    total: integer("total").notNull(),
    paymentMethod: text("payment_method", { enum: ["cash", "gcash", "transfer"] }), // transfer = paid to a payment account
    paymentStatus: text("payment_status", { enum: ["unpaid", "submitted", "verified", "refunded"] }).notNull().default("unpaid"),
    gcashRef: text("gcash_ref"), // the reference number from the customer's receipt (any app)
    paymentAccountId: uuid("payment_account_id").references(() => paymentAccounts.id),
    paymentSubmittedAt: timestamp("payment_submitted_at", { withTimezone: true }),
    paymentVerifiedAt: timestamp("payment_verified_at", { withTimezone: true }),
    paymentVerifiedBy: uuid("payment_verified_by").references(() => staff.id),
    // Cash on delivery: the bill the customer pays with (the total for "exact amount"), so the rider brings change
    cashTendered: integer("cash_tendered"),
    // Our rider (a rider, or counter staff on shift) taking this delivery
    riderId: uuid("rider_id").references(() => staff.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    // Timeline
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    outAt: timestamp("out_at", { withTimezone: true }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    acceptedBy: uuid("accepted_by").references(() => staff.id),
    createdIp: text("created_ip"),
    // Chat: when each side last looked, so the other side's newer messages count as unread
    staffLastReadAt: timestamp("staff_last_read_at", { withTimezone: true }),
    customerLastReadAt: timestamp("customer_last_read_at", { withTimezone: true }),
    // After a year the customer's details are removed (lib/retention.ts); totals stay for the books
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
  },
  (t) => [
    index("orders_branch_created").on(t.branchId, t.createdAt),
    index("orders_phone_created").on(t.customerPhone, t.createdAt),
    index("orders_ip_created").on(t.createdIp, t.createdAt),
    // Staff are warned when a reference number was already used on another order
    index("orders_gcash_ref").on(t.gcashRef),
    index("orders_rider_status").on(t.riderId, t.status),
    check("orders_cash_tendered", sql`${t.cashTendered} is null or ${t.cashTendered} between 1 and 100000`),
    check("orders_customer_email", sql`${t.customerEmail} is null or char_length(${t.customerEmail}) between 3 and 254`),
    // Order emails are capped per day
    index("orders_email_sent").on(t.emailSentAt),
  ],
);

export type OrderAddon = { name: string; price: number };

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => menuItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    size: text("size"), // "Medium", "16 oz"; null for one-price items
    upsized: boolean("upsized").notNull().default(false),
    addons: jsonb("addons").$type<OrderAddon[]>().notNull().default(sql`'[]'::jsonb`),
    unitPrice: integer("unit_price").notNull(), // size price + upsize + add-ons
    qty: integer("qty").notNull(),
    lineTotal: integer("line_total").notNull(),
    sort: integer("sort").notNull(),
  },
  (t) => [index("order_items_order").on(t.orderId, t.sort), check("order_items_qty", sql`${t.qty} between 1 and 20`)],
);

/**
 * The order's chat between the customer and the branch. System lines record each status change,
 * with a kind and details so the customer's page can draw them as cards (lib/chat-cards.ts).
 * Whether the chat still takes messages is worked out from the order (see chatState), not stored.
 */
export const orderMessages = pgTable(
  "order_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    sender: text("sender", { enum: ["customer", "staff", "system"] }).notNull(),
    staffId: uuid("staff_id").references(() => staff.id), // who replied, for staff messages
    body: text("body").notNull(),
    kind: text("kind", { enum: CARD_KINDS }).notNull().default("text"), // "text" for messages and plain lines
    meta: jsonb("meta").$type<Record<string, unknown>>(), // the card's details: a status, a fee, a reference…
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_messages_order").on(t.orderId, t.createdAt),
    check("order_messages_body", sql`char_length(${t.body}) between 1 and 1000`),
  ],
);

/**
 * A staff phone, tablet or computer that gets notifications. Each browser on each device has its
 * own subscription (endpoint + keys from the browser's push service); it's removed when the push
 * service says it has expired.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").notNull().references(() => staff.id),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    device: text("device").notNull(), // "Chrome on Android"
    orders: boolean("orders").notNull().default(true), // new orders and payments to check
    messages: boolean("messages").notNull().default(true), // customer messages
    talk: boolean("talk").notNull().default(true), // talk this device missed (Staff > Talk)
    onShiftOnly: boolean("on_shift_only").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  },
  (t) => [index("push_subscriptions_staff").on(t.staffId)],
);

/** Numbers that can't order online (pranks, repeated no-shows). Managers block them from an order's page. */
export const blockedPhones = pgTable("blocked_phones", {
  phone: text("phone").primaryKey(), // 09XXXXXXXXX
  reason: text("reason").notNull(),
  blockedBy: uuid("blocked_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Where a rider is, while they have a delivery on its way and their screen on: one row per rider,
 * overwritten every 15 s or so, removed when they're done. No history is kept.
 */
export const riderLocations = pgTable(
  "rider_locations",
  {
    riderId: uuid("rider_id").primaryKey().references(() => staff.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    accuracy: integer("accuracy").notNull(), // meters, as the phone reports it
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("rider_locations_accuracy", sql`${t.accuracy} between 0 and 2000`)],
);

// ——— Push-to-talk (Staff > Talk and the counter tablet) ———

/** Binary data, for the saved talk clips. Sent and read in Postgres's hex form, which the HTTP driver passes as text. */
const bytea = customType<{ data: Buffer; driverData: string | Uint8Array }>({
  dataType: () => "bytea",
  toDriver: (v) => `\\x${v.toString("hex")}`,
  fromDriver: (v) => (typeof v === "string" ? Buffer.from(v.replace(/^\\x/, ""), "hex") : Buffer.from(v)),
});

/** Who holds each branch's Talk channel: one row per branch, free again once `until` has passed */
export const talkFloor = pgTable("talk_floor", {
  branchId: text("branch_id").primaryKey().references(() => branches.id),
  sessionId: text("session_id").notNull(), // the talking device's live audio session
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  until: timestamp("until", { withTimezone: true }).notNull(),
});

/**
 * Devices on Talk now: someone's Talk screen or a counter tablet. Each keeps a live audio session at
 * Cloudflare, and the others pull its microphone. A device that stops checking in has left.
 */
export const talkPresence = pgTable(
  "talk_presence",
  {
    sessionId: text("session_id").primaryKey(),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "cascade" }),
    kioskId: uuid("kiosk_id").references(() => kiosks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    branches: text("branches").array().notNull(), // the channels it's on
    trackName: text("track_name"), // set on its first press, once its microphone track has carried sound
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("talk_presence_seen").on(t.seenAt),
    check("talk_presence_who", sql`${t.staffId} is not null or ${t.kioskId} is not null`),
  ],
);

/** Each press of the talk button, kept 7 days for anyone who wasn't listening (removed nightly) */
export const talkClips = pgTable(
  "talk_clips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branches: text("branches").array().notNull(),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }), // null for a counter tablet
    kioskId: uuid("kiosk_id").references(() => kiosks.id, { onDelete: "set null" }),
    name: text("name").notNull(), // who spoke, as shown at the time
    mime: text("mime").notNull(),
    ms: integer("ms").notNull(),
    audio: bytea("audio").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("talk_clips_created").on(t.createdAt),
    check("talk_clips_size", sql`octet_length(${t.audio}) <= 1500000`),
    check("talk_clips_length", sql`${t.ms} between 0 and 65000`),
  ],
);

/** Who has heard a clip, live or played back later */
export const talkHeard = pgTable(
  "talk_heard",
  {
    clipId: uuid("clip_id").notNull().references(() => talkClips.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
    live: boolean("live").notNull().default(false),
    heardAt: timestamp("heard_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clipId, t.staffId] })],
);

export type Staff = typeof staff.$inferSelect;
export type Role = Staff["role"];
export type TimeEntry = typeof timeEntries.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderMessage = typeof orderMessages.$inferSelect;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
