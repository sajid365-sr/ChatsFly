"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type LifecycleStage = "new" | "engaged" | "qualified" | "customer" | "repeat" | "lapsed";

interface ContactIdentity {
  channel: string;
  externalId: string;
  sessionId: string | null;
}

interface ContactDeal {
  dealId: string;
  title: string;
  amount: number | null;
  stage: string;
}

interface ContactTask {
  taskId: string;
  title: string;
  dueAt: string | null;
  priority: string;
}

interface Contact {
  contactId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  lifecycleStage: LifecycleStage;
  source: string;
  createdAt: string;
  updatedAt: string;
  aiSummary?: string[];
  identities: ContactIdentity[];
  deals: ContactDeal[];
  tasks: ContactTask[];
  _count: { deals: number; tasks: number };
}

interface ContactStats {
  total: number;
  totalCustomers: number;
  newThisWeek: number;
  highIntentCount: number;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination: { total: number; page: number; totalPages: number; limit: number };
  stats: ContactStats;
}

interface CreateContactForm {
  name: string;
  phone: string;
  email: string;
  lifecycleStage: LifecycleStage;
  source: string;
  primaryAddress: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVED_VIEWS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Engaged", value: "engaged" },
  { label: "Qualified", value: "qualified" },
  { label: "Customer", value: "customer" },
  { label: "Repeat", value: "repeat" },
  { label: "Lapsed", value: "lapsed" },
];

const STAGE_BADGE_CLASSES: Record<LifecycleStage, string> = {
  new: "bg-secondary text-secondary-foreground",
  engaged: "bg-primary/10 text-primary",
  qualified: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  customer: "bg-green-500/10 text-green-600 dark:text-green-400",
  repeat: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  lapsed: "bg-destructive/10 text-destructive",
};

const CHANNEL_BADGE_CLASSES: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  whatsapp: "bg-green-500/10 text-green-600 dark:text-green-400",
  instagram: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  web: "bg-muted text-muted-foreground",
};

const INITIAL_FORM: CreateContactForm = {
  name: "",
  phone: "",
  email: "",
  lifecycleStage: "new",
  source: "manual",
  primaryAddress: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Stat card displayed in the stats row */
function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className="text-xl font-semibold text-foreground">{value.toLocaleString("en-BD")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Lifecycle stage badge */
function StageBadge({ stage }: { stage: LifecycleStage }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium capitalize ${STAGE_BADGE_CLASSES[stage]}`}
    >
      {stage}
    </span>
  );
}

/** Channel badge */
function ChannelBadge({ channel }: { channel: string }) {
  const cls = CHANNEL_BADGE_CLASSES[channel.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium capitalize ${cls}`}>
      {channel}
    </span>
  );
}

/** Table skeleton rows */
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((__, j) => (
            <TableCell key={j} className={j === 0 ? "w-10 px-3" : ""}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Create Contact modal */
function CreateContactModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateContactForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.phone.trim()) {
      toast.error("Name or Phone is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          lifecycleStage: form.lifecycleStage,
          source: form.source,
          primaryAddress: form.primaryAddress || undefined,
        }),
      });
      if (res.status === 409) {
        toast.error("A contact with this phone/email already exists");
        return;
      }
      if (!res.ok) throw new Error("Failed to create contact");
      toast.success("Contact created successfully");
      setForm(INITIAL_FORM);
      onCreated();
    } catch {
      toast.error("Failed to create contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="h-5 w-5 text-primary" />
            Create Contact
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-background border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                placeholder="+880..."
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lifecycle Stage</Label>
              <Select
                value={form.lifecycleStage}
                onValueChange={(v) => setForm((f) => ({ ...f, lifecycleStage: v as LifecycleStage }))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["new", "engaged", "qualified", "customer", "repeat", "lapsed"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm((f) => ({ ...f, source: v || "" }))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["facebook", "whatsapp", "instagram", "web", "manual"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Address</Label>
            <Input
              id="c-address"
              placeholder="Street, City..."
              value={form.primaryAddress}
              onChange={(e) => setForm((f) => ({ ...f, primaryAddress: e.target.value }))}
              className="bg-background border-border"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const router = useRouter();

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats>({ total: 0, totalCustomers: 0, newThisWeek: 0, highIntentCount: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [page, setPage] = useState(1);

  // Selection & Delete State
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "single"; contact: Contact } | { type: "bulk"; count: number } | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection helpers
  const allOnPageSelected =
    contacts.length > 0 && contacts.every((c) => selectedContactIds.includes(c.contactId));
  const someOnPageSelected =
    contacts.some((c) => selectedContactIds.includes(c.contactId)) && !allOnPageSelected;

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedContactIds((prev) =>
        prev.filter((id) => !contacts.some((c) => c.contactId === id))
      );
    } else {
      const pageIds = contacts.map((c) => c.contactId);
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectContact = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "single") {
        const res = await fetch(`/api/crm/contacts/${deleteTarget.contact.contactId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete contact");
        toast.success("Contact deleted successfully");
        setSelectedContactIds((prev) =>
          prev.filter((id) => id !== deleteTarget.contact.contactId)
        );
      } else {
        const res = await fetch(`/api/crm/contacts`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactIds: selectedContactIds }),
        });
        if (!res.ok) throw new Error("Failed to delete contacts");
        const data = (await res.json()) as { deletedCount?: number };
        toast.success(
          `${data.deletedCount ?? selectedContactIds.length} contact(s) deleted successfully`
        );
        setSelectedContactIds([]);
      }
      setDeleteTarget(null);
      void fetchContacts();
    } catch (err) {
      console.error("[DELETE_CONTACT_ERROR]", err);
      toast.error("Failed to delete contact. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
      });
      if (search) params.set("search", search);
      if (stageFilter) params.set("stage", stageFilter);
      if (channelFilter) params.set("source", channelFilter);

      const res = await fetch(`/api/crm/contacts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = (await res.json()) as ContactsResponse;
      setContacts(data.contacts);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter, channelFilter, sortBy]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  // CSV export
  const handleExportCSV = () => {
    const rows = [
      ["Name", "Phone", "Email", "Stage", "Channel", "Created"],
      ...contacts.map((c) => [
        c.name ?? "",
        c.phone ?? "",
        c.email ?? "",
        c.lifecycleStage,
        c.identities.map((i) => i.channel).join(";"),
        new Date(c.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleSyncChats = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/crm/contacts?sync=true");
      if (!res.ok) throw new Error("Sync failed");
      const data = (await res.json()) as ContactsResponse;
      setContacts(data.contacts);
      setStats(data.stats);
      setPagination(data.pagination);
      toast.success("Contacts synced from chat sessions");
    } catch {
      toast.error("Failed to sync contacts from chats");
    } finally {
      setSyncing(false);
    }
  };

  const handleStageFilter = (stage: string) => {
    setStageFilter(stage);
    setPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground">Manage your CRM contacts across all channels</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncChats}
            disabled={syncing || loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Chats"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Contact
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Contacts" value={stats.total} loading={loading} />
        <StatCard icon={UserPlus} label="New This Week" value={stats.newThisWeek} loading={loading} />
        <StatCard icon={Sparkles} label="High Intent" value={stats.highIntentCount} loading={loading} />
        <StatCard icon={ShoppingBag} label="Paying Customers" value={stats.totalCustomers} loading={loading} />
      </div>

      {/* Saved views */}
      <div className="w-full">
        <div className="flex gap-2 pb-1">
          {SAVED_VIEWS.map((v) => (
            <Button
              key={v.value}
              variant={stageFilter === v.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleStageFilter(v.value)}
              className="shrink-0"
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>
        <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40 bg-background border-border">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="web">Web</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v || "updatedAt"); setPage(1); }}>
          <SelectTrigger className="w-40 bg-background border-border">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Last Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions banner */}
      <AnimatePresence>
        {selectedContactIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  <span className="font-semibold text-primary">{selectedContactIds.length}</span>{" "}
                  contact{selectedContactIds.length > 1 ? "s" : ""} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedContactIds([])}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteTarget({ type: "bulk", count: selectedContactIds.length })}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected ({selectedContactIds.length})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10 px-3">
                    <Checkbox
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Stage</TableHead>
                  <TableHead className="text-muted-foreground">Channels</TableHead>
                  <TableHead className="text-muted-foreground text-center">Deals</TableHead>
                  <TableHead className="text-muted-foreground text-center">Tasks</TableHead>
                  <TableHead className="text-muted-foreground">Last Updated</TableHead>
                  <TableHead className="text-muted-foreground text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton />
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      <p>No contacts found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {contacts.map((contact, idx) => (
                      <motion.tr
                        key={contact.contactId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className={`cursor-pointer border-border transition-colors hover:bg-muted/50 ${
                          selectedContactIds.includes(contact.contactId) ? "bg-primary/5" : ""
                        }`}
                        onClick={() => router.push(`/dashboard/contacts/${contact.contactId}`)}
                      >
                        <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedContactIds.includes(contact.contactId)}
                            onCheckedChange={() => handleToggleSelectContact(contact.contactId)}
                            aria-label={`Select ${contact.name ?? "contact"}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {(contact.name ?? contact.phone ?? "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {contact.name ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">{contact.phone ?? contact.email ?? "—"}</p>
                              {contact.aiSummary && contact.aiSummary.length > 0 && (
                                <div
                                  className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/5 hover:bg-primary/10 rounded px-2 py-0.5 max-w-[280px] border border-primary/15 transition-colors"
                                  title={contact.aiSummary[contact.aiSummary.length - 1]}
                                >
                                  <Sparkles className="h-3 w-3 shrink-0 text-violet-500" />
                                  <span className="truncate">{contact.aiSummary[contact.aiSummary.length - 1]}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StageBadge stage={contact.lifecycleStage} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.identities.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              contact.identities.slice(0, 2).map((id) => (
                                <ChannelBadge key={id.externalId} channel={id.channel} />
                              ))
                            )}
                            {contact.identities.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{contact.identities.length - 2}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground">
                          {contact._count.deals}
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground">
                          {contact._count.tasks}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(contact.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/contacts/${contact.contactId}`);
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <span>View</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: "single", contact });
                                }}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && contacts.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {pagination.total} contact{pagination.total !== 1 ? "s" : ""} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {deleteTarget?.type === "bulk"
                ? `Delete ${deleteTarget.count} Contacts?`
                : `Delete Contact: ${deleteTarget?.contact.name || "Unknown"}?`}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              {deleteTarget?.type === "bulk"
                ? `Are you sure you want to delete ${deleteTarget.count} selected contacts? All associated chat histories, notes, tags, and timeline activities will be permanently deleted. This action cannot be undone.`
                : `Are you sure you want to delete this contact? All associated notes, activities, and linked channel identities will be permanently removed. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete {deleteTarget?.type === "bulk" ? `(${deleteTarget.count})` : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Contact Modal */}
      <CreateContactModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false);
          void fetchContacts();
        }}
      />
    </motion.div>
  );
}
