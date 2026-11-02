export default function SyncBanner({ isOnline, syncMessage, error }) {
  if (isOnline && !error) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "mb-5 rounded-xl border px-4 py-3 text-sm",
        !isOnline
          ? "border-[#51472a] bg-[#302b1d] text-[#f0c66a]"
          : "border-[#49313c] bg-[#301f27] text-[#ff9caf]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 font-medium">
        <span
          className={[
            "inline-block h-2 w-2 rounded-full",
            !isOnline ? "bg-[#f0c66a]" : "bg-[#f0718c]",
          ].join(" ")}
          aria-hidden="true"
        />
        {!isOnline ? "Kamu sedang offline" : "Sinkronisasi tertunda"}
      </div>
      {syncMessage && (
        <p className="mt-1 text-xs opacity-80">{syncMessage}</p>
      )}
      {error && (
        <p className="mt-1 text-xs opacity-80">{error}</p>
      )}
    </div>
  );
}
