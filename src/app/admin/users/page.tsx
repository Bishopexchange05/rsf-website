import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/Card";
import { adminUsers } from "@/content/accounts";
import { resetMfaAction, setActiveAction, setRoleAction } from "@/lib/admin-actions";
import { requireRole } from "@/lib/auth";
import { noIndex } from "@/lib/no-index";
import { accountsEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: adminUsers.title, ...noIndex };

const PAGE_SIZE = 25;

type Row = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "member" | "staff" | "admin";
  is_active: boolean;
  email_confirmed: boolean;
  mfa_enrolled: boolean;
  created_at: string;
};

const input =
  "min-h-11 rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
const smallButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-navy px-4 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white dark:border-dark-green dark:text-dark-green dark:hover:bg-dark-green dark:hover:text-dark-bg";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; notice?: string; error?: string }>;
}) {
  if (!accountsEnabled) notFound();
  const { user } = await requireRole(["admin"]);
  const { q = "", page = "1", notice, error } = await searchParams;
  const search = q.slice(0, 80);
  const pageNo = Math.max(1, Math.min(500, Number.parseInt(page, 10) || 1));

  const supabase = await createClient();
  const { data, error: listError } = await supabase.rpc("admin_list_users", {
    p_search: search,
    p_limit: PAGE_SIZE + 1,
    p_offset: (pageNo - 1) * PAGE_SIZE,
  });
  const rows = ((data as Row[] | null) ?? []).slice(0, PAGE_SIZE);
  const hasNext = ((data as Row[] | null) ?? []).length > PAGE_SIZE;

  const qs = (p: number) => `?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(p) }).toString()}`;

  return (
    <AdminShell heading={adminUsers.heading} text={adminUsers.text} isAdmin>
      {notice && adminUsers.notices[notice] && (
        <p role="status" className="mb-5 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
          {adminUsers.notices[notice]}
        </p>
      )}
      {(error || listError) && (
        <p role="alert" className="mb-5 rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
          {adminUsers.errors[error ?? "failed"] ?? adminUsers.errors.failed}
        </p>
      )}

      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        <div className="min-w-0 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
            {adminUsers.searchLabel}
          </label>
          <input id="q" name="q" type="search" defaultValue={search} maxLength={80} className={`${input} w-full`} />
        </div>
        <button type="submit" className={smallButton}>
          {adminUsers.searchButton}
        </button>
      </form>

      {rows.length === 0 ? (
        <p>{adminUsers.empty}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const self = r.id === user.id;
            const privileged = r.role === "staff" || r.role === "admin";
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-h3 break-words">
                        {r.full_name}
                        {self && <span className="ml-2 text-sm font-semibold opacity-75">({adminUsers.you})</span>}
                      </h2>
                      <p className="break-all text-sm opacity-85">{r.email}</p>
                      <p className="text-sm opacity-85">{r.phone}</p>
                    </div>
                    <ul className="flex flex-wrap gap-2 text-xs font-semibold">
                      <li className="rounded-full bg-navy px-3 py-1 text-white dark:bg-white/15">{adminUsers.roles[r.role]}</li>
                      <li className={`rounded-full px-3 py-1 ${r.is_active ? "bg-brand-green/25" : "bg-accent-red/15 text-accent-red dark:text-red-300"}`}>
                        {r.is_active ? adminUsers.active : adminUsers.inactive}
                      </li>
                      {privileged && (
                        <li className={`rounded-full px-3 py-1 ${r.mfa_enrolled ? "bg-brand-green/25" : "bg-amber/40"}`}>
                          {r.mfa_enrolled ? adminUsers.twoFactorOn : adminUsers.twoFactorOff}
                        </li>
                      )}
                      {!r.email_confirmed && <li className="rounded-full bg-amber/40 px-3 py-1">{adminUsers.notVerified}</li>}
                    </ul>
                  </div>

                  {!self && (
                    <div className="mt-4 space-y-4 border-t border-slate-navy/10 pt-4 dark:border-white/10">
                      <form action={setRoleAction} className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="target" value={r.id} />
                        <div>
                          <label htmlFor={`role-${r.id}`} className="mb-1.5 block text-sm font-semibold">
                            {adminUsers.roleLabel}
                          </label>
                          <select id={`role-${r.id}`} name="role" defaultValue={r.role} className={input}>
                            <option value="member">{adminUsers.roles.member}</option>
                            <option value="staff">{adminUsers.roles.staff}</option>
                            <option value="admin">{adminUsers.roles.admin}</option>
                          </select>
                        </div>
                        <button type="submit" className={smallButton}>
                          {adminUsers.saveRole}
                        </button>
                      </form>

                      <form action={setActiveAction}>
                        <input type="hidden" name="target" value={r.id} />
                        <input type="hidden" name="active" value={r.is_active ? "false" : "true"} />
                        <button type="submit" className={smallButton}>
                          {r.is_active ? adminUsers.deactivate : adminUsers.reactivate}
                        </button>
                      </form>

                      {privileged && (
                        <details>
                          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">
                            {adminUsers.resetSummary}
                          </summary>
                          <form action={resetMfaAction} className="mt-3 space-y-3">
                            <p className="text-sm opacity-85">{adminUsers.resetHelp}</p>
                            <input type="hidden" name="target" value={r.id} />
                            <div>
                              <label htmlFor={`confirm-${r.id}`} className="mb-1.5 block text-sm font-semibold">
                                {adminUsers.resetConfirmLabel}
                              </label>
                              <input id={`confirm-${r.id}`} name="confirmEmail" type="email" required autoComplete="off" className={`${input} w-full`} />
                            </div>
                            <button type="submit" className={smallButton}>
                              {adminUsers.resetButton}
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
        {pageNo > 1 && (
          <Link href={`/admin/users${qs(pageNo - 1)}`} className="underline underline-offset-2">
            {adminUsers.previous}
          </Link>
        )}
        {hasNext && (
          <Link href={`/admin/users${qs(pageNo + 1)}`} className="underline underline-offset-2">
            {adminUsers.next}
          </Link>
        )}
      </div>
    </AdminShell>
  );
}
