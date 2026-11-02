import { AccountShell, type AccountTab } from "@/components/account/AccountShell";
import { errors, notices } from "@/content/booking";

export { bookButton, bookInput, bookOutline } from "./buttonClasses";

// Shared frame for the booking pages: the account banner and tab bar, a notice or error,
// then content.
export function BookingShell({
  heading,
  text,
  notice,
  error,
  active = "book",
  staff = false,
  wide = false,
  children,
}: {
  heading: string;
  text?: string;
  notice?: string;
  error?: string;
  active?: AccountTab;
  staff?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccountShell active={active} heading={heading} text={text} staff={staff} wide={wide}>
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
      {children}
    </AccountShell>
  );
}
