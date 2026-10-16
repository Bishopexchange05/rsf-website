// Subtle leaf-vein line motif used as a section divider.
export function LeafDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M0 12h170M230 12h170" opacity="0.5" />
      <path d="M200 3c-9 4-14 13-14 21 8-1 14-7 14-21zm0 0c9 4 14 13 14 21-8-1-14-7-14-21z" />
      <path d="M200 6v16" />
    </svg>
  );
}
