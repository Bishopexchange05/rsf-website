import { AdminTabs } from "@/components/admin/AdminTabs";
import { Toaster } from "@/components/admin/Toaster";
import { admin } from "@/content/accounts";
import { requestsAdmin } from "@/content/overnight";
import { staffNav } from "@/content/payments";

// Frame for the admin pages: a slim banner, then a tab bar and a wide content area. Staff see
// Today, Payments, Bookings, Monthly passes and Overnight requests; Admins also see People,
// Settings, Audit log and Email health.
export function AdminShell({
  heading,
  text,
  isAdmin,
  children,
}: {
  heading: string;
  text: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const tabs = [
    { href: "/admin", label: admin.nav.today },
    { href: staffNav.payments.href, label: staffNav.payments.label },
    { href: staffNav.bookings.href, label: staffNav.bookings.label },
    { href: staffNav.passes.href, label: staffNav.passes.label },
    { href: requestsAdmin.nav.href, label: requestsAdmin.nav.label },
    ...(isAdmin ? admin.links.map((l) => ({ href: l.href, label: l.label })) : []),
  ];
  return (
    <>
      <section className="bg-gradient-to-br from-navy to-purple pt-24 text-white dark:from-dark-bg dark:to-purple-panel md:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-heading text-sm uppercase tracking-widest text-brand-green dark:text-dark-green">{admin.label}</p>
          <h1 className="mt-1 text-h2">{heading}</h1>
          <p className="mt-2 max-w-2xl text-white/90">{text}</p>
          <AdminTabs tabs={tabs} ariaLabel={admin.nav.ariaLabel} back={admin.nav.back} />
        </div>
      </section>
      <div className="min-h-[60vh] bg-cream text-slate-navy dark:bg-dark-bg dark:text-dark-text">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">{children}</div>
      </div>
      <Toaster />
    </>
  );
}
