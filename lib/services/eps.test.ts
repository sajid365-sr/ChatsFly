import { describe, expect, it, vi } from "vitest";
import crypto from "crypto";

vi.mock("server-only", () => ({}));

import {
  normalizeEpsStatus,
  buildEpsMetadata,
  decryptEpsIpn,
} from "./eps";

describe("EPS Service", () => {
  describe("normalizeEpsStatus", () => {
    it("maps success statuses to 'complete'", () => {
      expect(normalizeEpsStatus({ status: "VALID" })).toBe("complete");
      expect(normalizeEpsStatus({ status: "VALIDATED" })).toBe("complete");
      expect(normalizeEpsStatus({ status: "PAID" })).toBe("complete");
      expect(normalizeEpsStatus({ status: "SUCCESS" })).toBe("complete");
    });

    it("maps failure statuses to 'failed'", () => {
      expect(normalizeEpsStatus({ status: "FAILED" })).toBe("failed");
      expect(normalizeEpsStatus({ status: "FAILURE" })).toBe("failed");
      expect(normalizeEpsStatus({ status: "DECLINED" })).toBe("failed");
    });

    it("maps cancel statuses to 'cancelled'", () => {
      expect(normalizeEpsStatus({ status: "CANCELLED" })).toBe("cancelled");
      expect(normalizeEpsStatus({ status: "CANCEL" })).toBe("cancelled");
    });

    it("falls back to 'pending' for unknown or pending statuses", () => {
      expect(normalizeEpsStatus({ status: "PENDING" })).toBe("pending");
      expect(normalizeEpsStatus({ status: "UNKNOWN" })).toBe("pending");
      expect(normalizeEpsStatus({})).toBe("pending");
    });
  });

  describe("buildEpsMetadata", () => {
    it("constructs proper metadata object from EPS payload", () => {
      const payload = {
        tran_id: "eps_test_123",
        val_id: "val_999",
        card_type: "VISA",
        bank_tran_id: "bank_456",
        currency: "BDT",
        status: "VALID",
      };

      const meta = buildEpsMetadata(payload);

      expect(meta.eps_tran_id).toBe("eps_test_123");
      expect(meta.eps_val_id).toBe("val_999");
      expect(meta.payment_method).toBe("visa");
      expect(meta.bank_tran_id).toBe("bank_456");
      expect(meta.currency).toBe("BDT");
      expect(meta.eps_status).toBe("VALID");
      expect(meta.ipn_received).toBe(true);
      expect(typeof meta.ipn_received_at).toBe("string");
    });
  });

  describe("decryptEpsIpn", () => {
    it("successfully decrypts AES-256-CBC payload encrypted with store password", () => {
      const storePassword = "test_store_secret_password_123";
      const originalPayload = {
        tran_id: "eps_tran_45678",
        val_id: "val_12345",
        status: "VALID",
        amount: 2499,
      };

      const keyHash = crypto
        .createHash("sha256")
        .update(storePassword)
        .digest();
      const iv = keyHash.slice(0, 16);

      const cipher = crypto.createCipheriv("aes-256-cbc", keyHash, iv);
      const encryptedBase64 =
        cipher.update(JSON.stringify(originalPayload), "utf8", "base64") +
        cipher.final("base64");

      const decrypted = decryptEpsIpn(encryptedBase64, storePassword);

      expect(decrypted.tran_id).toBe("eps_tran_45678");
      expect(decrypted.status).toBe("VALID");
      expect(decrypted.amount).toBe(2499);
    });

    it("throws error when decryption fails due to invalid password", () => {
      const storePassword = "correct_password";
      const wrongPassword = "wrong_password";

      const keyHash = crypto
        .createHash("sha256")
        .update(storePassword)
        .digest();
      const iv = keyHash.slice(0, 16);

      const cipher = crypto.createCipheriv("aes-256-cbc", keyHash, iv);
      const encryptedBase64 =
        cipher.update(JSON.stringify({ test: 1 }), "utf8", "base64") +
        cipher.final("base64");

      expect(() => decryptEpsIpn(encryptedBase64, wrongPassword)).toThrow();
    });
  });
});
