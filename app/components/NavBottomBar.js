import Link from "next/link";

const TAB_ITEMS = [
  {
    href: "/",
    label: "Ringkasan",
    icon: (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="1" width="7" height="7" rx="1.5" />
        <rect x="10" y="1" width="7" height="7" rx="1.5" />
        <rect x="1" y="10" width="7" height="7" rx="1.5" />
        <rect x="10" y="10" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/categories",
    label: "Kategori",
    icon: (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 4h14M2 9h8M2 14h5" />
        <circle cx="14" cy="11.5" r="3" />
        <path d="M14 10v1.5l1 1" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Laporan",
    icon: (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="1" width="16" height="16" rx="2" />
        <path d="M5 13V9M9 13V6M13 13V10" />
      </svg>
    ),
  },
  {
    href: "/budgets",
    label: "Anggaran",
    icon: (
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 2a7 7 0 1 0 0 14A7 7 0 0 0 9 2z" />
        <path d="M9 6v3l2 2" />
        <path d="M6.5 14.5 5 16M11.5 14.5l1.5 1.5" />
      </svg>
    ),
  },
];

export default function NavBottomBar({ activePath }) {
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[#2a2e38] bg-[#090b0e] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        role="list"
        className="flex items-stretch"
      >
        {TAB_ITEMS.map((item) => {
          const isActive = activePath === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors duration-150",
                  isActive
                    ? "text-[#c8f76a]"
                    : "text-[#8a8ea4] hover:text-[#f4f5f7]",
                ].join(" ")}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
