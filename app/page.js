"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { formatUserFacingError } from "../lib/user-facing-error";
import {
  getLocalTransactions,
  saveLocalTransaction,
  queueLocalDelete,
  syncPendingTransactions,
  replaceLocalTransactionsFromServer,
} from "../lib/offline-sync";

import AppShell from "./components/AppShell";
import AuthScreen from "./components/AuthScreen";
import FinanceAnalytics from "./components/FinanceAnalytics";
import SyncBanner from "./components/SyncBanner";
import PageHeader from "./components/PageHeader";
import TransactionDialog from "./components/TransactionDialog";
import TransactionList from "./components/TransactionList";

/* ── Rupiah formatter ─────────────────────────────────────────── */
function rupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

/* ── Date formatter ───────────────────────────────────────────── */
function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Sort helper ──────────────────────────────────────────────── */
function sortTransactions(items) {
  return [...items].sort(
    (a, b) =>
      String(b.date).localeCompare(String(a.date)) ||
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
}

function getLocalDateString() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function Home() {
  /* ── Auth state ─────────────────────────────────────────────── */
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  /* ── Online / sync state ────────────────────────────────────── */
  const [isOnline, setIsOnline] = useState(true);
  const [syncMessage, setSyncMessage] = useState("");
  const [transactionError, setTransactionError] = useState("");

  /* ── Transaction state ──────────────────────────────────────── */
  const [transactions, setTransactions] = useState([]);
  const [transactionsOwnerId, setTransactionsOwnerId] = useState(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  /* ── Category state ─────────────────────────────────────────── */
  const [categories, setCategories] = useState([]);
  const [categoriesOwnerId, setCategoriesOwnerId] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");

  /* ── Transaction form state ─────────────────────────────────── */
  const [type, setType] = useState("expense");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  /* ── Filter state ───────────────────────────────────────────── */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [date, setDate] = useState("");

  /* ── Check auth session ─────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setAuthError(
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ── Monitor network ────────────────────────────────────────── */
  useEffect(() => {
    function update() {
      setIsOnline(navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  /* ── Load transactions (offline-first, then sync) ───────────── */
  useEffect(() => {
    if (!user) return;

    let active = true;

    async function loadTransactions() {
      setTransactionsLoading(true);
      setTransactionError("");

      try {
        const localData = await getLocalTransactions(user.id);
        if (!active) return;
        setTransactions(sortTransactions(localData));
        setTransactionsOwnerId(user.id);

        if (!navigator.onLine) {
          setSyncMessage(
            "Kamu sedang offline. Transaksimu tetap tersimpan di perangkat dan akan disinkronkan saat online kembali."
          );
          return;
        }

        setSyncMessage("");

        const syncResult = await syncPendingTransactions(user.id);
        if (!active) return;

        if (syncResult.error) {
          setTransactionError(
            formatUserFacingError(
              syncResult.error,
              "Sinkronisasi belum berhasil. Catatanmu tetap tersimpan di perangkat.",
            ),
          );
          setSyncMessage("Catatanmu tetap tersimpan di perangkat.");
          return;
        }

        if (syncResult.offline) {
          setSyncMessage(
            "Koneksi belum tersedia. Catatan di perangkat tetap bisa kamu buka.",
          );
          return;
        }

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (!active) return;

        if (error) {
          setTransactionError(
            formatUserFacingError(
              error,
              "Data belum berhasil diperbarui dari server. Catatan lokal tetap tersedia.",
            ),
          );
          setSyncMessage(
            "Catatan lokal tersedia, tapi belum berhasil diperbarui.",
          );
          return;
        }

        await replaceLocalTransactionsFromServer(user.id, data ?? []);
        if (!active) return;

        const updated = await getLocalTransactions(user.id);
        setTransactions(sortTransactions(updated));
        setTransactionsOwnerId(user.id);
        setSyncMessage("");
      } catch (err) {
        if (active) {
          setTransactions([]);
          setTransactionsOwnerId(user.id);
          setTransactionError(
            formatUserFacingError(
              err,
              "Sinkronisasi belum berhasil. Catatan lokal tetap tersimpan.",
            ),
          );
          setSyncMessage("Catatan lokal tetap tersimpan.");
        }
      } finally {
        if (active) setTransactionsLoading(false);
      }
    }

    loadTransactions();
    return () => { active = false; };
  }, [user, isOnline]);

  /* ── Load categories ────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    let active = true;

    async function fetchCategories() {
      setCategoriesLoading(true);
      setCategoriesError("");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        setCategories([]);
        setCategoriesError(
          formatUserFacingError(
            error,
            "Kategori belum berhasil dimuat. Coba lagi, ya.",
          ),
        );
      } else {
        setCategories(data ?? []);
      }

      setCategoriesOwnerId(user.id);
      setCategoriesLoading(false);
    }

    fetchCategories();
    return () => { active = false; };
  }, [user]);

  const currentTransactions =
    user && transactionsOwnerId === user.id ? transactions : [];
  const currentCategories =
    user && categoriesOwnerId === user.id ? categories : [];
  const isTransactionsLoading =
    Boolean(user) &&
    (transactionsLoading || transactionsOwnerId !== user.id);
  const isCategoriesLoading =
    Boolean(user) &&
    (categoriesLoading || categoriesOwnerId !== user.id);
  const currentCategoriesError =
    categoriesOwnerId === user?.id ? categoriesError : "";

  /* ── Available filter categories ───────────────────────────── */
  const availableCategories = [
    ...new Set(currentTransactions.map((t) => t.category)),
  ];

  /* ── Filtered transactions ──────────────────────────────────── */
  const filteredTransactions = currentTransactions
    .filter((t) => {
      const keyword = searchTerm.trim().toLowerCase();
      const matchesSearch = [t.name, t.category, t.notes || ""].some((v) =>
        v.toLowerCase().includes(keyword)
      );
      const matchesType = filterType === "all" || t.type === filterType;
      const matchesCategory =
        filterCategory === "all" || t.category === filterCategory;
      const matchesMonth =
        filterMonth === "" || t.date.startsWith(filterMonth);
      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    })
    .sort((a, b) => {
      if (sortOrder === "highest") return Number(b.amount) - Number(a.amount);
      if (sortOrder === "lowest") return Number(a.amount) - Number(b.amount);
      const dateComparison = String(a.date).localeCompare(String(b.date));
      return sortOrder === "oldest" ? dateComparison : -dateComparison;
    });

  function handleAuthModeChange(mode) {
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
  }

  /* ── Auth handlers ──────────────────────────────────────────── */
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
          options: { emailRedirectTo: window.location.origin },
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        setAuthError(
          formatUserFacingError(
            result.error,
            authMode === "login"
              ? "Belum bisa masuk. Coba lagi, ya."
              : "Akunmu belum berhasil dibuat. Coba lagi, ya.",
          ),
        );
        return;
      }

      if (authMode === "register" && !result.data.session) {
        setAuthMessage(
          "Akunmu berhasil dibuat. Cek email untuk verifikasi, ya."
        );
      } else {
        setAuthMessage("Berhasil masuk, selamat datang kembali!");
      }
    } catch (err) {
      setAuthError(
        formatUserFacingError(
          err,
          authMode === "login"
            ? "Belum bisa masuk. Coba lagi, ya."
            : "Akunmu belum berhasil dibuat. Coba lagi, ya.",
        ),
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  /* ── Transaction handlers ───────────────────────────────────── */
  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const numericAmount = Number(amount);
    if (
      !name.trim() ||
      !category.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setFormError(
        "Lengkapi dulu semua kolom dan masukkan nominal yang benar, ya.",
      );
      return;
    }

    setTransactionError("");
    setSyncMessage("Menyimpan catatan...");

    try {
      const existing = currentTransactions.find((t) => t.id === editingId);
      const newTransaction = {
        id: editingId || crypto.randomUUID(),
        name: name.trim(),
        category: category.trim(),
        type,
        amount: numericAmount,
        date,
        notes: notes.trim() || null,
        created_at: existing?.created_at || new Date().toISOString(),
      };

      await saveLocalTransaction(user.id, newTransaction);
      const localData = await getLocalTransactions(user.id);
      setTransactions(sortTransactions(localData));
      setTransactionsOwnerId(user.id);

      const wasEditing = Boolean(editingId);

      setEditingId(null);
      setName("");
      setCategory("");
      setAmount("");
      setNotes("");
      setFormError("");
      setShowForm(false);

      if (navigator.onLine) {
        const result = await syncPendingTransactions(user.id);
        if (result.error) {
          setSyncMessage(
            "Tersimpan di perangkat, tapi belum berhasil disinkronkan.",
          );
          setTransactionError(
            formatUserFacingError(
              result.error,
              "Transaksinya belum berhasil disinkronkan.",
            ),
          );
        } else if (result.offline) {
          setSyncMessage("Tersimpan di perangkat. Menunggu koneksi internet.");
        } else {
          const updated = await getLocalTransactions(user.id);
          setTransactions(sortTransactions(updated));
          setTransactionsOwnerId(user.id);
          setSyncMessage(
            wasEditing
              ? "Transaksimu berhasil diperbarui."
              : "Berhasil dicatat!"
          );
        }
      } else {
        setSyncMessage(
          "Berhasil dicatat di perangkat. Transaksi akan disinkronkan saat online kembali."
        );
      }
    } catch (err) {
      setTransactionError(
        formatUserFacingError(
          err,
          "Transaksinya belum berhasil disimpan. Coba lagi, ya.",
        ),
      );
      setSyncMessage("Transaksinya belum berhasil disimpan.");
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
    setFormError("");
    setShowForm(true);
  }

  function handleAddTransaction() {
    setDate(getLocalDateString());
    setShowForm(true);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setName("");
    setCategory("");
    setAmount("");
    setNotes("");
    setFormError("");
    setShowForm(false);
  }

  async function handleDelete(id) {
    try {
      setTransactionError("");
      await queueLocalDelete(user.id, id);
      const localData = await getLocalTransactions(user.id);
      setTransactions(sortTransactions(localData));
      setTransactionsOwnerId(user.id);

      if (navigator.onLine) {
        const result = await syncPendingTransactions(user.id);
        if (result.error) {
          setTransactionError(
            formatUserFacingError(
              result.error,
              "Penghapusan belum berhasil disinkronkan.",
            ),
          );
          setSyncMessage(
            "Penghapusan tersimpan di perangkat, tapi belum disinkronkan.",
          );
        } else if (result.offline) {
          setSyncMessage("Penghapusan disimpan dan menunggu koneksi internet.");
        } else {
          setSyncMessage("Transaksi berhasil dihapus.");
          const updated = await getLocalTransactions(user.id);
          setTransactions(sortTransactions(updated));
          setTransactionsOwnerId(user.id);
        }
      } else {
        setSyncMessage("Penghapusan tersimpan dan menunggu koneksi internet.");
      }
    } catch (err) {
      setTransactionError(
        formatUserFacingError(
          err,
          "Transaksinya belum berhasil dihapus. Coba lagi, ya.",
        ),
      );
      setSyncMessage("Transaksinya belum berhasil dihapus.");
    }
  }

  if (!authReady) {
    return (
      <div
        role="status"
        aria-label="Menyiapkan DuetKu"
        className="flex min-h-screen items-center justify-center bg-[#0b0d10]"
      >
        <p className="text-sm text-[#a1a5b7]">Menyiapkan DuetKu...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={handleAuthModeChange}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authError={authError}
        authMessage={authMessage}
        authBusy={authBusy}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Kondisi keuanganmu"
          subtitle="Yuk, cek uang masuk, uang keluar, dan transaksi terbaru."
        />
        <button
          type="button"
          onClick={handleAddTransaction}
          className="finance-button-primary w-full sm:mb-8 sm:w-auto"
        >
          Catat transaksi
        </button>
      </header>

      <SyncBanner
        isOnline={isOnline}
        syncMessage={syncMessage}
        error={transactionError}
      />

      <FinanceAnalytics
        transactions={currentTransactions}
        rupiah={rupiah}
        loading={isTransactionsLoading}
        onAddTransaction={handleAddTransaction}
      />

      <TransactionList
        transactions={currentTransactions}
        filteredTransactions={filteredTransactions}
        loading={isTransactionsLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        availableCategories={availableCategories}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddTransaction={handleAddTransaction}
        rupiah={rupiah}
        formatDate={formatDate}
      />

      <TransactionDialog
        open={showForm}
        onOpenChange={setShowForm}
        editingId={editingId}
        type={type}
        setType={setType}
        name={name}
        setName={setName}
        category={category}
        setCategory={setCategory}
        amount={amount}
        setAmount={setAmount}
        date={date}
        setDate={setDate}
        notes={notes}
        setNotes={setNotes}
        formError={formError}
        categories={currentCategories}
        categoriesLoading={isCategoriesLoading}
        categoriesError={currentCategoriesError}
        onSubmit={handleSubmit}
        onCancelEdit={handleCancelEdit}
      />
    </AppShell>
  );
}
