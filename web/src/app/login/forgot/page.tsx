import type { Metadata } from "next";
import ResetPassword from "@/components/staff/ResetPassword";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ResetPassword />;
}
