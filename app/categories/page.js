
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function CategoriesPage() {
  // State pengguna
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // State kategori
  const [categories, setCategories] = useState([]);
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
        setError(error.message);
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
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

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
        setError(error.message);
      } else {
        setCategories(data ?? []);
      }

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
      setError("Nama kategori tidak boleh kosong.");
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
        setError(result.error.message);
        return;
      }

      if (editingId) {
        setCategories((current) =>
          current.map((item) =>
            item.id === editingId ? result.data : item
          )
        );

        setMessage("Kategori berhasil diperbarui.");
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
      setError(err.message);
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
    const confirmed = window.confirm(
      `Hapus kategori "${item.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setCategories((current) =>
      current.filter((category) => category.id !== item.id)
    );

    if (editingId === item.id) {
      handleCancel();
    }

    setMessage("Kategori berhasil dihapus.");
  }

  // Menampilkan daftar kategori
  function renderCategoryList(categoryType) {
    const filtered = categories.filter(
      (item) => item.type === categoryType
    );

    if (filtered.length === 0) {
      return (
        <p className="py-4 text-sm text-slate-400">
          Belum ada kategori.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
          >
            <p className="font-medium text-slate-700">
              {item.name}
            </p>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleEdit(item)}
                className="rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
              >
                Hapus
              </button>
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
        Memeriksa akun...
      </div>
    );
  }

  // Jika belum login
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="rounded-xl bg-white p-6 text-center shadow">
          <p className="mb-4">
            Silakan login terlebih dahulu.
          </p>

          <a
            href="/"
            className="font-semibold text-blue-700"
          >
            Kembali ke halaman login
          </a>
        </div>
      </main>
    );
  }

  // Tampilan utama kategori
  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 md:p-10">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <header className="mb-8">
          <a
            href="/"
            className="text-sm font-medium text-blue-700"
          >
            ← Kembali ke Dashboard
          </a>

          <h1 className="mt-4 text-2xl font-bold">
            Pengelolaan Kategori
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Atur kategori pemasukan dan pengeluaranmu.
          </p>
        </header>

        {/* Form kategori */}
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold">
            {editingId ? "Edit Kategori" : "Tambah Kategori"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nama Kategori
              </label>

              <input
                type="text"
                placeholder="Contoh: Makanan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Jenis Kategori
              </label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={Boolean(editingId)}
                className="w-full rounded-lg border border-slate-300 p-3 disabled:bg-slate-100"
              >
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>

              {editingId && (
                <p className="mt-1 text-xs text-slate-400">
                  Jenis kategori tidak dapat diubah saat mengedit.
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Tambah Kategori"}
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
        </section>

        {/* Daftar kategori */}
        {loading ? (
          <p className="text-center text-slate-500">
            Memuat kategori...
          </p>
        ) : (
          <div className="space-y-6">

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-green-700">
                Kategori Pemasukan
              </h2>

              {renderCategoryList("income")}
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-red-600">
                Kategori Pengeluaran
              </h2>

              {renderCategoryList("expense")}
            </section>

          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          Catatan: perubahan atau penghapusan kategori tidak mengubah
          riwayat transaksi lama. Nama kategori pada transaksi lama
          tetap tersimpan sebagai catatan historis.
        </p>

      </div>
    </main>
  );
}
