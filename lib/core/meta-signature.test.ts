import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyMetaSignature } from "./meta-signature";

describe("verifyMetaSignature", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("verifies signature with INSTAGRAM_APP_SECRET", () => {
    const secret = "ig_secret_1234567890abcdef";
    process.env.INSTAGRAM_APP_SECRET = secret;
    delete process.env.META_APP_SECRET;
    delete process.env.FACEBOOK_APP_SECRET;

    const body = JSON.stringify({ entry: [{ id: "ig_123" }] });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const header = `sha256=${hmac}`;

    expect(verifyMetaSignature(body, header)).toBe(true);
  });

  it("verifies signature with customSecret argument", () => {
    const customSecret = "custom_secret_abcdef";
    process.env.FACEBOOK_APP_SECRET = "fb_secret";

    const body = "test body";
    const hmac = crypto.createHmac("sha256", customSecret).update(body).digest("hex");
    const header = `sha256=${hmac}`;

    expect(verifyMetaSignature(body, header, customSecret)).toBe(true);
  });

  it("verifies signature with FACEBOOK_APP_SECRET", () => {
    const secret = "fb_secret_1234567890abcdef";
    process.env.FACEBOOK_APP_SECRET = secret;

    const body = JSON.stringify({ entry: [{ id: "fb_123" }] });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const header = `sha256=${hmac}`;

    expect(verifyMetaSignature(body, header)).toBe(true);
  });

  it("fails verification when signature does not match any secret", () => {
    process.env.FACEBOOK_APP_SECRET = "secret_a";
    process.env.INSTAGRAM_APP_SECRET = "secret_b";

    const body = "some body";
    const hmac = crypto.createHmac("sha256", "wrong_secret").update(body).digest("hex");
    const header = `sha256=${hmac}`;

    expect(verifyMetaSignature(body, header)).toBe(false);
  });

  it("returns false if signature header is missing or malformed", () => {
    process.env.FACEBOOK_APP_SECRET = "secret_a";
    expect(verifyMetaSignature("body", null)).toBe(false);
    expect(verifyMetaSignature("body", "invalid_header")).toBe(false);
    expect(verifyMetaSignature("body", "sha1=invalid")).toBe(false);
  });
});
