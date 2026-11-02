import Link from "next/link";
import BrandLockup from "./BrandLockup";
import FormField from "./FormField";

export default function AuthScreen({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  authError,
  authMessage,
  authBusy,
  onSubmit,
}) {
  return (
    <main className="min-h-screen bg-[#0b0d10]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col px-5 py-7 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
          <Link href="/" className="flex min-h-11 w-fit items-center gap-3">
            <BrandLockup size={42} />
          </Link>

          <div className="mx-auto mt-12 w-full max-w-[520px] flex-1 lg:mt-16">
            <p className="text-sm font-semibold text-[#b7ef45]">
              Keuangan pribadi, lebih terarah.
            </p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.1] tracking-[-0.045em] text-[#f4f5f7] sm:text-5xl">
              Kenali alur uangmu, hari demi hari.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#a1a5b7]">
              Catat uang masuk dan uang keluar, lalu lihat ringkasannya dari
              satu tempat.
            </p>

            <div className="finance-card mt-10 overflow-hidden p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#f4f5f7]">
                    Kondisi keuanganmu
                  </p>
                  <p className="mt-1 text-xs text-[#8a8ea4]">
                    Ringkasan setelah kamu masuk
                  </p>
                </div>
                <span className="rounded-md bg-[#252d1b] px-2.5 py-1 text-xs font-medium text-[#c8f76a]">
                  Ringkasan
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#1d2028] p-3">
                  <p className="text-xs text-[#a1a5b7]">Uang masuk</p>
                  <p className="mt-2 text-xs font-medium text-[#36c98b]">
                    Dari catatanmu
                  </p>
                </div>
                <div className="rounded-lg bg-[#1d2028] p-3">
                  <p className="text-xs text-[#a1a5b7]">Uang keluar</p>
                  <p className="mt-2 text-xs font-medium text-[#d48af7]">
                    Dari catatanmu
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[#2a2e38] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#f4f5f7]">
                    Catatan keuangan
                  </p>
                  <p className="text-xs text-[#8a8ea4]">Catatanmu</p>
                </div>
                <div className="mt-4 rounded-lg bg-[#1d2028] px-4 py-5">
                  <p className="text-sm font-medium text-[#f4f5f7]">
                    Semua catatanmu, dalam satu tempat
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#a1a5b7]">
                    Grafik, saldo, dan kategori dihitung dari transaksi yang
                    kamu catat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-[#8a8ea4]">
            Catat kapan saja. Perubahan akan disinkronkan saat kamu kembali
            online.
          </p>
        </section>

        <section className="flex items-center justify-center border-t border-[#2a2e38] bg-[#111318] px-5 py-12 sm:px-10 lg:border-l lg:border-t-0 lg:px-14">
          <div className="w-full max-w-[420px]">
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f4f5f7]">
              {authMode === "login"
                ? "Halo, senang bertemu lagi!"
                : "Yuk, mulai atur keuanganmu!"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#a1a5b7]">
              {authMode === "login"
                ? "Masuk dan lanjutkan perjalanan mengatur keuanganmu."
                : "Buat akun DuetKu dan catat keuanganmu dengan lebih mudah."}
            </p>

            <div
              role="group"
              aria-label="Pilih masuk atau daftar"
              className="mt-7 grid grid-cols-2 gap-1 rounded-lg bg-[#1d2028] p-1"
            >
              {[
                ["login", "Masuk"],
                ["register", "Daftar"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={authMode === mode}
                  onClick={() => setAuthMode(mode)}
                  className={[
                    "min-h-11 rounded-md px-3 text-sm font-semibold transition-colors",
                    authMode === mode
                      ? "bg-[#30342c] text-[#c8f76a] shadow-sm"
                      : "text-[#a1a5b7] hover:text-[#f4f5f7]",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <FormField id="auth-email" label="Email">
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                  className="finance-input"
                />
              </FormField>

              <FormField
                id="auth-password"
                label="Kata sandi"
                helper={authMode === "register" ? "Minimal 6 karakter." : undefined}
              >
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan kata sandi"
                  minLength={6}
                  required
                  autoComplete={
                    authMode === "register" ? "new-password" : "current-password"
                  }
                  className="finance-input"
                />
              </FormField>

              {authError && (
                <p
                  role="alert"
                  className="rounded-lg border border-[#49313c] bg-[#301f27] px-3 py-2.5 text-sm text-[#ff9caf]"
                >
                  {authError}
                </p>
              )}
              {authMessage && (
                <p
                  role="status"
                  className="rounded-lg border border-[#245240] bg-[#172a25] px-3 py-2.5 text-sm text-[#62dfa7]"
                >
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="finance-button-primary w-full disabled:opacity-60"
              >
                {authBusy
                  ? "Sebentar, ya..."
                  : authMode === "login"
                    ? "Masuk"
                    : "Buat akun DuetKu"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-[#8a8ea4]">
              Catatan keuanganmu akan muncul di akunmu setelah masuk.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
