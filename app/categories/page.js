
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AppShell from "../components/AppShell";
import ConfirmButton from "../components/ConfirmButton";
import PageHeader from "../components/PageHeader";
import { formatUserFacingError } from "../../lib/user-facing-error";

export default function CategoriesPage() {
  // State pengguna
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // State kategori
  const [categories, setCategories] = useState([]);
  const [categoriesOwnerId, setCategoriesOwnerId] = useState(null);
  const [loading, setLoading] = useState(false);

  // State formulir
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Pesan
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 1. Memeriksa sesi pengguna
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

  // 2. Mengambil kategori dari Supabase
  useEffect(() => {
    if (!user) return;

    let active = true;

    async function fetchCategories() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        setCategories([]);
        setError(
          formatUserFacingError(
            error,
            "Kategori belum berhasil dimuat. Coba lagi, ya.",
          ),
        );
      } else {
        setCategories(data ?? []);
      }

      setCategoriesOwnerId(user.id);
      setLoading(false);
    }

    fetchCategories();

    return () => {
      active = false;
    };
  }, [user]);

  // 3. Menyimpan kategori baru atau perubahan
  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Masukkan nama kategori, ya.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let result;

      if (editingId) {
        // Mengubah nama kategori
        result = await supabase
          .from("categories")
          .update({ name: cleanName })
          .eq("id", editingId)
          .select()
          .single();
      } else {
        // Menambahkan kategori baru
        result = await supabase
          .from("categories")
          .insert({
            name: cleanName,
            type,
          })
          .select()
          .single();
      }

      if (result.error) {
        setError(
          formatUserFacingError(
            result.error,
            "Kategori belum berhasil disimpan. Coba lagi, ya.",
          ),
        );
        return;
      }

      setCategoriesOwnerId(user.id);
      if (editingId) {
        setCategories((current) =>
          current.map((item) =>
            item.id === editingId ? result.data : item
          )
        );

        setMessage("Kategorinya berhasil diperbarui.");
      } else {
        setCategories((current) =>
          [...current, result.data].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );

        setMessage("Kategori berhasil ditambahkan.");
      }

      setEditingId(null);
      setName("");
      setType("expense");
    } catch (err) {
      setError(
        formatUserFacingError(
          err,
          "Kategori belum berhasil disimpan. Coba lagi, ya.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  // 4. Mengisi formulir saat kategori diedit
  function handleEdit(item) {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setError("");
    setMessage("");
  }

  // 5. Membatalkan edit
  function handleCancel() {
    setEditingId(null);
    setName("");
    setType("expense");
    setError("");
    setMessage("");
  }

  // 6. Menghapus kategori
  async function handleDelete(item) {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", item.id);

    if (error) {
      setError(
        formatUserFacingError(
          error,
          "Kategori belum berhasil dihapus. Coba lagi, ya.",
        ),
      );
      return;
    }

    setCategoriesOwnerId(user.id);
    setCategories((current) =>
      current.filter((category) => category.id !== item.id)
    );

    if (editingId === item.id) {
      handleCancel();
    }

    setMessage("Kategori berhasil dihapus.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const isCategoriesLoading =
    Boolean(user) && (loading || categoriesOwnerId !== user.id);
  const currentError = categoriesOwnerId === user?.id ? error : "";
  const currentMessage = categoriesOwnerId === user?.id ? message : "";

  // Menampilkan daftar kategori
  function renderCategoryList(categoryType) {
    const currentCategories =
      categoriesOwnerId === user?.id ? categories : [];
    const filtered = currentCategories.filter(
      (item) => item.type === categoryType
    );

    if (filtered.length === 0) {
      return (
        <p className="py-4 text-sm text-[#a1a5b7]">
          Belum ada kategori nih. Tambahkan kategori supaya transaksi lebih mudah dikelompokkan.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#2a2e38] pb-3 last:border-0"
          >
            <p className="font-medium text-[#f4f5f7]">
              {item.name}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => handleEdit(item)}
                className="min-h-11 rounded-lg border border-[#383d49] px-3 text-xs font-semibold text-[#c8f76a] transition-colors hover:bg-[#232631]"
              >
                Edit
              </button>
              <ConfirmButton
                label="Hapus"
                confirmLabel={`Yakin mau menghapus kategori ${item.name}?`}
                confirmDescription="Kategori yang dihapus tidak bisa dikembalikan."
                onConfirm={() => handleDelete(item)}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Menunggu pemeriksaan sesi
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Menyiapkan DuetKu...
      </div>
    );
  }

  // Jika belum login
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d10] p-5">
        <div className="finance-card p-6 text-center">
          <p className="mb-4">
            Masuk dulu, ya, untuk melihat halaman ini.
          </p>

          <Link
            href="/"
            className="font-semibold text-[#c8f76a] underline underline-offset-2"
          >
            Kembali ke DuetKu
          </Link>
        </div>
      </main>
    );
  }

  // Tampilan utama kategori
  return (
    <AppShell user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader
          title="Kategori"
          subtitle="Buat kategori untuk mengelompokkan uang masuk dan uang keluar."
        />

        <section className="finance-card p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-[#f4f5f7]">
            {editingId ? "Ubah kategori" : "Tambah kategori"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-[#f4f5f7]">
                Nama kategori
              </label>

              <input
                id="category-name"
                type="text"
                placeholder="Contoh: Makanan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="finance-input"
              />
            </div>

            <div>
              <label htmlFor="category-type" className="mb-1.5 block text-sm font-medium text-[#f4f5f7]">
                Jenis transaksi
              </label>

              <select
                id="category-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={Boolean(editingId)}
                className="finance-input disabled:bg-[#262a33]"
              >
                <option value="income">Uang masuk</option>
                <option value="expense">Uang keluar</option>
              </select>

              {editingId && (
                <p className="mt-1 text-xs text-[#8a8ea4]">
                  Jenis kategori tidak bisa diubah saat diedit.
                </p>
              )}
            </div>

            {currentError && (
              <p role="alert" className="rounded-lg border border-[#49313c] bg-[#301f27] p-3 text-sm text-[#ff9caf]">
                {currentError}
              </p>
            )}

            {currentMessage && (
              <p role="status" className="rounded-lg border border-[#245240] bg-[#172a25] p-3 text-sm text-[#62dfa7]">
                {currentMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="finance-button-primary w-full disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan perubahan"
                  : "Tambah kategori"}
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
        </section>

        {/* Daftar kategori */}
        {isCategoriesLoading ? (
          <p role="status" className="finance-card py-10 text-center text-[#a1a5b7]">
            Menyiapkan kategori...
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">

            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#36c98b]">
                Kategori uang masuk
              </h2>

              {renderCategoryList("income")}
            </section>

            <section className="finance-card p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#d48af7]">
                Kategori uang keluar
              </h2>

              {renderCategoryList("expense")}
            </section>

          </div>
        )}

        <p className="text-xs leading-relaxed text-[#8a8ea4]">
          Perubahan nama kategori tidak mengubah transaksi yang sudah kamu
          catat. Nama kategori lama tetap tersimpan di riwayat transaksi.
        </p>

      </div>
    </AppShell>
  );
}
