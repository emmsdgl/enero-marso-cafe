import type { Metadata } from "next";
import AuthCard from "@/components/staff/AuthCard";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthCard
      title="Staff sign in"
      fields={[
        { name: "who", label: "Name or email", autoComplete: "username" },
        { name: "secret", label: "Password or PIN", type: "password", autoComplete: "current-password", hint: "Employees can use their PIN on the cafe Wi-Fi or tablet" },
      ]}
      submit="Sign in"
      action={signIn}
      footer={{ text: "First time here?", href: "/login/setup", link: "Set up your account" }}
    />
  );
}
