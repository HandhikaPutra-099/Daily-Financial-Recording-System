import Link from "next/link";
import BrandLockup from "./BrandLockup";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Ringkasan",
    icon: (
      <svg
        aria-hidden="true"
        width="18"
        height="18"
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
        width="18"
        height="18"
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
        width="18"
        height="18"
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
        width="18"
        height="18"
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

export default function NavSidebar({ user, onLogout, activePath }) {
  return (
    <aside
      aria-label="Navigasi utama"
      className="fixed inset-y-0 left-0 z-20 hidden w-[76px] flex-col border-r border-[#2a2e38] bg-[#090b0e] md:flex lg:w-64"
    >
      <Link
        href="/"
        aria-label="DuetKu"
        className="flex min-h-[76px] items-center justify-center gap-3 border-b border-[#20232b] px-3 py-5 lg:justify-start lg:px-6"
      >
        <BrandLockup
          size={38}
          showTagline
          textClassName="hidden min-w-0 lg:block"
        />
      </Link>

      <nav aria-label="Menu utama" className="flex-1 px-2 pt-5 lg:px-4">
        <p className="mb-3 hidden px-3 text-[10px] font-semibold tracking-[0.12em] text-[#777d90] lg:block">MENU</p>
        <ul role="list" className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "finance-sidebar-link relative flex min-h-11 items-center justify-center gap-3 rounded-lg px-2 text-sm transition-colors duration-150 lg:justify-start lg:px-3",
                    isActive
                      ? "bg-[#20241b] font-semibold text-[#c8f76a]"
                      : "text-[#a1a5b7] hover:bg-[#17191f] hover:text-[#f4f5f7]",
                  ].join(" ")}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#20232b] px-2 py-4 lg:px-5">
        <p className="mb-3 hidden truncate text-xs text-[#a1a5b7] lg:block" title={user?.email}>
          {user?.email}
        </p>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Keluar dari akun"
          className="min-h-11 w-full rounded-lg border border-[#2a2e38] px-2 text-center text-sm text-[#a1a5b7] transition-colors duration-150 hover:border-[#f0718c] hover:text-[#f0718c] lg:px-3 lg:text-left"
        >
          <span className="lg:hidden" aria-hidden="true">↪</span>
          <span className="hidden lg:inline">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
