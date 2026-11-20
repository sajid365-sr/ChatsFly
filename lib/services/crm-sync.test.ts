import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizePhone, shouldUpgradeStage, syncSessionToCrmContact } from "./crm-sync";
import { db } from "@/lib/core/db";

vi.mock("@/lib/core/db", () => ({
  db: {
    chatbot: {
      findFirst: vi.fn(),
    },
    workspace: {
      findFirst: vi.fn(),
    },
    chatSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contactIdentity: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    order: {
      count: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    crmActivity: {
      create: vi.fn(),
    },
  },
}));

describe("CRM Sync Service", () => {
  describe("normalizePhone", () => {
    it("normalizes BD 13-digit numbers starting with 880", () => {
      expect(normalizePhone("8801712345678")).toBe("01712345678");
      expect(normalizePhone("+8801812345678")).toBe("01812345678");
    });

    it("normalizes 10-digit numbers starting with 1 to 01...", () => {
      expect(normalizePhone("1912345678")).toBe("01912345678");
    });

    it("keeps already normalized 11-digit numbers", () => {
      expect(normalizePhone("01712345678")).toBe("01712345678");
    });

    it("returns null for empty or too short inputs", () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone("")).toBeNull();
      expect(normalizePhone("123")).toBeNull();
    });
  });

  describe("shouldUpgradeStage", () => {
    it("allows upgrading to a higher priority stage", () => {
      expect(shouldUpgradeStage("new", "qualified")).toBe(true);
      expect(shouldUpgradeStage("qualified", "customer")).toBe(true);
      expect(shouldUpgradeStage("customer", "repeat")).toBe(true);
      expect(shouldUpgradeStage(null, "new")).toBe(true);
    });

    it("prevents downgrading from a customer state back to new or qualified", () => {
      expect(shouldUpgradeStage("customer", "new")).toBe(false);
      expect(shouldUpgradeStage("customer", "qualified")).toBe(false);
      expect(shouldUpgradeStage("repeat", "customer")).toBe(false);
      expect(shouldUpgradeStage("qualified", "new")).toBe(false);
    });
  });

  describe("syncSessionToCrmContact", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns null if chatbot is not found", async () => {
      vi.mocked(db.chatbot.findFirst).mockResolvedValue(null);

      const result = await syncSessionToCrmContact({
        chatbotId: "bot_123",
        sessionId: "ig_456",
      });

      expect(result).toBeNull();
    });

    it("creates a new contact with identities if none exists", async () => {
      vi.mocked(db.chatbot.findFirst).mockResolvedValue({
        chatbotId: "bot_123",
        userId: "user_1",
        workspaceId: "ws_1",
      } as unknown as Awaited<ReturnType<typeof db.chatbot.findFirst>>);

      vi.mocked(db.chatSession.findFirst).mockResolvedValue({
        sessionId: "ig_1784",
        chatbotId: "bot_123",
        platform: "instagram",
        guestName: "Sajid Sorker",
        profilePhoto: "https://example.com/pic.jpg",
        aiExtractionData: { phone: "01712345678", address: "Dhanmondi, Dhaka" },
        leadStatus: "high_prospect",
        topic: "Panda Light",
      } as unknown as Awaited<ReturnType<typeof db.chatSession.findFirst>>);

      vi.mocked(db.order.count).mockResolvedValue(0);
      vi.mocked(db.contactIdentity.findUnique).mockResolvedValue(null);
      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const mockCreatedContact = {
        id: "id_1",
        contactId: "cnt_1",
        workspaceId: "ws_1",
        name: "Sajid Sorker",
        email: null,
        phone: "01712345678",
        profilePhoto: "https://example.com/pic.jpg",
        lifecycleStage: "qualified",
        source: "instagram",
        referral: null,
        assignedToUserId: null,
        marketingConsent: false,
        smsConsent: false,
        consentUpdatedAt: null,
        optedOutAt: null,
        customFields: {},
        primaryAddress: "Dhanmondi, Dhaka",
        district: null,
        aiSummary: [],
        buyingIntentScore: 75,
        mergedFromIds: [],
        mergedIntoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contact.create).mockResolvedValue(mockCreatedContact as unknown as Awaited<ReturnType<typeof db.contact.create>>);
      vi.mocked(db.crmActivity.create).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof db.crmActivity.create>>);

      const result = await syncSessionToCrmContact({
        chatbotId: "bot_123",
        sessionId: "ig_1784",
      });

      expect(result).toEqual(mockCreatedContact);
      expect(db.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: "ws_1",
            name: "Sajid Sorker",
            phone: "01712345678",
            source: "instagram",
            lifecycleStage: "qualified",
          }),
        })
      );
    });

    it("updates an existing contact when found by identity", async () => {
      vi.mocked(db.chatbot.findFirst).mockResolvedValue({
        chatbotId: "bot_123",
        userId: "user_1",
        workspaceId: "ws_1",
      } as unknown as Awaited<ReturnType<typeof db.chatbot.findFirst>>);

      vi.mocked(db.chatSession.findFirst).mockResolvedValue({
        sessionId: "ig_1784",
        chatbotId: "bot_123",
        platform: "instagram",
        guestName: "Sajid Sorker",
        profilePhoto: "https://example.com/pic.jpg",
        aiExtractionData: { phone: "01712345678" },
      } as unknown as Awaited<ReturnType<typeof db.chatSession.findFirst>>);

      vi.mocked(db.order.count).mockResolvedValue(1); // Has 1 order -> customer

      const existingContact = {
        id: "id_existing",
        contactId: "cnt_existing",
        workspaceId: "ws_1",
        name: "Instagram Lead",
        email: null,
        phone: null,
        profilePhoto: null,
        lifecycleStage: "new",
        source: "instagram",
        referral: null,
        assignedToUserId: null,
        marketingConsent: false,
        smsConsent: false,
        consentUpdatedAt: null,
        optedOutAt: null,
        customFields: {},
        primaryAddress: null,
        district: null,
        aiSummary: [],
        buyingIntentScore: null,
        mergedFromIds: [],
        mergedIntoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.contactIdentity.findUnique).mockResolvedValue({
        id: "ident_1",
        contactId: "cnt_existing",
        channel: "instagram",
        externalId: "1784",
        chatbotId: "bot_123",
        sessionId: "ig_1784",
        verified: false,
        createdAt: new Date(),
        contact: existingContact,
      } as unknown as Awaited<ReturnType<typeof db.contactIdentity.findUnique>>);

      vi.mocked(db.contact.update).mockResolvedValue({
        ...existingContact,
        name: "Sajid Sorker",
        phone: "01712345678",
        lifecycleStage: "customer",
      } as unknown as Awaited<ReturnType<typeof db.contact.update>>);

      const result = await syncSessionToCrmContact({
        chatbotId: "bot_123",
        sessionId: "ig_1784",
      });

      expect(result).toBeDefined();
      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contactId: "cnt_existing" },
          data: expect.objectContaining({
            name: "Sajid Sorker",
            phone: "01712345678",
            lifecycleStage: "customer",
          }),
        })
      );
    });

    it("extracts phone, address, and summary from chat messages if missing in session", async () => {
      vi.mocked(db.chatbot.findFirst).mockResolvedValue({
        chatbotId: "bot_123",
        userId: "user_1",
        workspaceId: "ws_1",
      } as unknown as Awaited<ReturnType<typeof db.chatbot.findFirst>>);

      vi.mocked(db.chatSession.findFirst).mockResolvedValue({
        sessionId: "ig_9999",
        chatbotId: "bot_123",
        platform: "instagram",
        guestName: "Sajid Sorker",
        profilePhoto: null,
        aiExtractionData: {},
        leadStatus: "none",
        topic: null,
      } as unknown as Awaited<ReturnType<typeof db.chatSession.findFirst>>);

      vi.mocked(db.chatMessage.findMany).mockResolvedValue([
        {
          id: "m1",
          chatbotId: "bot_123",
          userId: "u1",
          sessionId: "ig_9999",
          role: "user",
          content: "আমি একটি পান্ডা লাইট অর্ডার করতে চাই",
          timestamp: new Date("2026-11-17T10:00:00Z"),
          sentByHuman: false,
          mediaType: null,
          mediaUrl: null,
          replyToMessageId: null,
          replyToSnippet: null,
          platformMessageId: null,
        },
        {
          id: "m2",
          chatbotId: "bot_123",
          userId: "u1",
          sessionId: "ig_9999",
          role: "assistant",
          content: "ফোন নাম্বার: 01608331365\nডেলিভারি ঠিকানা: চতর বাজার, গাজীপুর সদর\nঅর্ডার আইডি: ORD-123456",
          timestamp: new Date("2026-11-17T10:05:00Z"),
          sentByHuman: false,
          mediaType: null,
          mediaUrl: null,
          replyToMessageId: null,
          replyToSnippet: null,
          platformMessageId: null,
        },
      ]);

      vi.mocked(db.order.count).mockResolvedValue(0);
      vi.mocked(db.contactIdentity.findUnique).mockResolvedValue(null);
      vi.mocked(db.contact.findFirst).mockResolvedValue(null);
      vi.mocked(db.contact.create).mockResolvedValue({
        id: "id_created",
        contactId: "cnt_created",
        workspaceId: "ws_1",
        name: "Sajid Sorker",
        email: null,
        phone: "01608331365",
        profilePhoto: null,
        lifecycleStage: "customer",
        source: "instagram",
        referral: null,
        assignedToUserId: null,
        marketingConsent: false,
        smsConsent: false,
        consentUpdatedAt: null,
        optedOutAt: null,
        customFields: {},
        primaryAddress: "চতর বাজার, গাজীপুর সদর",
        district: null,
        aiSummary: ['[Instagram • Nov 17] Inquired: "আমি একটি পান্ডা লাইট অর্ডার করতে চাই" • Order confirmed (ORD-123456)'],
        buyingIntentScore: null,
        mergedFromIds: [],
        mergedIntoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof db.contact.create>>);
      vi.mocked(db.crmActivity.create).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof db.crmActivity.create>>);

      const result = await syncSessionToCrmContact({
        chatbotId: "bot_123",
        sessionId: "ig_9999",
      });

      expect(result).toBeDefined();
      expect(db.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: "01608331365",
            primaryAddress: "চতর বাজার, গাজীপুর সদর",
            lifecycleStage: "customer",
            aiSummary: expect.arrayContaining([
              expect.stringContaining("আমি একটি পান্ডা লাইট অর্ডার করতে চাই"),
            ]),
          }),
        })
      );
    });
  });
});
