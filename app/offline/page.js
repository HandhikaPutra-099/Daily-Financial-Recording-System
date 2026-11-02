
"use client";

import BrandLockup from "../components/BrandLockup";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0d10] p-5">
      <div className="finance-card w-full max-w-md p-7 text-center sm:p-9">
        <div className="mb-5 flex justify-center">
          <BrandLockup size={42} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f4f5f7]">
          Kamu sedang offline
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[#a1a5b7]">
          Koneksi belum tersedia. Cek jaringanmu, lalu coba lagi.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="finance-button-primary mt-6 inline-flex min-w-32 items-center justify-center"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}