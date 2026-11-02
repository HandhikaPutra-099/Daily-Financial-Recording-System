
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ReportsPage() {
  // 1. STATE
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
  const now = new Date();

  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  setSelectedMonth(currentMonth);
}, []);

  // 2. MEMERIKSA LOGIN
  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) setError(error.message);

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
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

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
        setError(error.message);
      } else {
        setTransactions(data ?? []);
      }

      setLoading(false);
    }

    fetchTransactions();

    return () => {
      active = false;
    };
  }, [user]);

  // 4. MEMILIH TRANSAKSI SESUAI BULAN
  const monthlyTransactions = selectedMonth
  ? transactions.filter((item) =>
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

    const monthItems = transactions.filter((item) =>
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
      "Jenis Transaksi",
      "Nama Transaksi",
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
      item.type === "income" ? "Pemasukan" : "Pengeluaran",
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

  // 8. MENUNGGU PEMERIKSAAN LOGIN
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Memeriksa akun...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="rounded-xl bg-white p-6 text-center shadow">
          <p className="mb-4">
            Silakan login terlebih dahulu.
          </p>

          <a href="/" className="font-semibold text-blue-700">
            Kembali ke Login
          </a>
        </div>
      </main>
    );
  }

  // 9. TAMPILAN LAPORAN
  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 md:p-10">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <header className="mb-8">
          <a
            href="/"
            className="text-sm font-medium text-blue-700"
          >
            ← Kembali ke Dashboard
          </a>

          <h1 className="mt-4 text-2xl font-bold">
            Laporan Keuangan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Pantau kondisi keuanganmu secara berkala.
          </p>
        </header>

        {/* PILIH BULAN */}
        <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold">
            Pilih Bulan Laporan
          </label>

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 p-3 sm:max-w-xs"
          />

            <button
            type="button"
            onClick={handleExportCsv}
            disabled={monthlyTransactions.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 p-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
            Unduh Laporan CSV
            </button>
            <p className="mt-2 text-xs text-slate-500">
            Mengunduh seluruh transaksi pada bulan yang dipilih.
            </p>
        </section>

        {/* ERROR */}
        {error && (
          <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-10 text-center text-slate-500">
            Mengambil data laporan...
          </p>
        ) : (
          <>
            {/* RINGKASAN */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Pemasukan
                </p>

                <h2 className="mt-2 text-xl font-bold text-green-600">
                  {rupiah(totalIncome)}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Pengeluaran
                </p>

                <h2 className="mt-2 text-xl font-bold text-red-500">
                  {rupiah(totalExpense)}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Selisih Bulan Ini
                </p>

                <h2 className={`mt-2 text-xl font-bold ${
                  netBalance >= 0
                    ? "text-blue-700"
                    : "text-red-500"
                }`}>
                  {rupiah(netBalance)}
                </h2>
              </div>

            </section>

            {/* GRAFIK BULANAN */}
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-bold">
                Perkembangan Keuangan
              </h2>

              <p className="mb-6 text-sm text-slate-500">
                Perbandingan enam bulan terakhir.
              </p>

              {/* LEGENDA */}
              <div className="mb-4 flex gap-5 text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-green-500" />
                  Pemasukan
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-red-400" />
                  Pengeluaran
                </span>
              </div>

              {/* BATANG GRAFIK */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {monthlyTrend.map((item) => (
                  <div key={item.key} className="min-w-0">

                    <div className="flex h-36 items-end justify-center gap-1 border-b border-slate-200 pb-1">
                      <div
                        title={`Pemasukan: ${rupiah(item.income)}`}
                        className="w-4 rounded-t bg-green-500"
                        style={{
                          height: `${(item.income / maxMonthlyValue) * 100}%`,
                          minHeight: item.income > 0 ? "3px" : "0",
                        }}
                      />

                      <div
                        title={`Pengeluaran: ${rupiah(item.expense)}`}
                        className="w-4 rounded-t bg-red-400"
                        style={{
                          height: `${(item.expense / maxMonthlyValue) * 100}%`,
                          minHeight: item.expense > 0 ? "3px" : "0",
                        }}
                      />
                    </div>

                    <p className="mt-2 text-center text-xs text-slate-500">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* PENGELUARAN PER KATEGORI */}
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-bold">
                Pengeluaran Berdasarkan Kategori
              </h2>

              <p className="mb-6 text-sm text-slate-500">
                Kategori dengan pengeluaran terbesar.
              </p>

              {expenseCategories.length === 0 ? (
                <p className="py-5 text-center text-sm text-slate-500">
                  Belum ada pengeluaran pada bulan ini.
                </p>
              ) : (
                <div className="space-y-5">
                  {expenseCategories.map((item) => (
                    <div key={item.name}>

                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span className="font-medium">
                          {item.name}
                        </span>

                        <span className="font-semibold">
                          {rupiah(item.total)}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
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
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-bold">
                Ringkasan Aktivitas
              </h2>

              <p className="text-sm text-slate-500">
                Total transaksi pada bulan yang dipilih:
              </p>

              <h3 className="mt-2 text-3xl font-bold">
                {monthlyTransactions.length}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Transaksi tercatat
              </p>
            </section>

          </>
        )}
      </div>
    </main>
  );
}
