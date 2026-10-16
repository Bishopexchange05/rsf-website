import { LeafDivider } from "@/components/LeafDivider";

// Branded stand-in for a photo that has not been supplied yet. Fills its parent
// (which must be `relative` with a fixed aspect ratio).
export function PhotoComingSoon({ label, ariaLabel }: { label: string; ariaLabel?: string }) {
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? label}
      className="absolute inset-0 grid place-items-center bg-gradient-to-br from-navy to-purple p-4 text-center text-white dark:from-dark-bg dark:to-purple-panel"
    >
      <div>
        <LeafDivider className="mx-auto mb-3 h-5 w-40 max-w-full text-brand-green" />
        <p className="font-heading text-lg">{label}</p>
      </div>
    </div>
  );
}
