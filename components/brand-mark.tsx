/** Reversed (dark-background) BhumiSetu mark. Pass a page-unique `id` for the mask. */
export function BrandMark({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const mask = `${id}-mask`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="6 20 84 60"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">
          <rect width="96" height="96" fill="#fff" />
          <circle cx="28" cy="32.05" r="6.5" fill="#000" />
          <circle cx="68" cy="32.05" r="6.5" fill="#000" />
          <circle cx="48" cy="26" r="8.5" fill="#000" />
        </mask>
      </defs>
      <g fill="#fff">
        <rect x="6" y="60" width="18" height="20" rx="2" />
        <rect x="28" y="60" width="10" height="8" rx="2" />
        <rect x="28" y="72" width="10" height="8" rx="2" />
        <rect x="58" y="60" width="10" height="8" rx="2" />
        <rect x="58" y="72" width="10" height="8" rx="2" />
        <rect x="72" y="60" width="18" height="20" rx="2" />
      </g>
      <rect x="6" y="50" width="84" height="6" rx="3" fill="#10B981" />
      <g mask={`url(#${mask})`} fill="none" stroke="#10B981">
        <path d="M12.83 54A36.08 36.08 0 0 1 83.17 54" strokeWidth="5" />
        <path d="M28 32.05V50M48 26V50M68 32.05V50" strokeWidth="2.5" />
      </g>
      <circle cx="28" cy="32.05" r="4" fill="#fff" />
      <circle cx="68" cy="32.05" r="4" fill="#fff" />
      <circle cx="48" cy="26" r="6" fill="#F59E0B" />
    </svg>
  );
}
