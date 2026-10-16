export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={'spin ' + (className ?? '')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="grid h-full place-items-center text-muted">
      <div className="flex items-center gap-3">
        <Spinner size={20} />
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}
