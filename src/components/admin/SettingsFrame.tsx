import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { errors, notices, settingsHub } from "@/content/admin-settings";

export const adminInput =
  "min-h-11 w-full rounded-xl border border-slate-navy/25 bg-white px-3 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
export const adminTextarea =
  "w-full rounded-xl border border-slate-navy/25 bg-white px-3 py-2 text-slate-navy dark:border-white/25 dark:bg-dark-bg dark:text-dark-text";
export const adminButton =
  "min-h-12 rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95";

// Shared frame for the settings pages: banner, saved or error message, back link.
export function SettingsFrame({
  heading,
  text,
  notice,
  error,
  showBack = true,
  children,
}: {
  heading: string;
  text: string;
  notice?: string;
  error?: string;
  showBack?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminShell heading={heading} text={text} isAdmin>
      {notice && notices[notice] && (
        <p role="status" className="mb-5 rounded-xl bg-brand-green/15 p-3 text-sm font-medium dark:text-dark-green">
          {notices[notice]}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-accent-red/10 p-3 text-sm font-medium text-accent-red dark:text-red-300">
          {errors[error] ?? errors.failed}
        </p>
      )}
      {showBack && (
        <p className="mb-6 text-sm">
          <Link href={settingsHub.back.href} className="font-medium underline underline-offset-2">
            {settingsHub.back.label}
          </Link>
        </p>
      )}
      {children}
    </AdminShell>
  );
}
