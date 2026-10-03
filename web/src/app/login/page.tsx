import type { Metadata } from "next";
import AuthCard from "@/components/staff/AuthCard";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthCard
      title="Staff sign in"
      fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "username" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
      ]}
      submit="Sign in"
      action={signIn}
      footer={{ text: "First time here?", href: "/login/setup", link: "Set up your account" }}
    />
  );
}
