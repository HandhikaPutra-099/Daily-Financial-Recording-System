
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <div className="mb-4 text-5xl">📡</div>

        <h1 className="text-2xl font-bold text-slate-800">
          Kamu Sedang Offline
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Koneksi internet sedang tidak tersedia.
          Periksa jaringanmu dan coba buka kembali Daily Finance.
        </p>

        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white"
        >
          Coba Lagi
        </a>
      </div>
    </main>
  );
}