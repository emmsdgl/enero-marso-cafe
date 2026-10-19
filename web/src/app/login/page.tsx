import type { Metadata } from "next";
import AuthCard from "@/components/staff/AuthCard";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, tablet } = await searchParams;
  // Setting up the clock-in tablet: a manager signs in on it once, and is signed out again after
  const settingUp = tablet === "1";
  return (
    <AuthCard
      title={settingUp ? "Set up this tablet" : "Staff sign in"}
      intro={settingUp ? "A branch manager signs in here once to make this the clock-in tablet. You’re signed out again as soon as it’s done." : undefined}
      fields={[
        { name: "who", label: "Name or email", autoComplete: "username" },
        { name: "secret", label: "Password or PIN", type: "password", autoComplete: "current-password", hint: settingUp ? undefined : "Employees can use their PIN on the cafe Wi-Fi or tablet" },
      ]}
      submit="Sign in"
      action={signIn}
      hidden={typeof next === "string" ? { next } : undefined}
      footer={settingUp ? undefined : { text: "First time here?", href: "/login/setup", link: "Set up your account" }}
    />
  );
}
