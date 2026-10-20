/**
 * Who does what in the staff app. Pure, so it's tested. Every page and action asks these
 * questions instead of comparing role names, so a new role can't slip through a gap.
 *
 * - employee: works the counter, clocks in, signs in with a PIN at the branch
 * - manager: runs one branch (team, menu, hours, setup)
 * - admin: the owner, both branches
 * - rider: delivers; sees only the orders given to them, never the board
 */
export const ROLES = ["employee", "manager", "admin", "rider"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { employee: "Employee", manager: "Branch manager", admin: "Admin", rider: "Rider" };

/** Everyone who works the counter and the orders board */
export const COUNTER: Role[] = ["employee", "manager", "admin"];
export const ALL_ROLES: Role[] = [...ROLES];

type Person = { id: string; role: Role; branchId: string | null };

export const isManager = (p: { role: Role }) => p.role === "manager" || p.role === "admin";

/** PIN sign-in (on the branch Wi-Fi or the counter tablet): people without a desk job's password habits */
export const usesPin = (role: Role) => role === "employee" || role === "rider";

/** Everyone but the owner clocks in and out */
export const clocksIn = (role: Role) => role !== "admin";

/** Whose hours someone sees: their own, their branch's, or everyone's */
export const hoursScope = (p: { role: Role }): "own" | "branch" | "all" => (p.role === "admin" ? "all" : p.role === "manager" ? "branch" : "own");

/** Where someone lands in the staff app */
export const homeFor = (p: { role: Role }) => (p.role === "rider" ? "/staff/deliveries" : "/staff");

/** Riders see only the orders they're delivering; everyone else sees their branch's (the admin, both) */
export function canSeeOrder(p: Person, o: { branchId: string; riderId: string | null }) {
  if (p.role === "rider") return o.riderId === p.id;
  return p.role === "admin" || p.branchId === o.branchId;
}

/** Who can be sent out with a delivery: riders, and counter staff on shift at that branch */
export function canDeliver(p: { role: Role; branchId: string | null; active: boolean }, branchId: string, onShift: boolean) {
  if (!p.active || p.branchId !== branchId) return false;
  return p.role === "rider" || ((p.role === "employee" || p.role === "manager") && onShift);
}
