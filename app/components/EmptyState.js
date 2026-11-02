import Link from "next/link";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#383d49] bg-[#13151a] px-5 py-8 text-center">
      <div aria-hidden="true" className="mx-auto mb-4 flex h-12 items-end justify-center gap-1.5">
        {[18, 30, 22, 38, 27].map((height, index) => (
          <span
            key={height}
            className={`w-2 rounded-t-sm ${index === 3 ? "bg-[#b7ef45]" : "bg-[#343944]"}`}
            style={{ height }}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-[#f4f5f7]">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-[#a1a5b7]">{description}</p>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link
          href={actionHref}
          className="finance-button-primary mt-5 inline-flex items-center justify-center text-sm"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="finance-button-primary mt-5 inline-flex items-center justify-center text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
