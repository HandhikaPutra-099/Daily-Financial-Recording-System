"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import NavSidebar from "./NavSidebar";
import NavBottomBar from "./NavBottomBar";
import BrandLockup from "./BrandLockup";

export default function AppShell({ user, onLogout, children }) {
  const pathname = usePathname();

  return (
    <div className="finance-dashboard-shell min-h-screen text-[#f4f5f7] md:flex">
      <NavSidebar
        user={user}
        onLogout={onLogout}
        activePath={pathname}
      />

      <div className="min-h-screen min-w-0 md:flex-1 md:pl-[76px] lg:pl-64">
        <header className="flex items-center justify-between border-b border-[#2a2e38] bg-[#090b0e] px-4 py-3 md:hidden">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <BrandLockup size={32} />
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-[#a1a5b7] transition-colors hover:bg-[#1d2028] hover:text-[#f4f5f7]"
          >
            Keluar
          </button>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 sm:py-7 sm:pb-28 lg:px-10 lg:py-9 lg:pb-10">
          {children}
        </main>
        <footer className="hidden px-10 pb-6 text-xs text-[#8a8ea4] md:block">
          DuetKu · Keuangan pribadi, lebih terarah.
        </footer>
      </div>

      <NavBottomBar activePath={pathname} />
    </div>
  );
}
