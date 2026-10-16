import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
