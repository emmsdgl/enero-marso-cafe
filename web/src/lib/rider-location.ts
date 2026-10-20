import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, orders, riderLocations, type Order, type Staff } from "@/db";
import { MIN_GAP_MS, readSpot, spotState } from "./rider-rules";

/**
 * The rider's live position: saved only while they have a delivery of ours on its way, shown only
 * to those orders' customers, and removed when they're done. No history is kept.
 */
export type SpotView = { lat: number; lng: number; accuracy: number; ageMs: number };

/** From the rider's phone. Ignored (saved: false) if it comes sooner than 8 s after the last one. */
export async function saveRiderSpot(me: Staff, input: unknown): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const spot = readSpot(input);
  if (!spot) return { ok: false, error: "That location isn't precise enough to share." };
  const [out] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.riderId, me.id), eq(orders.status, "out_for_delivery"), eq(orders.deliveryProvider, "own_rider")))
    .limit(1);
  if (!out) return { ok: false, error: "You have nothing on its way, so your location isn't shared." };
  const r = await db.execute(sql`
    insert into rider_locations (rider_id, lat, lng, accuracy, at)
    values (${me.id}, ${spot.lat}, ${spot.lng}, ${spot.accuracy}, now())
    on conflict (rider_id) do update set lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy, at = excluded.at
      where rider_locations.at < now() - ${MIN_GAP_MS} * interval '1 millisecond'
    returning rider_id`);
  return { ok: true, saved: r.rows.length > 0 };
}

/** For the customer: their rider's position, only while their order is on its way with one of ours */
export async function riderSpotFor(o: Pick<Order, "status" | "deliveryProvider" | "riderId">): Promise<SpotView | null> {
  if (o.status !== "out_for_delivery" || o.deliveryProvider !== "own_rider" || !o.riderId) return null;
  const [row] = await db
    .select({
      lat: riderLocations.lat,
      lng: riderLocations.lng,
      accuracy: riderLocations.accuracy,
      // On the database's clock, the one that stamped it
      ageMs: sql<number>`(extract(epoch from (now() - ${riderLocations.at})) * 1000)::int`,
    })
    .from(riderLocations)
    .where(eq(riderLocations.riderId, o.riderId))
    .limit(1);
  return row && spotState(row.ageMs).state !== "gone" ? row : null;
}

/** A rider with nothing left on its way (delivered, or called off) stops being shown */
export async function clearSpotIfIdle(riderId: string | null) {
  if (!riderId) return;
  const [still] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.riderId, riderId), eq(orders.status, "out_for_delivery")))
    .limit(1);
  if (!still) await db.delete(riderLocations).where(eq(riderLocations.riderId, riderId));
}

/** Nightly: anything a phone left behind */
export async function removeOldSpots() {
  await db.delete(riderLocations).where(lt(riderLocations.at, sql`now() - interval '1 day'`));
}
