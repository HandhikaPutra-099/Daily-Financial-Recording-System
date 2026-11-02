
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

import {
  getLocalTransactions,
  saveLocalTransaction,
  queueLocalDelete,
  syncPendingTransactions,
  replaceLocalTransactionsFromServer,
} from "../lib/offline-sync";

export default function Home() {
  // 1. STATE TRANSAKSI
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Status koneksi dan sinkronisasi
  const [isOnline, setIsOnline] = useState(true);
  const [syncMessage, setSyncMessage] = useState(
    "Memeriksa status sinkronisasi..."
  );

  // State kategori
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");

  // 2. STATE AUTENTIKASI
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // 3. STATE FORM TRANSAKSI
  const [type, setType] = useState("expense");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // 4. STATE FILTER DAN PENCARIAN
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");

  const [date, setDate] = useState("");

  // Mengatur tanggal berdasarkan waktu lokal perangkat
  useEffect(() => {
    const today = new Date();

    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    );

    setDate(localDate.toISOString().slice(0, 10));
  }, []);

  // 4. MEMERIKSA SESI LOGIN
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setAuthError(error.message);
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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Mengambil transaksi dari Supabase
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    let active = true;

    async function fetchTransactions() {
      setTransactionsLoading(true);
      setTransactionError("");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setTransactionError(error.message);
      } else {
        setTransactions(data ?? []);
      }

      setTransactionsLoading(false);
    }

    fetchTransactions();

    return () => {
      active = false;
    };
  }, [user]);

// Mengambil kategori dari Supabase
  
// Mengambil transaksi lokal dan menyinkronkannya
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }

    let active = true;

    async function loadTransactions() {
      setTransactionsLoading(true);
      setTransactionError("");

      try {
        // 1. Tampilkan data lokal terlebih dahulu
        const localData = await getLocalTransactions(user.id);

        if (!active) return;

        setTransactions(sortTransactions(localData));

        // 2. Jika offline, gunakan data lokal
        if (!navigator.onLine) {
          setSyncMessage(
            "Mode offline. Perubahan akan disinkronkan saat internet tersedia."
          );
          return;
        }

        setSyncMessage("Memeriksa antrean sinkronisasi...");

        // 3. Kirim antrean transaksi ke Supabase
        const syncResult = await syncPendingTransactions(user.id);

        if (!active) return;

        if (syncResult.error) {
          setTransactionError(syncResult.error.message);
          setSyncMessage(
            "Belum berhasil sinkron. Data lokal tetap tersimpan."
          );
          return;
        }

        if (syncResult.offline) {
          setSyncMessage(
            "Koneksi belum tersedia. Menggunakan data lokal."
          );
          return;
        }

        // 4. Ambil data terbaru dari Supabase
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (!active) return;

        if (error) {
          setTransactionError(error.message);
          setSyncMessage(
            "Data lokal tersedia, tetapi belum berhasil diperbarui dari server."
          );
          return;
        }

        // 5. Perbarui cache lokal setelah antrean berhasil dikirim
        await replaceLocalTransactionsFromServer(
          user.id,
          data ?? []
        );

        if (!active) return;

        const updatedLocalData = await getLocalTransactions(user.id);

        setTransactions(sortTransactions(updatedLocalData));

        setSyncMessage(
          "Semua transaksi berhasil disinkronkan."
        );
      } catch (error) {
        if (active) {
          setTransactionError(error.message);
          setSyncMessage(
            "Sinkronisasi gagal. Data lokal tetap dipertahankan."
          );
        }
      } finally {
        if (active) {
          setTransactionsLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      active = false;
    };
  }, [user, isOnline]);

  // Memantau perubahan koneksi internet
  useEffect(() => {
    function updateConnection() {
      setIsOnline(navigator.onLine);
    }

    updateConnection();

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  function sortTransactions(items) {
  return [...items].sort(
    (a, b) =>
      String(b.date).localeCompare(String(a.date)) ||
      String(b.created_at || "").localeCompare(
        String(a.created_at || "")
      )
  );
  }

  // 5. FUNGSI LOGIN DAN REGISTRASI
  async function handleAuth(event) {
    event.preventDefault();

    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      let result;

      if (authMode === "register") {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      if (result.error) {
        setAuthError(result.error.message);
        return;
      }

      if (authMode === "register" && !result.data.session) {
        setAuthMessage(
          "Registrasi berhasil. Silakan periksa email untuk verifikasi akun."
        );
      } else {
        setAuthMessage("Berhasil masuk!");
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  // 6. FUNGSI LOGOUT
  async function handleLogout() {
    setAuthError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    }
  }

  // 7. MENGHITUNG KEUANGAN
  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + Number(item.amount), 0);

  const totalExpense = transactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount), 0);

  const balance = totalIncome - totalExpense;

  
  // Menyaring transaksi berdasarkan pencarian dan filter
  const filteredTransactions = transactions.filter((item) => {
    const keyword = searchTerm.trim().toLowerCase();

    const matchesSearch = [
      item.name,
      item.category,
      item.notes || "",
    ].some((value) =>
      value.toLowerCase().includes(keyword)
    );

    const matchesType =
      filterType === "all" || item.type === filterType;

    const matchesCategory =
      filterCategory === "all" ||
      item.category === filterCategory;

    const matchesMonth =
      filterMonth === "" || item.date.startsWith(filterMonth);

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesMonth
    );
  });

  // Mengambil kategori yang tersedia
  const availableCategories = [
    ...new Set(transactions.map((item) => item.category)),
  ];

  // 8. FORMAT RUPIAH
  const rupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(number);

  // 9. FORMAT TANGGAL
  const formatDate = (dateString) =>
    new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // 10. MENAMBAHKAN TRANSAKSI SEMENTARA  
  async function handleSubmit(event) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !name.trim() ||
      !category.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      alert("Lengkapi formulir dan masukkan nominal yang valid.");
      return;
    }

    setTransactionError("");
    setSyncMessage("Menyimpan transaksi di perangkat...");

    try {
      const existingTransaction = transactions.find(
        (item) => item.id === editingId
      );

      // ID dibuat di perangkat agar bisa digunakan saat offline
      const newTransaction = {
        id: editingId || crypto.randomUUID(),
        name: name.trim(),
        category: category.trim(),
        type,
        amount: numericAmount,
        date,
        notes: notes.trim() || null,
        created_at:
          existingTransaction?.created_at ||
          new Date().toISOString(),
      };

      // 1. Simpan ke IndexedDB dan antrean
      await saveLocalTransaction(user.id, newTransaction);

      // 2. Perbarui tampilan dari data lokal
      const localData = await getLocalTransactions(user.id);

      setTransactions(sortTransactions(localData));

      const wasEditing = Boolean(editingId);

      // 3. Bersihkan formulir
      setEditingId(null);
      setName("");
      setCategory("");
      setAmount("");
      setNotes("");

      // 4. Jika online, coba kirim ke Supabase
      if (navigator.onLine) {
        const result = await syncPendingTransactions(user.id);

        if (result.error) {
          setSyncMessage(
            "Tersimpan di perangkat, tetapi belum berhasil dikirim ke server."
          );
          setTransactionError(result.error.message);
        } else if (result.offline) {
          setSyncMessage(
            "Tersimpan di perangkat. Menunggu koneksi internet."
          );
        } else {
          const updated = await getLocalTransactions(user.id);

          setTransactions(sortTransactions(updated));

          setSyncMessage(
            wasEditing
              ? "Perubahan berhasil disimpan dan disinkronkan."
              : "Transaksi berhasil disimpan dan disinkronkan."
          );
        }
      } else {
        setSyncMessage(
          "Transaksi tersimpan di perangkat dan menunggu koneksi internet."
        );
      }
    } catch (error) {
      setTransactionError(error.message);
      setSyncMessage("Gagal menyimpan transaksi lokal.");
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);

    setName(item.name);
    setCategory(item.category);
    setType(item.type);
    setAmount(String(item.amount));
    setDate(item.date);
    setNotes(item.notes || "");
  }

  
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus transaksi ini?"
    );

    if (!confirmed) return;

    try {
      setTransactionError("");

      // 1. Hapus dari perangkat dan masukkan perintah
      // penghapusan ke antrean sinkronisasi
      await queueLocalDelete(user.id, id);

      // 2. Perbarui daftar transaksi lokal
      const localData = await getLocalTransactions(user.id);

      setTransactions(sortTransactions(localData));

      // 3. Coba hapus dari Supabase jika online
      if (navigator.onLine) {
        const result = await syncPendingTransactions(user.id);

        if (result.error) {
          setTransactionError(result.error.message);
          setSyncMessage(
            "Penghapusan tersimpan di perangkat, tetapi belum terkirim ke server."
          );
        } else {
          setSyncMessage(
            "Transaksi berhasil dihapus dan disinkronkan."
          );
        }
      } else {
        setSyncMessage(
          "Penghapusan disimpan di perangkat dan menunggu koneksi internet."
        );
      }
    } catch (error) {
      setTransactionError(error.message);
      setSyncMessage("Gagal menghapus transaksi lokal.");
    }
  }

  // 11. MENUNGGU PEMERIKSAAN SESI
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Memeriksa akun...
      </div>
    );
  }

  // 12. TAMPILAN LOGIN DAN REGISTRASI
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-slate-800">
            Daily Finance
          </h1>

          <p className="mt-2 mb-6 text-sm text-slate-500">
            Kelola pemasukan dan pengeluaranmu.
          </p>

          <h2 className="mb-5 text-lg font-semibold">
            {authMode === "login" ? "Masuk ke akun" : "Buat akun baru"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
                className="w-full rounded-lg border p-3"
              />
            </div>

            {authError && (
              <p className="text-sm text-red-600">
                {authError}
              </p>
            )}

            {authMessage && (
              <p className="text-sm text-green-600">
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-50"
            >
              {authBusy
                ? "Memproses..."
                : authMode === "login"
                  ? "Login"
                  : "Daftar"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {authMode === "login"
              ? "Belum punya akun?"
              : "Sudah punya akun?"}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthError("");
                setAuthMessage("");
              }}
              className="ml-1 font-semibold text-blue-700"
            >
              {authMode === "login" ? "Daftar" : "Login"}
            </button>
          </p>
        </div>
      </main>
    );
  }

  // 13. DASHBOARD UTAMA
  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 md:p-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Daily Finance
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Catatan keuangan harianmu.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {user.email}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/categories"
              className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700"
            >
              Kategori
            </a>

            <a
              href="/reports"
              className="rounded-lg bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700"
            >
              Laporan
            </a>

            <a
              href="/budgets"
              className="rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-700"
            >
              Anggaran
            </a>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>
        
        {/* STATUS KONEKSI DAN SINKRONISASI */}
        <div
          className={`mb-6 rounded-xl border p-4 ${
            isOnline
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? "bg-green-500" : "bg-amber-500"
              }`}
            />

            <p className="text-sm font-semibold">
              {isOnline
                ? "Koneksi terdeteksi"
                : "Mode Offline"}
            </p>
          </div>

          <p className="mt-2 text-xs text-slate-600">
            {syncMessage}
          </p>

          {transactionError && (
            <p className="mt-2 text-xs text-red-600">
              {transactionError}
            </p>
          )}
        </div>

        {/* Saldo */}
        <section className="mb-6 rounded-2xl bg-blue-700 p-6 text-white shadow">
          <p className="text-sm text-blue-100">
            Total Saldo
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            {rupiah(balance)}
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Ringkasan seluruh keuanganmu
          </p>
        </section>

        {/* Ringkasan */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Pemasukan
            </p>
            <h3 className="mt-2 text-xl font-bold text-green-600">
              {rupiah(totalIncome)}
            </h3>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Pengeluaran
            </p>
            <h3 className="mt-2 text-xl font-bold text-red-500">
              {rupiah(totalExpense)}
            </h3>
          </div>
        </section>

        {/* Form Tambah Transaksi */}
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold">
            Tambah Transaksi
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Jenis Transaksi
              </label>

              <select
                value={type}
                onChange={(event) => {
                setType(event.target.value);
                setCategory("");
                }}
                className="w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Nama Transaksi
              </label>

              <input
                type="text"
                placeholder="Contoh: Beli makan siang"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Kategori
                </label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 p-3"
                >
                  <option value="">Pilih kategori</option>

                  {/* Mempertahankan kategori lama ketika mengedit transaksi */}
                  {editingId &&
                    category &&
                    !categories.some(
                      (item) => item.name === category && item.type === type
                    ) && (
                      <option value={category}>
                        {category} (kategori lama)
                      </option>
                    )}

                  {/* Menampilkan kategori sesuai jenis transaksi */}
                  {categories
                    .filter((item) => item.type === type)
                    .map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                </select>

                {categoriesLoading && (
                  <p className="mt-1 text-xs text-slate-500">
                    Memuat kategori...
                  </p>
                )}

                {categoriesError && (
                  <p className="mt-1 text-xs text-red-600">
                    Gagal mengambil kategori: {categoriesError}
                  </p>
                )}

                {!categoriesLoading &&
                  !categoriesError &&
                  !categories.some((item) => item.type === type) && (
                    <p className="mt-2 text-xs text-slate-500">
                      Belum ada kategori untuk jenis transaksi ini.
                      <a
                        href="/categories"
                        className="ml-1 font-semibold text-blue-700"
                      >
                        Buat kategori
                      </a>
                    </p>
                  )}
              </div>


            <div>
              <label className="mb-1 block text-sm font-medium">
                Nominal (Rupiah)
              </label>

              <input
                type="number"
                placeholder="Contoh: 25000"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Tanggal
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Catatan (Opsional)
              </label>

              <textarea
                placeholder="Tambahkan keterangan..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3"
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800"
            >
              {editingId ? "Simpan Perubahan" : "Simpan Transaksi"}
            </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setCategory("");
                setAmount("");
                setNotes("");
              }}
              className="w-full rounded-lg border border-slate-300 p-3 font-semibold text-slate-700"
            >
              Batal Edit
            </button>
          )}
          </form>
        </section>

        {/* Daftar Transaksi */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold">
            Daftar Transaksi
          </h3>

          {/* Pencarian dan Filter */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* Pencarian */}
            <input
              type="search"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-slate-300 p-3"
            />

            {/* Filter jenis */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-300 p-3"
            >
              <option value="all">Semua Jenis</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>

            {/* Filter kategori */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-slate-300 p-3"
            >
              <option value="all">Semua Kategori</option>

              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Filter bulan */}
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-slate-300 p-3"
            />

          </div>

          {transactionError && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              Gagal memuat atau menyimpan transaksi: {transactionError}
            </p>
          )}

          {transactionsLoading && (
            <p className="mb-4 text-sm text-slate-500">
              Mengambil data transaksi...
            </p>
          )}

          {!transactionsLoading &&
            transactions.length > 0 &&
            filteredTransactions.length === 0 && (
              <p className="py-5 text-center text-sm text-slate-500">
                Tidak ada transaksi yang sesuai dengan pencarian atau filter.
              </p>
            )}

          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada transaksi.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 border-b border-slate-100 pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Informasi transaksi */}
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {item.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {item.category} · {formatDate(item.date)}
                    </p>

                    {item.notes && (
                      <p className="mt-1 text-xs text-slate-400">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Nominal dan tombol */}
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">

                    <p
                      className={`font-semibold ${
                        item.type === "income"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {rupiah(item.amount)}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
