import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, staff } from "@/db";
import AuthCard from "@/components/staff/AuthCard";
import { setUpOwner } from "../login/actions";

export const metadata: Metadata = { title: "Owner setup", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One-time: creates the owner's admin account, then locks itself */
export default async function OwnerSetupPage() {
  const [admin] = await db.select({ id: staff.id }).from(staff).where(eq(staff.role, "admin")).limit(1);
  if (admin) redirect("/login");
  return (
    <AuthCard
      title="Owner setup"
      intro="Create the owner's admin account. This page closes for good once it's done."
      fields={[
        { name: "name", label: "Your name", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "username" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters" },
        { name: "code", label: "Setup code", inputMode: "numeric", hint: "The 6-digit code from the project settings" },
      ]}
      submit="Create admin account"
      action={setUpOwner}
    />
  );
}
