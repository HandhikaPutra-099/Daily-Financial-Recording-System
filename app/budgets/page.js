
"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AppShell from "../components/AppShell";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { formatUserFacingError } from "../../lib/user-facing-error";

const subscribeToMonth = () => () => {};
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function BudgetsPage() {
  // 1. STATE AUTENTIKASI
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // 2. STATE DATA
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dataOwnerId, setDataOwnerId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 3. STATE FORM
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState(null);

  const currentMonth = useSyncExternalStore(
    subscribeToMonth,
    getCurrentMonth,
    () => "",
  );
  const [selectedMonthOverride, setSelectedMonthOverride] = useState(null);
  const selectedMonth = selectedMonthOverride ?? currentMonth;

  // 4. MEMERIKSA LOGIN
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

  // 5. MENGAMBIL KATEGORI, ANGGARAN, DAN TRANSAKSI
  useEffect(() => {
    if (!user || !selectedMonth) return;

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
        setError(
          formatUserFacingError(
            firstError,
            "Data anggaran belum berhasil dimuat. Coba lagi, ya.",
          ),
        );
      }

      const categoryData = categoryResult.error ? [] : categoryResult.data ?? [];

      setCategories(categoryData);
      setBudgets(budgetResult.error ? [] : budgetResult.data ?? []);
      setTransactions(
        transactionResult.error ? [] : transactionResult.data ?? []
      );
      setDataOwnerId(`${user.id}:${selectedMonth}`);

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
  const currentDataKey = user ? `${user.id}:${selectedMonth}` : "";
  const hasCurrentData = Boolean(user && dataOwnerId === currentDataKey);
  const currentCategories = hasCurrentData ? categories : [];
  const currentBudgets = hasCurrentData ? budgets : [];
  const currentTransactions = hasCurrentData ? transactions : [];
  const isDataLoading =
    Boolean(user) && (loading || dataOwnerId !== currentDataKey);
  const currentError = hasCurrentData ? error : "";
  const currentMessage = hasCurrentData ? message : "";

  const spentByCategory = currentTransactions.reduce((result, item) => {
    const category = item.category || "Tanpa kategori";

    result[category] =
      (result[category] || 0) + Number(item.amount || 0);

    return result;
  }, {});

  // 7. MENGHITUNG TOTAL ANGGARAN
  const totalBudget = currentBudgets.reduce(
    (total, item) => total + Number(item.amount),
    0
  );

  // Pengeluaran dalam kategori yang sudah dianggarkan
  const totalBudgetedSpent = currentBudgets.reduce(
    (total, item) =>
      total + (spentByCategory[item.category] || 0),
    0
  );

  // Seluruh pengeluaran bulan ini
  const totalExpense = currentTransactions.reduce(
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
      setError("Pilih kategori dan masukkan nominal yang benar, ya.");
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
        setError(
          formatUserFacingError(
            result.error,
            "Anggaran belum berhasil disimpan. Coba lagi, ya.",
          ),
        );
        return;
      }

      setDataOwnerId(`${user.id}:${selectedMonth}`);
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

      setMessage("Anggaran berhasil disimpan.");
    } catch (err) {
      setError(
        formatUserFacingError(
          err,
          "Anggaran belum berhasil disimpan. Coba lagi, ya.",
        ),
      );
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
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", item.id);

    if (error) {
      setError(
        formatUserFacingError(
          error,
          "Anggaran belum berhasil dihapus. Coba lagi, ya.",
        ),
      );
      return;
    }

    setDataOwnerId(`${user.id}:${selectedMonth}`);
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
        !currentBudgets.some((item) => item.category === name)
    )
    .sort((a, b) => b[1] - a[1]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // 14. MENUNGGU LOGIN
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Menyiapkan DuetKu...
      </div>
    );
  }

  // 15. JIKA BELUM LOGIN
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

  // 16. TAMPILAN ANGGARAN
  return (
    <AppShell user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Anggaran"
          subtitle="Atur batas uang keluar per kategori dan pantau pemakaiannya."
        />

        {/* PILIH BULAN */}
        <section className="finance-card p-5 sm:p-6">
          <label htmlFor="budget-month" className="mb-2 block text-sm font-semibold text-[#f4f5f7]">
            Bulan anggaran
          </label>

          <input
            id="budget-month"
            type="month"
            value={selectedMonth}
            disabled={Boolean(editingId)}
            onChange={(event) =>
              setSelectedMonthOverride(event.target.value)
            }
            className="finance-input w-full sm:max-w-xs disabled:bg-[#262a33]"
          />
        </section>

        {/* PESAN ERROR */}
        {currentError && (
          <p role="alert" className="rounded-lg border border-[#49313c] bg-[#301f27] p-3 text-sm text-[#ff9caf]">
            {currentError}
          </p>
        )}

        {/* PESAN BERHASIL */}
        {currentMessage && (
          <p role="status" className="rounded-lg border border-[#245240] bg-[#172a25] p-3 text-sm text-[#62dfa7]">
            {currentMessage}
          </p>
        )}

        {isDataLoading ? (
          <p role="status" className="finance-card py-10 text-center text-[#a1a5b7]">
            Menyiapkan anggaran...
          </p>
        ) : (
          <>
            {/* RINGKASAN */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total batas anggaran" value={rupiah(totalBudget)} variant="primary" />
              <StatCard label="Sudah terpakai" value={rupiah(totalBudgetedSpent)} variant="expense" />
              <StatCard
                label="Sisa anggaran"
                value={rupiah(remainingBudget)}
                variant={remainingBudget >= 0 ? "income" : "expense"}
              />
              <StatCard label="Uang keluar bulan ini" value={rupiah(totalExpense)} />
            </section>

            {/* FORM ANGGARAN */}
            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-semibold text-[#f4f5f7]">
                {editingId ? "Ubah anggaran" : "Tambah anggaran"}
              </h2>

              {currentCategories.length === 0 ? (
                <p className="text-sm text-[#a1a5b7]">
                  Belum ada kategori uang keluar nih.
                  <Link
                    href="/categories"
                    className="ml-1 font-semibold text-[#c8f76a] underline underline-offset-2"
                  >
                    Buat kategori dulu
                  </Link>
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="budget-category" className="mb-1.5 block text-sm font-medium text-[#f4f5f7]">
                      Kategori pengeluaran
                    </label>

                    <select
                      id="budget-category"
                      value={selectedCategory}
                      disabled={Boolean(editingId)}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value)
                      }
                      required
                      className="finance-input disabled:bg-[#262a33]"
                    >
                      <option value="">Pilih kategori yang sesuai</option>

                      {currentCategories.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="budget-amount" className="mb-1.5 block text-sm font-medium text-[#f4f5f7]">
                      Batas pengeluaran (Rupiah)
                    </label>

                    <input
                      id="budget-amount"
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="Contoh: 500.000"
                      required
                      className="finance-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="finance-button-primary w-full disabled:opacity-50"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingId
                        ? "Simpan perubahan"
                        : "Simpan anggaran"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="finance-button-secondary w-full"
                    >
                      Batal ubah
                    </button>
                  )}
                </form>
              )}
            </section>

            {/* DAFTAR ANGGARAN */}
            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-semibold text-[#f4f5f7]">
                Rincian anggaran
              </h2>

              {currentBudgets.length === 0 ? (
                <EmptyState
                  title="Belum ada anggaran bulan ini."
                  description="Pilih kategori uang keluar, lalu tentukan batasnya."
                  actionLabel={currentCategories.length === 0 ? "Kelola kategori" : undefined}
                  actionHref={currentCategories.length === 0 ? "/categories" : undefined}
                />
              ) : (
                <div className="space-y-6">
                  {currentBudgets.map((item) => {
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
                        ? "bg-[#f0718c]"
                        : percentage >= 80
                          ? "bg-[#f0c66a]"
                          : "bg-[#b7ef45]";

                    return (
                      <div
                        key={item.id}
                        className="border-b border-[#2a2e38] pb-6 last:border-0 last:pb-0"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold text-[#f4f5f7]">
                            {item.category}
                          </h3>

                          <span className="text-sm font-semibold">
                            {Math.round(percentage)}%
                          </span>
                        </div>

                        <div
                          className="mb-2 h-2.5 overflow-hidden rounded-full bg-[#2a2e38]"
                          role="progressbar"
                          aria-label={`Penggunaan anggaran ${item.category}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.min(Math.max(Math.round(percentage), 0), 100)}
                        >
                          <div
                            className={`h-full rounded-full ${progressColor}`}
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap justify-between gap-2 text-xs text-[#a1a5b7]">
                          <span>
                            Terpakai {rupiah(spent)} dari {rupiah(budgetAmount)}
                          </span>

                          <span
                            className={
                              remaining >= 0
                                ? "font-semibold text-[#36c98b]"
                                : "font-semibold text-[#f0718c]"
                            }
                          >
                            {remaining >= 0
                              ? `Sisa ${rupiah(remaining)}`
                              : `Melebihi ${rupiah(Math.abs(remaining))}`}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="min-h-11 rounded-lg border border-[#383d49] px-3 text-xs font-semibold text-[#c8f76a] transition-colors hover:bg-[#232631]"
                          >
                            Edit
                          </button>

                          <ConfirmButton
                            label="Hapus"
                            confirmLabel={`Yakin mau menghapus anggaran ${item.category}?`}
                            confirmDescription="Anggaran yang dihapus tidak bisa dikembalikan."
                            onConfirm={() => handleDelete(item)}
                          />

                          <span className="ml-auto text-xs text-[#8a8ea4]">
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
            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-semibold text-[#f4f5f7]">
                Uang keluar di luar anggaran
              </h2>

              <p className="mb-4 text-sm text-[#a1a5b7]">
                Uang keluar di kategori yang belum punya batas anggaran.
              </p>

              {unbudgetedCategories.length === 0 ? (
                <p className="rounded-lg bg-[#172a25] p-4 text-sm text-[#62dfa7]">
                  Semua pengeluaran bulan ini sudah masuk anggaran.
                </p>
              ) : (
                <div className="space-y-3">
                  {unbudgetedCategories.map(([name, spent]) => (
                    <div
                      key={name}
                      className="flex flex-wrap justify-between gap-3 border-b border-[#2a2e38] pb-3 last:border-0"
                    >
                      <span className="text-sm font-medium text-[#f4f5f7]">
                        {name}
                      </span>

                      <span className="font-mono text-sm font-semibold tabular-nums text-[#d48af7]">
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
    </AppShell>
  );
}
