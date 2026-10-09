import { describe, expect, it } from "vitest";
import { hashOrderToken, newOrderCode, newOrderToken, tokenMatches } from "./order-token";

describe("order token", () => {
  it("is 32 random bytes, different every time", () => {
    const a = newOrderToken();
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(newOrderToken()).not.toBe(a);
  });

  it("is stored only as a hash, and only the real token matches it", () => {
    const token = newOrderToken();
    const stored = hashOrderToken(token);
    expect(stored).not.toContain(token);
    expect(tokenMatches(token, stored)).toBe(true);
    expect(tokenMatches(newOrderToken(), stored)).toBe(false);
    expect(tokenMatches("", stored)).toBe(false);
    expect(tokenMatches(null, stored)).toBe(false);
    expect(tokenMatches("x".repeat(500), stored)).toBe(false);
  });
});

describe("order code", () => {
  it("is short and avoids characters that are easy to mishear", () => {
    for (let i = 0; i < 200; i++) expect(newOrderCode()).toMatch(/^EM-[234679ACDEFGHJKMNPQRTUVWXYZ]{6}$/);
  });
});
