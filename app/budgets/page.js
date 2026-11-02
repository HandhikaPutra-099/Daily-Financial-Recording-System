
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function BudgetsPage() {
  // 1. STATE AUTENTIKASI
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // 2. STATE DATA
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 3. STATE FORM
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Memilih bulan saat ini
    const [selectedMonth, setSelectedMonth] = useState("");
 // Menentukan bulan berdasarkan waktu lokal perangkat
    useEffect(() => {
    const now = new Date();

    setSelectedMonth(
        `${now.getFullYear()}-${String(
        now.getMonth() + 1
        ).padStart(2, "0")}`
    );
    }, []);

  // 4. MEMERIKSA LOGIN
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

  // 5. MENGAMBIL KATEGORI, ANGGARAN, DAN TRANSAKSI
    useEffect(() => {
    if (!user || !selectedMonth) {
        if (!user) {
        setCategories([]);
        setBudgets([]);
        setTransactions([]);
        }

        setLoading(false);
        return;
    }

    let active = true;

    async function fetchData() {
      setLoading(true);
      setError("");

      const [year, month] = selectedMonth.split("-").map(Number);

      const monthStart = `${selectedMonth}-01`;

      // Menghitung awal bulan berikutnya
      const nextMonthStart = new Date(
        Date.UTC(year, month, 1)
      ).toISOString().slice(0, 10);

      const [categoryResult, budgetResult, transactionResult] =
        await Promise.all([
          supabase
            .from("categories")
            .select("id, name, type")
            .eq("type", "expense")
            .order("name", { ascending: true }),

          supabase
            .from("budgets")
            .select("*")
            .eq("month", monthStart)
            .order("category", { ascending: true }),

          supabase
            .from("transactions")
            .select("category, amount, type, date")
            .eq("type", "expense")
            .gte("date", monthStart)
            .lt("date", nextMonthStart),
        ]);

      if (!active) return;

      const firstError =
        categoryResult.error ||
        budgetResult.error ||
        transactionResult.error;

      if (firstError) {
        setError(firstError.message);
      }

      const categoryData = categoryResult.data ?? [];

      setCategories(categoryData);
      setBudgets(budgetResult.data ?? []);
      setTransactions(transactionResult.data ?? []);

      setSelectedCategory((current) => {
        if (categoryData.some((item) => item.name === current)) {
          return current;
        }

        return categoryData[0]?.name ?? "";
      });

      setLoading(false);
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [user, selectedMonth]);

  // 6. MENGHITUNG PENGELUARAN PER KATEGORI
  const spentByCategory = transactions.reduce((result, item) => {
    const category = item.category || "Tanpa kategori";

    result[category] =
      (result[category] || 0) + Number(item.amount || 0);

    return result;
  }, {});

  // 7. MENGHITUNG TOTAL ANGGARAN
  const totalBudget = budgets.reduce(
    (total, item) => total + Number(item.amount),
    0
  );

  // Pengeluaran dalam kategori yang sudah dianggarkan
  const totalBudgetedSpent = budgets.reduce(
    (total, item) =>
      total + (spentByCategory[item.category] || 0),
    0
  );

  // Seluruh pengeluaran bulan ini
  const totalExpense = transactions.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  );

  const remainingBudget = totalBudget - totalBudgetedSpent;

  // 8. FORMAT RUPIAH
  const rupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(number);

  // 9. MENYIMPAN ANGGARAN
  async function handleSubmit(event) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!selectedCategory || numericAmount <= 0 ||
        !Number.isFinite(numericAmount)) {
      setError("Pilih kategori dan masukkan nominal yang valid.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let result;

      if (editingId) {
        // Memperbarui anggaran yang sudah ada
        result = await supabase
          .from("budgets")
          .update({ amount: numericAmount })
          .eq("id", editingId)
          .select()
          .single();
      } else {
        // Menambahkan atau memperbarui anggaran
        // untuk kategori dan bulan yang sama
        result = await supabase
          .from("budgets")
          .upsert(
            {
              category: selectedCategory,
              month: `${selectedMonth}-01`,
              amount: numericAmount,
            },
            {
              onConflict: "user_id,category,month",
            }
          )
          .select()
          .single();
      }

      if (result.error) {
        setError(result.error.message);
        return;
      }

      const savedBudget = result.data;

      setBudgets((current) => {
        const filtered = current.filter(
          (item) =>
            item.id !== savedBudget.id &&
            !(
              item.category === savedBudget.category &&
              item.month === savedBudget.month
            )
        );

        return [...filtered, savedBudget].sort((a, b) =>
          a.category.localeCompare(b.category)
        );
      });

      setEditingId(null);
      setAmount("");

      setMessage(
        "Anggaran berhasil disimpan."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // 10. MENGEDIT ANGGARAN
  function handleEdit(item) {
    setEditingId(item.id);
    setSelectedCategory(item.category);
    setAmount(String(item.amount));
    setError("");
    setMessage("");
  }

  // 11. MEMBATALKAN EDIT
  function handleCancel() {
    setEditingId(null);
    setAmount("");
    setError("");
    setMessage("");
  }

  // 12. MENGHAPUS ANGGARAN
  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Hapus anggaran kategori ${item.category}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setBudgets((current) =>
      current.filter((budget) => budget.id !== item.id)
    );

    if (editingId === item.id) {
      handleCancel();
    }

    setMessage("Anggaran berhasil dihapus.");
  }

  // 13. KATEGORI TANPA ANGGARAN
  const unbudgetedCategories = Object.entries(spentByCategory)
    .filter(
      ([name]) =>
        !budgets.some((item) => item.category === name)
    )
    .sort((a, b) => b[1] - a[1]);

  // 14. MENUNGGU LOGIN
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Memeriksa akun...
      </div>
    );
  }

  // 15. JIKA BELUM LOGIN
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

  // 16. TAMPILAN ANGGARAN
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
            Anggaran Bulanan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Atur dan pantau batas pengeluaranmu.
          </p>
        </header>

        {/* PILIH BULAN */}
        <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold">
            Periode Anggaran
          </label>

          <input
            type="month"
            value={selectedMonth}
            disabled={Boolean(editingId)}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 p-3 sm:max-w-xs disabled:bg-slate-100"
          />
        </section>

        {/* PESAN ERROR */}
        {error && (
          <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* PESAN BERHASIL */}
        {message && (
          <p className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {loading ? (
          <p className="py-10 text-center text-slate-500">
            Mengambil data anggaran...
          </p>
        ) : (
          <>
            {/* RINGKASAN */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Anggaran
                </p>
                <h2 className="mt-2 text-xl font-bold text-blue-700">
                  {rupiah(totalBudget)}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Terpakai pada Kategori Beranggaran
                </p>
                <h2 className="mt-2 text-xl font-bold text-red-500">
                  {rupiah(totalBudgetedSpent)}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Sisa Anggaran
                </p>
                <h2 className={`mt-2 text-xl font-bold ${
                  remainingBudget >= 0
                    ? "text-green-600"
                    : "text-red-500"
                }`}>
                  {rupiah(remainingBudget)}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Pengeluaran
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-800">
                  {rupiah(totalExpense)}
                </h2>
              </div>

            </section>

            {/* FORM ANGGARAN */}
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold">
                {editingId ? "Edit Anggaran" : "Tambah Anggaran"}
              </h2>

              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada kategori pengeluaran.
                  <a
                    href="/categories"
                    className="ml-1 font-semibold text-blue-700"
                  >
                    Buat kategori dahulu
                  </a>
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Kategori Pengeluaran
                    </label>

                    <select
                      value={selectedCategory}
                      disabled={Boolean(editingId)}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 p-3 disabled:bg-slate-100"
                    >
                      <option value="">Pilih kategori</option>

                      {categories.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Batas Anggaran (Rupiah)
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="Contoh: 500000"
                      required
                      className="w-full rounded-lg border border-slate-300 p-3"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingId
                        ? "Simpan Perubahan"
                        : "Simpan Anggaran"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full rounded-lg border border-slate-300 p-3 font-semibold"
                    >
                      Batal Edit
                    </button>
                  )}
                </form>
              )}
            </section>

            {/* DAFTAR ANGGARAN */}
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold">
                Rincian Anggaran
              </h2>

              {budgets.length === 0 ? (
                <p className="py-5 text-center text-sm text-slate-500">
                  Belum ada anggaran pada bulan ini.
                </p>
              ) : (
                <div className="space-y-6">
                  {budgets.map((item) => {
                    const spent =
                      spentByCategory[item.category] || 0;

                    const budgetAmount = Number(item.amount);
                    const percentage =
                      (spent / budgetAmount) * 100;

                    const remaining = budgetAmount - spent;

                    const progressWidth = Math.min(
                      Math.max(percentage, 0),
                      100
                    );

                    const status =
                      percentage > 100
                        ? "Melebihi anggaran"
                        : percentage >= 80
                          ? "Hampir habis"
                          : "Masih tersedia";

                    const progressColor =
                      percentage > 100
                        ? "bg-red-600"
                        : percentage >= 80
                          ? "bg-amber-500"
                          : "bg-green-500";

                    return (
                      <div
                        key={item.id}
                        className="border-b border-slate-100 pb-6 last:border-0 last:pb-0"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">
                            {item.category}
                          </h3>

                          <span className="text-sm font-semibold">
                            {Math.round(percentage)}%
                          </span>
                        </div>

                        <div className="mb-2 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${progressColor}`}
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                          <span>
                            Terpakai {rupiah(spent)} dari {rupiah(budgetAmount)}
                          </span>

                          <span
                            className={
                              remaining >= 0
                                ? "font-semibold text-green-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {remaining >= 0
                              ? `Sisa ${rupiah(remaining)}`
                              : `Melebihi ${rupiah(Math.abs(remaining))}`}
                          </span>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            Hapus
                          </button>

                          <span className="ml-auto text-xs text-slate-500">
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* PENGELUARAN TANPA ANGGARAN */}
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-bold">
                Pengeluaran Tanpa Anggaran
              </h2>

              <p className="mb-4 text-sm text-slate-500">
                Pengeluaran pada kategori yang belum memiliki batas anggaran.
              </p>

              {unbudgetedCategories.length === 0 ? (
                <p className="text-sm text-green-600">
                  Semua kategori pengeluaran yang tercatat sudah memiliki anggaran.
                </p>
              ) : (
                <div className="space-y-3">
                  {unbudgetedCategories.map(([name, spent]) => (
                    <div
                      key={name}
                      className="flex justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                    >
                      <span className="text-sm font-medium">
                        {name}
                      </span>

                      <span className="text-sm font-semibold text-red-500">
                        {rupiah(spent)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </>
        )}

      </div>
    </main>
  );
}
