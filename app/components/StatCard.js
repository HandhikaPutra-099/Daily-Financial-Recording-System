const VARIANTS = {
  default: {
    value: "text-[#f4f5f7]",
    mark: "bg-[#232631] text-[#c5c8d3]",
    icon: "cashflow",
    sparkline: "text-[#a1a5b7]",
  },
  primary: {
    value: "text-[#c8f76a]",
    mark: "bg-[#2a321e] text-[#c8f76a]",
    icon: "balance",
    sparkline: "text-[#b7ef45]",
  },
  income: {
    value: "text-[#36c98b]",
    mark: "bg-[#172a25] text-[#36c98b]",
    icon: "income",
    sparkline: "text-[#36c98b]",
  },
  expense: {
    value: "text-[#d48af7]",
    mark: "bg-[#2a2033] text-[#d48af7]",
    icon: "expense",
    sparkline: "text-[#c66bfa]",
  },
  warning: {
    value: "text-[#f0c66a]",
    mark: "bg-[#302b1d] text-[#f0c66a]",
    icon: "cashflow",
    sparkline: "text-[#f0c66a]",
  },
};

function MetricIcon({ name }) {
  const paths = {
    balance: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M2.5 9h19M16 14h.01M6 5V3.5h12V5" />
      </>
    ),
    income: (
      <>
        <path d="M7 17 17 7M8 7h9v9" />
        <path d="M4 20h16" />
      </>
    ),
    expense: (
      <>
        <path d="m7 7 10 10M8 17h9V8" />
        <path d="M4 4v16" />
      </>
    ),
    cashflow: (
      <>
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.cashflow}
    </svg>
  );
}

function Sparkline({ values, label }) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const coordinates = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 28 - ((value - min) / range) * 22;
      return `${x},${y}`;
    });
  const points = coordinates.join(" ");
  const [lastX, lastY] = coordinates[coordinates.length - 1].split(",");

  return (
    <svg
      role="img"
      aria-label={`Tren enam bulan untuk ${label}`}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="h-8 w-full overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  variant = "default",
  detail,
  sparkline,
  featured = false,
  icon,
}) {
  const style = VARIANTS[variant] ?? VARIANTS.default;

  return (
    <article
      className={[
        "finance-card finance-stat-card min-w-0 p-4 sm:p-5",
        featured ? "finance-stat-featured" : "",
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#a1a5b7]">{label}</p>
        <span
          aria-hidden="true"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.mark}`}
        >
          <MetricIcon name={icon || style.icon} />
        </span>
      </div>
      <p
        className={`break-words font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${style.value}`}
      >
        {value}
      </p>
      {detail && <p className="mt-1.5 text-xs text-[#8a8ea4]">{detail}</p>}
      {sparkline && (
        <div className={`mt-3 ${style.sparkline}`}>
          <Sparkline values={sparkline} label={label.toLowerCase()} />
        </div>
      )}
    </article>
  );
}
