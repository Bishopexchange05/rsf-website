import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { auditLog } from "@/content/accounts";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: auditLog.title, ...noIndex };

type Entry = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  detail: string | null;
  created_at: string;
};

const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

function describe(e: Entry): string {
  const parts: string[] = [];
  if (e.before || e.after) {
    parts.push(`${JSON.stringify(e.before ?? {})} to ${JSON.stringify(e.after ?? {})}`);
  }
  if (e.detail) parts.push(e.detail);
  return parts.join(". ");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  if (!accountsEnabled) notFound();
  await requireRole(["admin"]);
  const { action = "" } = await searchParams;
  const filter = auditLog.filters.find((f) => f.value === action)?.value ?? "";

  const supabase = await createClient();
  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter) query = query.like("action", `${filter}.%`);
  const { data } = await query;
  const entries = (data as Entry[] | null) ?? [];

  // Names for the people involved (Admins may read all profiles).
  const ids = Array.from(new Set(entries.flatMap((e) => [e.actor_id, e.entity_type === "profile" ? e.entity_id : null]).filter(Boolean))) as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (people as { id: string; full_name: string }[] | null) ?? []) names.set(p.id, p.full_name);
  }

  return (
    <AdminShell heading={auditLog.heading} text={auditLog.text} isAdmin>
      <nav aria-label={auditLog.filterLabel} className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{auditLog.filterLabel}:</span>
        {[{ value: "", label: auditLog.filterAll }, ...auditLog.filters].map((f) => (
          <Link
            key={f.value || "all"}
            href={f.value ? `/admin/audit?action=${f.value}` : "/admin/audit"}
            aria-current={f.value === filter ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 font-semibold ${
              f.value === filter ? "border-navy bg-navy text-white dark:border-white/40 dark:bg-white/15" : "border-navy/30 dark:border-white/30"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <p>{auditLog.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-dark-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-navy/10 dark:border-white/10">
                <th scope="col" className="p-3">{auditLog.columns.when}</th>
                <th scope="col" className="p-3">{auditLog.columns.who}</th>
                <th scope="col" className="p-3">{auditLog.columns.what}</th>
                <th scope="col" className="p-3">{auditLog.columns.details}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const who = e.actor_id ? (names.get(e.actor_id) ?? auditLog.unknownPerson) : auditLog.system;
                const about = e.entity_type === "profile" && e.entity_id && e.entity_id !== e.actor_id ? names.get(e.entity_id) : null;
                return (
                  <tr key={e.id} className="border-b border-slate-navy/10 align-top last:border-0 dark:border-white/10">
                    <td className="whitespace-nowrap p-3">{when.format(new Date(e.created_at))}</td>
                    <td className="p-3">
                      {who}
                      {e.actor_role && <span className="block text-xs opacity-75">{e.actor_role}</span>}
                    </td>
                    <td className="p-3">
                      {auditLog.actions[e.action] ?? e.action}
                      {about && <span className="block text-xs opacity-75">{about}</span>}
                    </td>
                    <td className="break-words p-3 opacity-85">{describe(e)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm opacity-75">{auditLog.limitNote}</p>
    </AdminShell>
  );
}
