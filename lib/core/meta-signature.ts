import crypto from "crypto";

/**
 * Verify a Meta webhook payload against its `X-Hub-Signature-256` header.
 *
 * Meta signs the RAW request body with the app secret, so callers must pass the
 * unparsed body — re-serialising a parsed object will not match the signature.
 *
 * Checks against the provided secret (if given), as well as any configured
 * Meta secrets (INSTAGRAM_APP_SECRET, META_APP_SECRET, FACEBOOK_APP_SECRET).
 *
 * Fails closed: a missing secret, a missing or malformed header, or any
 * mismatch returns false.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  customSecret?: string
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }

  const signature = parts[1];

  const candidateSecrets = [
    customSecret,
    process.env.INSTAGRAM_APP_SECRET,
    process.env.META_APP_SECRET,
    process.env.FACEBOOK_APP_SECRET,
  ].filter((s): s is string => Boolean(s && s.trim().length > 0));

  if (candidateSecrets.length === 0) {
    console.warn(
      "[meta-signature] No Meta app secret configured (INSTAGRAM_APP_SECRET / META_APP_SECRET / FACEBOOK_APP_SECRET) — rejecting webhook."
    );
    return false;
  }

  for (const appSecret of candidateSecrets) {
    const expectedSignature = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

    if (signature.length === expectedSignature.length) {
      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(signature, "utf8"),
            Buffer.from(expectedSignature, "utf8")
          )
        ) {
          return true;
        }
      } catch {
        // Continue checking other candidates
      }
    }
  }

  return false;
}
