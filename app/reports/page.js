
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { formatUserFacingError } from "../../lib/user-facing-error";

const subscribeToMonth = () => () => {};
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function ReportsPage() {
  // 1. STATE
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionsOwnerId, setTransactionsOwnerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentMonth = useSyncExternalStore(
    subscribeToMonth,
    getCurrentMonth,
    () => "",
  );
  const [selectedMonthOverride, setSelectedMonthOverride] = useState(null);
  const selectedMonth = selectedMonthOverride ?? currentMonth;

  // 2. MEMERIKSA LOGIN
  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setError(
          formatUserFacingError(
            error,
            "Akunmu belum berhasil diperiksa. Coba lagi, ya.",
          ),
        );
      }

      setUser(data.session?.user ?? null);
      setAuthReady(true);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 3. MENGAMBIL TRANSAKSI
  useEffect(() => {
    if (!user) return;

    let active = true;

    async function fetchTransactions() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: true });

      if (!active) return;

      if (error) {
        setTransactions([]);
        setError(
          formatUserFacingError(
            error,
            "Laporan belum berhasil dimuat. Coba lagi, ya.",
          ),
        );
      } else {
        setTransactions(data ?? []);
      }

      setTransactionsOwnerId(user.id);
      setLoading(false);
    }

    fetchTransactions();

    return () => {
      active = false;
    };
  }, [user]);

  const currentTransactions =
    user && transactionsOwnerId === user.id ? transactions : [];
  const isTransactionsLoading =
    Boolean(user) && (loading || transactionsOwnerId !== user.id);
  const currentError = transactionsOwnerId === user?.id ? error : "";

  // 4. MEMILIH TRANSAKSI SESUAI BULAN
  const monthlyTransactions = selectedMonth
  ? currentTransactions.filter((item) =>
      String(item.date).startsWith(selectedMonth)
    )
  : [];

  // Menghitung pemasukan
  const totalIncome = monthlyTransactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + Number(item.amount), 0);

  // Menghitung pengeluaran
  const totalExpense = monthlyTransactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount), 0);

  // Selisih bulan ini
  const netBalance = totalIncome - totalExpense;

  // 5. FORMAT RUPIAH
  const rupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(number);

  // 6. MENGHITUNG PENGELUARAN PER KATEGORI
  const expenseCategories = Object.values(
    monthlyTransactions
      .filter((item) => item.type === "expense")
      .reduce((result, item) => {
        const category = item.category || "Tanpa kategori";

        if (!result[category]) {
          result[category] = {
            name: category,
            total: 0,
          };
        }

        result[category].total += Number(item.amount) || 0;

        return result;
      }, {})
  ).sort((a, b) => b.total - a.total);

  const maxCategoryExpense = Math.max(
    ...expenseCategories.map((item) => item.total),
    1
  );

  // 7. DATA GRAFIK ENAM BULAN
  const [year, month] = (
  selectedMonth || "2000-01"
).split("-").map(Number);

  const anchorDate = new Date(year, month - 1, 1);

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() - 5 + index,
      1
    );

    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthItems = currentTransactions.filter((item) =>
      String(item.date).startsWith(key)
    );

    const income = monthItems
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + Number(item.amount), 0);

    const expense = monthItems
      .filter((item) => item.type === "expense")
      .reduce((total, item) => total + Number(item.amount), 0);

    return {
      key,
      label: date.toLocaleDateString("id-ID", {
        month: "short",
      }),
      income,
      expense,
    };
  });

  const maxMonthlyValue = Math.max(
    ...monthlyTrend.flatMap((item) => [
      item.income,
      item.expense,
    ]),
    1
  );

  // 7.5. EKSPOR TRANSAKSI KE CSV
  function handleExportCsv() {
    const headers = [
      "Tanggal",
      "Jenis transaksi",
      "Nama transaksi",
      "Kategori",
      "Nominal",
      "Catatan",
    ];

    // Mengubah setiap transaksi menjadi baris CSV
    function csvCell(value) {
      const text = String(value ?? "");

      // Mencegah teks dianggap sebagai rumus spreadsheet
      const safeText = /^[\t\r ]*[=+\-@]/.test(text)
        ? `'${text}`
        : text;

      return `"${safeText.replace(/"/g, '""')}"`;
    }

    const rows = monthlyTransactions.map((item) => [
      item.date,
      item.type === "income" ? "Uang masuk" : "Uang keluar",
      item.name,
      item.category,
      Number(item.amount),
      item.notes || "",
    ]);

    // Menggabungkan data menjadi format CSV
    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    // Membuat file yang dapat dibuka di Excel
    const blob = new Blob(
      ["\uFEFF", csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `daily-finance-${selectedMonth}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // 8. MENUNGGU PEMERIKSAAN LOGIN
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Menyiapkan DuetKu...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d10] p-5">
        <div className="finance-card p-6 text-center">
          <p className="mb-4">
            Masuk dulu, ya, untuk melihat halaman ini.
          </p>

          <Link href="/" className="font-semibold text-[#c8f76a] underline underline-offset-2">
            Kembali ke DuetKu
          </Link>
        </div>
      </main>
    );
  }

  // 9. TAMPILAN LAPORAN
  return (
    <AppShell user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Laporan keuangan"
          subtitle="Lihat uang masuk dan uang keluar per bulan."
        />

        {/* PILIH BULAN */}
        <section className="finance-card flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="w-full sm:max-w-xs">
          <label htmlFor="report-month" className="mb-2 block text-sm font-semibold text-[#f4f5f7]">
            Bulan laporan
          </label>

          <input
            id="report-month"
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonthOverride(event.target.value)
            }
            className="finance-input"
          />
          </div>

          <div>
            <button
            type="button"
            onClick={handleExportCsv}
            disabled={monthlyTransactions.length === 0}
            className="min-h-11 w-full rounded-lg border border-[#b7ef45] bg-[#b7ef45] px-4 text-sm font-semibold text-[#11150b] transition-colors hover:border-[#c8f76a] hover:bg-[#c8f76a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
            Unduh file CSV
            </button>
            <p className="mt-2 text-xs text-[#8a8ea4]">
            File ini berisi semua transaksimu di bulan yang dipilih.
            </p>
          </div>
        </section>

        {/* ERROR */}
        {currentError && (
          <p role="alert" className="rounded-lg border border-[#49313c] bg-[#301f27] p-3 text-sm text-[#ff9caf]">
            {currentError}
          </p>
        )}

        {isTransactionsLoading ? (
          <p role="status" className="finance-card py-10 text-center text-[#a1a5b7]">
            Menyiapkan laporan...
          </p>
        ) : (
          <>
            {/* RINGKASAN */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <div className="finance-card p-5">
                <p className="text-sm text-[#8a8ea4]">
                  Uang masuk
                </p>

                <h2 className="mt-2 break-words font-mono text-xl font-semibold tabular-nums text-[#36c98b]">
                  {rupiah(totalIncome)}
                </h2>
              </div>

              <div className="finance-card p-5">
                <p className="text-sm text-[#8a8ea4]">
                  Uang keluar
                </p>

                <h2 className="mt-2 break-words font-mono text-xl font-semibold tabular-nums text-[#d48af7]">
                  {rupiah(totalExpense)}
                </h2>
              </div>

              <div className="finance-card p-5">
                <p className="text-sm text-[#8a8ea4]">
                  Sisa arus kas
                </p>

                <h2 className={`mt-2 break-words font-mono text-xl font-semibold tabular-nums ${
                  netBalance >= 0
                    ? "text-[#c8f76a]"
                    : "text-[#d48af7]"
                }`}>
                  {rupiah(netBalance)}
                </h2>
              </div>

            </section>

            {/* GRAFIK BULANAN */}
            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-semibold text-[#f4f5f7]">
                Arus uang enam bulan terakhir
              </h2>

              <p className="mb-6 text-sm text-[#a1a5b7]">
                Perbandingan uang masuk dan uang keluar.
              </p>

              {/* LEGENDA */}
              <div className="mb-4 flex flex-wrap gap-5 text-xs text-[#a1a5b7]">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#b7ef45]" />
                  Uang masuk
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#c66bfa]" />
                  Uang keluar
                </span>
              </div>

              {/* BATANG GRAFIK */}
              {currentTransactions.length === 0 ? (
                <EmptyState
                  title="Belum ada transaksi nih."
                  description="Yuk, mulai catat pemasukan dan pengeluaranmu."
                />
              ) : (
                <div
                  role="img"
                  aria-label="Grafik perbandingan pemasukan dan pengeluaran per bulan"
                  className="grid grid-cols-3 gap-3 sm:grid-cols-6"
                >
                  {monthlyTrend.map((item) => (
                    <div key={item.key} className="min-w-0">
                      <div className="flex h-36 items-end justify-center gap-1 border-b border-[#2a2e38] pb-1">
                        <div
                          title={`Uang masuk: ${rupiah(item.income)}`}
                          className="w-4 rounded-t bg-[#b7ef45]"
                          style={{
                            height: `${(item.income / maxMonthlyValue) * 100}%`,
                            minHeight: item.income > 0 ? "3px" : "0",
                          }}
                        />
                        <div
                          title={`Uang keluar: ${rupiah(item.expense)}`}
                          className="w-4 rounded-t bg-[#c66bfa]"
                          style={{
                            height: `${(item.expense / maxMonthlyValue) * 100}%`,
                            minHeight: item.expense > 0 ? "3px" : "0",
                          }}
                        />
                      </div>
                      <p className="mt-2 text-center text-xs text-[#8a8ea4]">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PENGELUARAN PER KATEGORI */}
            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-semibold text-[#f4f5f7]">
                Uang keluar per kategori
              </h2>

              <p className="mb-6 text-sm text-[#a1a5b7]">
                Kategori dengan uang keluar terbanyak.
              </p>

              {expenseCategories.length === 0 ? (
                <p className="rounded-lg bg-[#1d2028] py-5 text-center text-sm text-[#a1a5b7]">
                  Belum ada pengeluaran bulan ini. Catatanmu akan muncul di sini.
                </p>
              ) : (
                <div className="space-y-5">
                  {expenseCategories.map((item) => (
                    <div key={item.name}>

                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium text-[#f4f5f7]">
                          {item.name}
                        </span>

                        <span className="shrink-0 font-mono font-semibold tabular-nums text-[#f4f5f7]">
                          {rupiah(item.total)}
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-[#2a2e38]">
                        <div
                          className="h-full rounded-full bg-[#b7ef45]"
                          style={{
                            width: `${(item.total / maxCategoryExpense) * 100}%`,
                          }}
                        />
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* TOTAL TRANSAKSI */}
            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-semibold text-[#f4f5f7]">
                Aktivitas bulan ini
              </h2>

              <p className="text-sm text-[#a1a5b7]">
                Jumlah transaksi di bulan yang dipilih:
              </p>

              <h3 className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#f4f5f7]">
                {monthlyTransactions.length}
              </h3>

              <p className="mt-1 text-sm text-[#a1a5b7]">
                transaksi tercatat
              </p>
            </section>

          </>
        )}
      </div>
    </AppShell>
  );
}
