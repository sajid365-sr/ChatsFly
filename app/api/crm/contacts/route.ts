import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { getAndSyncUser } from "@/lib/core/auth";
import { getActiveWorkspace } from "@/lib/core/workspace-server";
import { syncAllWorkspaceSessionsToContacts } from "@/lib/services/crm-sync";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// ── Input validation ─────────────────────────────────────────────────────────

const createContactSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  lifecycleStage: z
    .enum(["new", "engaged", "qualified", "customer", "repeat", "lapsed"])
    .default("new"),
  source: z.string().trim().max(50).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  primaryAddress: z.string().trim().max(500).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  marketingConsent: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

// ── GET /api/crm/contacts ─────────────────────────────────────────────────────
// Workspace-wide contact list with filter, search, pagination.
// Note: does NOT require chatbotId — this is a true workspace-level CRM view.
export async function GET(req: NextRequest) {
  try {
    const user = await getAndSyncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.userId);
    const { searchParams } = req.nextUrl;

    // Pagination
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    // Filters
    const search = searchParams.get("search")?.trim() ?? "";
    const lifecycleStage = searchParams.get("stage") ?? "";
    const assignedTo = searchParams.get("assignedTo") ?? "";
    const source = searchParams.get("source") ?? "";
    const tagId = searchParams.get("tagId") ?? "";

    // Sorting
    const sortBy = searchParams.get("sortBy") ?? "updatedAt";
    const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";

    // Build where clause
    const where: Record<string, unknown> = {
      workspaceId: workspace.workspaceId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    if (lifecycleStage) {
      where.lifecycleStage = lifecycleStage;
    }

    if (assignedTo) {
      where.assignedToUserId = assignedTo;
    }

    if (source) {
      where.source = source;
    }

    if (tagId) {
      where.tagAssignments = { some: { tagId } };
    }

    // Allowed sort fields to prevent injection
    const allowedSortFields = ["name", "email", "phone", "lifecycleStage", "createdAt", "updatedAt"];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "updatedAt";

    let [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: sortDir },
        include: {
          identities: {
            select: { channel: true, externalId: true, sessionId: true },
          },
          tagAssignments: {
            select: { tagId: true },
          },
          deals: {
            where: { stage: { notIn: ["won", "lost"] } },
            select: { dealId: true, title: true, amount: true, stage: true },
          },
          tasks: {
            where: { status: { in: ["pending", "in_progress"] } },
            select: { taskId: true, title: true, dueAt: true, priority: true },
            orderBy: { dueAt: "asc" },
            take: 3,
          },
          _count: {
            select: { deals: true, tasks: true },
          },
        },
      }),
      db.contact.count({ where }),
    ]);

    // Auto-sync backfill from existing chat sessions if table is empty or explicit sync requested
    const shouldSync = searchParams.get("sync") === "true" || (total === 0 && !search && !lifecycleStage && !assignedTo && !source && !tagId);
    if (shouldSync) {
      const syncResult = await syncAllWorkspaceSessionsToContacts(workspace.workspaceId);
      if (syncResult.synced > 0) {
        // Re-query with updated contacts
        [contacts, total] = await Promise.all([
          db.contact.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [orderField]: sortDir },
            include: {
              identities: {
                select: { channel: true, externalId: true, sessionId: true },
              },
              tagAssignments: {
                select: { tagId: true },
              },
              deals: {
                where: { stage: { notIn: ["won", "lost"] } },
                select: { dealId: true, title: true, amount: true, stage: true },
              },
              tasks: {
                where: { status: { in: ["pending", "in_progress"] } },
                select: { taskId: true, title: true, dueAt: true, priority: true },
                orderBy: { dueAt: "asc" },
                take: 3,
              },
              _count: {
                select: { deals: true, tasks: true },
              },
            },
          }),
          db.contact.count({ where }),
        ]);
      }
    }

    // Aggregate stats for the list view
    const [totalCustomers, newThisWeek, highIntentCount] = await Promise.all([
      db.contact.count({
        where: { workspaceId: workspace.workspaceId, lifecycleStage: { in: ["customer", "repeat"] } },
      }),
      db.contact.count({
        where: {
          workspaceId: workspace.workspaceId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.contact.count({
        where: { workspaceId: workspace.workspaceId, buyingIntentScore: { gte: 70 } },
      }),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      stats: {
        total,
        totalCustomers,
        newThisWeek,
        highIntentCount,
      },
    });
  } catch (error) {
    console.error("[CRM_CONTACTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// ── POST /api/crm/contacts ────────────────────────────────────────────────────
// Manually create a new Contact.
export async function POST(req: NextRequest) {
  try {
    const user = await getAndSyncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.userId);
    const body = await req.json() as unknown;
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate phone or email in the same workspace
    if (data.phone || data.email) {
      const existing = await db.contact.findFirst({
        where: {
          workspaceId: workspace.workspaceId,
          OR: [
            ...(data.phone ? [{ phone: data.phone }] : []),
            ...(data.email ? [{ email: data.email }] : []),
          ],
        },
        select: { contactId: true, name: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: "duplicate", existingContactId: existing.contactId, existingName: existing.name },
          { status: 409 }
        );
      }
    }

    const contact = await db.contact.create({
      data: {
        workspaceId: workspace.workspaceId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        lifecycleStage: data.lifecycleStage,
        source: data.source ?? "manual",
        assignedToUserId: data.assignedToUserId,
        primaryAddress: data.primaryAddress,
        district: data.district,
        marketingConsent: data.marketingConsent,
        smsConsent: data.smsConsent,
        customFields: (data.customFields as Prisma.InputJsonValue) ?? {},
      },
    });

    // Log activity
    await db.crmActivity.create({
      data: {
        workspaceId: workspace.workspaceId,
        eventType: "contact_created",
        summary: `Contact created: ${data.name ?? "Unknown"}`,
        contactId: contact.contactId,
        actorUserId: user.userId,
        metadata: { source: data.source ?? "manual" },
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("[CRM_CONTACTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

const bulkDeleteSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1).max(500),
});

// ── DELETE /api/crm/contacts ──────────────────────────────────────────────────
// Bulk delete contacts belonging to the active workspace
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAndSyncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.userId);
    const body = (await req.json()) as unknown;
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { contactIds } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      const validContacts = await tx.contact.findMany({
        where: {
          contactId: { in: contactIds },
          workspaceId: workspace.workspaceId,
        },
        select: { contactId: true },
      });

      const validIds = validContacts.map((c) => c.contactId);
      if (validIds.length === 0) return { count: 0 };

      await tx.dealStageHistory.deleteMany({
        where: { deal: { contactId: { in: validIds } } },
      });
      await tx.deal.deleteMany({
        where: { contactId: { in: validIds } },
      });
      await tx.contactIdentity.deleteMany({
        where: { contactId: { in: validIds } },
      });
      await tx.contactTagAssignment.deleteMany({
        where: { contactId: { in: validIds } },
      });
      await tx.crmActivity.deleteMany({
        where: { contactId: { in: validIds } },
      });

      return tx.contact.deleteMany({
        where: { contactId: { in: validIds } },
      });
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("[CRM_CONTACTS_BULK_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

