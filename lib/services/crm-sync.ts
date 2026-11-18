import { db } from "@/lib/core/db";
import type { Prisma } from "@prisma/client";

export interface SyncSessionToContactOptions {
  chatbotId: string;
  sessionId: string;
  guestName?: string | null;
  profilePhoto?: string | null;
  platform?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  buyingIntentScore?: number | null;
  aiSummary?: string[] | string | null;
}

export interface ExtractedSessionInsights {
  summary?: string;
  phone?: string | null;
  address?: string | null;
}

/**
 * Extracts conversation summary and contact info from chat messages if missing.
 */
export async function extractSessionInsightsFromMessages(
  sessionId: string,
  channel: string,
  sessionDate?: Date | null,
  topic?: string | null
): Promise<ExtractedSessionInsights> {
  try {
    const messages = await db.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
      take: 50,
    });

    if (messages.length === 0) return {};

    const userMsgs = messages.filter((m) => m.role === "user" && m.content?.trim());
    const assistantMsgs = messages.filter((m) => (m.role === "assistant" || m.role === "bot") && m.content?.trim());

    // 1. Phone extraction fallback if missing
    let phone: string | null = null;
    const phoneRegex = /(?:\+?88)?(01[3-9]\d{8})\b/;
    for (const m of messages) {
      const match = m.content.match(phoneRegex);
      if (match && match[1]) {
        phone = match[1];
        break;
      }
    }

    // 2. Address extraction fallback if missing
    let address: string | null = null;
    for (const m of messages) {
      const addrMatches = m.content.matchAll(/(?:ডেলিভারি ঠিকানা|ঠিকানা|Address)[:\s*]+([^\n\r]+)/gi);
      for (const match of addrMatches) {
        if (match && match[1]) {
          const val = match[1].replace(/[*_#]/g, "").trim();
          if (val && !val.includes("অনুগ্রহ") && !val.includes("দিন") && !val.startsWith("(") && val.length > 5) {
            address = val;
          }
        }
      }
    }

    // 3. Order ID extraction
    let orderSnippet = "";
    for (const m of assistantMsgs) {
      const orderMatch = m.content.match(/(?:অর্ডার আইডি|Order ID)[:\s*]+([A-Z0-9_-]+)/i);
      if (orderMatch && orderMatch[1]) {
        orderSnippet = `Order confirmed (${orderMatch[1]})`;
        break;
      }
    }

    // 4. Inquiries
    const firstInquiry = userMsgs.find(
      (m) => m.content.trim().length > 3 && !/^(hi|hello|hey|সালাম|হ্যালো)$/i.test(m.content.trim())
    )?.content.trim();

    const channelName = channel.charAt(0).toUpperCase() + channel.slice(1);
    const dateStr = sessionDate
      ? new Date(sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const summaryParts: string[] = [];

    if (firstInquiry) {
      const cleanInquiry = firstInquiry.replace(/[\r\n]+/g, " ");
      const truncated = cleanInquiry.length > 55 ? `${cleanInquiry.slice(0, 52)}...` : cleanInquiry;
      summaryParts.push(`Inquired: "${truncated}"`);
    } else if (topic) {
      summaryParts.push(`Topic: ${topic}`);
    }

    if (orderSnippet) {
      summaryParts.push(orderSnippet);
    } else if (userMsgs.length > 0) {
      summaryParts.push(`${messages.length} msgs exchanged`);
    }

    const summary = summaryParts.length > 0
      ? `[${channelName} • ${dateStr}] ${summaryParts.join(" • ")}`
      : `[${channelName} • ${dateStr}] ${messages.length} messages exchanged`;

    return {
      summary,
      phone,
      address,
    };
  } catch (error) {
    console.error("[CRM_INSIGHT_EXTRACTION_ERROR]", error);
    return {};
  }
}

/**
 * Normalizes common Bangladesh phone numbers or general formats.
 * e.g. "88017XXXXXXXX" -> "017XXXXXXXX", "+88017..." -> "017..."
 */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("880") && digits.length === 13) {
    return digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    return "0" + digits;
  }
  return digits.length >= 7 ? digits : null;
}

const STAGE_RANK: Record<string, number> = {
  new: 1,
  engaged: 2,
  qualified: 3,
  customer: 4,
  repeat: 5,
  lapsed: 0,
};

export function shouldUpgradeStage(current?: string | null, target?: string | null): boolean {
  if (!target) return false;
  if (!current) return true;
  return (STAGE_RANK[target] ?? 0) > (STAGE_RANK[current] ?? 0);
}

function cleanCustomerName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === "instagram user" ||
    lower === "facebook user" ||
    lower === "web user" ||
    lower === "unknown customer" ||
    lower === "ai customer" ||
    lower === "valued customer" ||
    lower === "instagram lead" ||
    lower === "facebook lead" ||
    lower === "new lead" ||
    lower.includes("lead (")
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Automatically syncs chat session customer intelligence to `crm.Contact` and `crm.ContactIdentity`.
 * - Safe against duplicate creation (matches ContactIdentity and phone number).
 * - Upgrades lifecycle stage from `new` -> `qualified` -> `customer` -> `repeat`.
 * - Preserves historical leads even if the live chat session is later deleted.
 */
export async function syncSessionToCrmContact(
  options: SyncSessionToContactOptions
) {
  try {
    const { chatbotId, sessionId } = options;
    if (!chatbotId || !sessionId) return null;

    // 1. Resolve chatbot & workspaceId
    const bot = await db.chatbot.findFirst({
      where: {
        OR: [{ id: chatbotId }, { chatbotId }],
      },
      select: { chatbotId: true, userId: true, workspaceId: true },
    });

    if (!bot) return null;

    let workspaceId = bot.workspaceId;
    if (!workspaceId) {
      const ws = await db.workspace.findFirst({
        where: { userId: bot.userId },
        select: { workspaceId: true },
      });
      workspaceId = ws?.workspaceId ?? null;
    }

    if (!workspaceId) return null;

    // 2. Fetch ChatSession if present
    const session = await db.chatSession.findFirst({
      where: {
        sessionId,
        chatbotId: { in: [bot.chatbotId, chatbotId] },
      },
    });

    // 3. Resolve metadata & extraction details
    const rawMeta = session?.aiExtractionData && typeof session.aiExtractionData === "object" && !Array.isArray(session.aiExtractionData)
      ? (session.aiExtractionData as Record<string, unknown>)
      : {};

    const rawPhone = options.phone ?? (rawMeta.phone as string | undefined) ?? (rawMeta.customerPhone as string | undefined) ?? null;
    let normalizedPhone = normalizePhone(rawPhone);

    let address = options.address ?? (rawMeta.address as string | undefined) ?? (rawMeta.deliveryAddress as string | undefined) ?? null;
    const district = options.district ?? (rawMeta.district as string | undefined) ?? null;

    const guestName = options.guestName ?? session?.guestName ?? null;
    const validName = cleanCustomerName(guestName);

    const profilePhoto = options.profilePhoto ?? session?.profilePhoto ?? null;
    const platform = (options.platform ?? session?.platform ?? "web").toLowerCase().trim();

    // Determine channel and externalId
    let channel = platform;
    let externalId = sessionId;
    if (sessionId.startsWith("ig_")) {
      channel = "instagram";
      externalId = sessionId.slice(3);
    } else if (sessionId.startsWith("fb_")) {
      channel = "facebook";
      externalId = sessionId.slice(3);
    } else if (sessionId.startsWith("wa_")) {
      channel = "whatsapp";
      externalId = sessionId.slice(3);
    }

    // Prepare aiSummary array
    let summaryList: string[] = [];
    if (options.aiSummary) {
      if (Array.isArray(options.aiSummary)) {
        summaryList = options.aiSummary.filter(Boolean);
      } else if (typeof options.aiSummary === "string" && options.aiSummary.trim()) {
        summaryList = [options.aiSummary.trim()];
      }
    } else if (session?.topic) {
      summaryList = [`Inquiry about ${session.topic}`];
    }

    // If summary, phone or address is missing, extract from chat messages
    if (summaryList.length === 0 || !normalizedPhone || !address) {
      const insights = await extractSessionInsightsFromMessages(
        sessionId,
        channel,
        session?.createdAt,
        session?.topic
      );

      if (summaryList.length === 0 && insights.summary) {
        summaryList.push(insights.summary);
      }
      if (!normalizedPhone && insights.phone) {
        normalizedPhone = normalizePhone(insights.phone);
      }
      if (!address && insights.address) {
        address = insights.address;
      }
    }

    // 4. Check Order history to determine customer status
    const orderCount = await db.order.count({
      where: {
        OR: [
          { sessionId },
          ...(normalizedPhone ? [{ customerPhone: normalizedPhone }] : []),
        ],
      },
    });

    // Determine target lifecycle stage
    let targetStage = "new";
    if (orderCount > 1) {
      targetStage = "repeat";
    } else if (orderCount === 1) {
      targetStage = "customer";
    } else if (summaryList.some((s) => s.toLowerCase().includes("order confirmed"))) {
      targetStage = "customer";
    } else if (normalizedPhone || address || session?.leadStatus === "high_prospect" || session?.leadStatus === "successful") {
      targetStage = "qualified";
    } else if (session?.leadStatus === "priority") {
      targetStage = "engaged";
    }

    // 5. Look for existing ContactIdentity
    const existingIdentity = await db.contactIdentity.findUnique({
      where: {
        channel_externalId: {
          channel,
          externalId,
        },
      },
      include: {
        contact: true,
      },
    });

    let contact = existingIdentity?.contact ?? null;

    // If not found by identity, check by phone
    if (!contact && normalizedPhone) {
      contact = await db.contact.findFirst({
        where: {
          workspaceId,
          phone: normalizedPhone,
        },
      });
    }

    // 6. Update existing contact
    if (contact) {
      const shouldUpdateStage = shouldUpgradeStage(contact.lifecycleStage, targetStage);
      const updatedSummaries = summaryList.length > 0
        ? Array.from(new Set([...(contact.aiSummary || []), ...summaryList])).slice(-10)
        : undefined;

      const updateData: Prisma.ContactUpdateInput = {
        ...(validName && (!contact.name || cleanCustomerName(contact.name) === null) && { name: validName }),
        ...(profilePhoto && !contact.profilePhoto && { profilePhoto }),
        ...(normalizedPhone && !contact.phone && { phone: normalizedPhone }),
        ...(address && !contact.primaryAddress && { primaryAddress: address }),
        ...(district && !contact.district && { district }),
        ...(shouldUpdateStage && { lifecycleStage: targetStage }),
        ...(options.buyingIntentScore !== undefined && options.buyingIntentScore !== null && { buyingIntentScore: options.buyingIntentScore }),
        ...(updatedSummaries && { aiSummary: updatedSummaries }),
      };

      if (Object.keys(updateData).length > 0) {
        contact = await db.contact.update({
          where: { contactId: contact.contactId },
          data: updateData,
        });
      }

      // Link identity if not already linked
      await db.contactIdentity.upsert({
        where: {
          channel_externalId: {
            channel,
            externalId,
          },
        },
        create: {
          contactId: contact.contactId,
          channel,
          externalId,
          chatbotId: bot.chatbotId,
          sessionId,
          verified: channel === "whatsapp",
        },
        update: {
          sessionId,
          chatbotId: bot.chatbotId,
        },
      });

      if (summaryList.length > 0) {
        await db.crmActivity.create({
          data: {
            workspaceId,
            eventType: "conversation_summary",
            summary: summaryList[0],
            contactId: contact.contactId,
            metadata: {
              channel,
              sessionId,
              externalId,
              source: "chat_preservation",
            },
          },
        });
      }

      return contact;
    }

    // 7. Create New Contact
    const defaultDisplayName = validName || (guestName && guestName.trim()) || `${channel.charAt(0).toUpperCase() + channel.slice(1)} Lead (${externalId.slice(-4)})`;

    contact = await db.contact.create({
      data: {
        workspaceId,
        name: defaultDisplayName,
        phone: normalizedPhone ?? null,
        profilePhoto: profilePhoto ?? null,
        primaryAddress: address ?? null,
        district: district ?? null,
        source: channel,
        lifecycleStage: targetStage,
        buyingIntentScore: options.buyingIntentScore ?? (session?.leadStatus === "high_prospect" ? 75 : null),
        aiSummary: summaryList,
        identities: {
          create: {
            channel,
            externalId,
            chatbotId: bot.chatbotId,
            sessionId,
            verified: channel === "whatsapp",
          },
        },
      },
    });

    // Log CRM Activity
    await db.crmActivity.create({
      data: {
        workspaceId,
        eventType: "contact_created",
        summary: `Contact automatically created from ${channel} chat (${defaultDisplayName})`,
        contactId: contact.contactId,
        metadata: {
          channel,
          sessionId,
          externalId,
          source: "auto_sync",
        },
      },
    });

    if (summaryList.length > 0) {
      await db.crmActivity.create({
        data: {
          workspaceId,
          eventType: "conversation_summary",
          summary: summaryList[0],
          contactId: contact.contactId,
          metadata: {
            channel,
            sessionId,
            externalId,
            source: "chat_preservation",
          },
        },
      });
    }

    return contact;
  } catch (error) {
    console.error("[CRM_SYNC_SESSION_ERROR]", error);
    return null;
  }
}

/**
 * Backfills or syncs all recent chat sessions for a workspace into CRM contacts.
 */
export async function syncAllWorkspaceSessionsToContacts(
  workspaceId: string
): Promise<{ synced: number }> {
  try {
    const bots = await db.chatbot.findMany({
      where: { workspaceId },
      select: { chatbotId: true },
    });

    if (bots.length === 0) return { synced: 0 };
    const botIds = bots.map((b) => b.chatbotId);

    const sessions = await db.chatSession.findMany({
      where: {
        chatbotId: { in: botIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    let count = 0;
    for (const s of sessions) {
      const res = await syncSessionToCrmContact({
        chatbotId: s.chatbotId,
        sessionId: s.sessionId,
        guestName: s.guestName,
        profilePhoto: s.profilePhoto,
        platform: s.platform,
      });
      if (res) count++;
    }

    return { synced: count };
  } catch (error) {
    console.error("[CRM_SYNC_ALL_ERROR]", error);
    return { synced: 0 };
  }
}
