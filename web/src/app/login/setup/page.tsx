import type { Metadata } from "next";
import AuthCard from "@/components/staff/AuthCard";
import { setUpAccount } from "../actions";

export const metadata: Metadata = { title: "Set up your account", robots: { index: false } };

export default function SetupAccountPage() {
  return (
    <AuthCard
      title="Set up your account"
      intro="Use the email the admin added for you, then choose your password."
      fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "username" },
        { name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 8 characters" },
      ]}
      submit="Create my account"
      action={setUpAccount}
      footer={{ text: "Already set up?", href: "/login", link: "Sign in" }}
    />
  );
}
