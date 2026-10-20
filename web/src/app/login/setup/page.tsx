import type { Metadata } from "next";
import AuthCard, { AuthShell } from "@/components/staff/AuthCard";
import { staffEmailFrom } from "@/lib/email";
import { inviteFor } from "@/lib/invites";
import { setUpAccount } from "../actions";

export const metadata: Metadata = { title: "Set up your account", robots: { index: false } };

const SIGN_IN = [{ text: "Already set up?", href: "/login", link: "Sign in" }];
const PASSWORD = { name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 8 characters" };

export default async function SetupAccountPage({ searchParams }: PageProps<"/login/setup">) {
  const { invite: raw } = await searchParams;
  const token = typeof raw === "string" ? raw : "";

  // A personal setup link: it already says who they are
  if (token) {
    const invite = await inviteFor(token);
    if (!invite) {
      return (
        <AuthShell title="This link has run out" footer={SIGN_IN}>
          <p className="auth-intro">Setup links work for 7 days, and a newer one replaces the old. Ask the admin to send you a new invite.</p>
        </AuthShell>
      );
    }
    return (
      <AuthCard
        title="Set up your account"
        intro={`Hi ${invite.name.trim().split(/\s+/)[0]}. Choose the password you’ll sign in with.`}
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "username", value: invite.email }, PASSWORD]}
        hidden={{ invite: token }}
        submit="Create my account"
        action={setUpAccount}
        footer={SIGN_IN}
      />
    );
  }

  // Once email is set up, everyone sets up through the link in their invite email
  if (staffEmailFrom) {
    return (
      <AuthShell title="Set up your account" footer={SIGN_IN}>
        <p className="auth-intro">Open the setup link in your invite email. No email? Check spam, or ask the admin to send it again.</p>
      </AuthShell>
    );
  }

  return (
    <AuthCard
      title="Set up your account"
      intro="Use the email the admin added for you, then choose your password."
      fields={[{ name: "email", label: "Email", type: "email", autoComplete: "username" }, PASSWORD]}
      submit="Create my account"
      action={setUpAccount}
      footer={SIGN_IN}
    />
  );
}
