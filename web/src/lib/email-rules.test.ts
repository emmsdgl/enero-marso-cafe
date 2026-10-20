import { describe, expect, it } from "vitest";
import {
  inviteState, looksLikeEmail, ORDER_EMAILS_PER_DAY, RESET_CODES_PER_PERSON, resetDecision, resetOutcome, STAFF_EMAILS_PER_DAY,
} from "./email-rules";

describe("email limits", () => {
  it("never plan more than Resend's 100 a day", () => {
    expect(ORDER_EMAILS_PER_DAY + STAFF_EMAILS_PER_DAY).toBeLessThanOrEqual(100);
  });

  it("sends a reset code until the person or the day runs out", () => {
    expect(resetDecision(0, 0)).toBe("send");
    expect(resetDecision(RESET_CODES_PER_PERSON - 1, STAFF_EMAILS_PER_DAY - 1)).toBe("send");
    expect(resetDecision(RESET_CODES_PER_PERSON, 0)).toBe("person-limit");
    expect(resetDecision(0, STAFF_EMAILS_PER_DAY)).toBe("day-limit");
  });
});

describe("email addresses", () => {
  it("accepts ordinary addresses and refuses obvious typos", () => {
    expect(looksLikeEmail("ana@gmail.com")).toBe(true);
    expect(looksLikeEmail("ana.reyes+cafe@mail.example.ph")).toBe(true);
    expect(looksLikeEmail("ana@gmail")).toBe(false);
    expect(looksLikeEmail("ana gmail.com")).toBe(false);
    expect(looksLikeEmail("ana @gmail.com")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
    expect(looksLikeEmail(`${"a".repeat(250)}@b.co`)).toBe(false);
  });
});

describe("reset answers", () => {
  it("reads Neon Auth's replies", () => {
    expect(resetOutcome(200)).toBe("ok");
    expect(resetOutcome(400, "INVALID_OTP")).toBe("wrong");
    expect(resetOutcome(400, "OTP_EXPIRED")).toBe("wrong");
    expect(resetOutcome(403, "TOO_MANY_ATTEMPTS")).toBe("too-many");
    expect(resetOutcome(400, "PASSWORD_TOO_SHORT")).toBe("weak");
    expect(resetOutcome(502)).toBe("failed");
  });
});

describe("setup links", () => {
  const now = new Date("2026-10-21T08:00:00Z");
  const later = new Date("2026-10-28T08:00:00Z");
  const base = { authUserId: null, inviteHash: "h", inviteExpiresAt: later, inviteSentAt: now };
  it("tells emailed, copied, run-out and missing links apart", () => {
    expect(inviteState(base, now)).toBe("emailed");
    expect(inviteState({ ...base, inviteSentAt: null }, now)).toBe("copied");
    expect(inviteState(base, later)).toBe("expired");
    expect(inviteState({ ...base, inviteHash: null, inviteExpiresAt: null }, now)).toBe("none");
    expect(inviteState({ ...base, authUserId: "u1" }, now)).toBe("set-up");
  });
});
