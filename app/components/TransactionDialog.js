"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import FormField from "./FormField";

export default function TransactionDialog({
  open,
  onOpenChange,
  editingId,
  type,
  setType,
  name,
  setName,
  category,
  setCategory,
  amount,
  setAmount,
  date,
  setDate,
  notes,
  setNotes,
  formError,
  categories,
  categoriesLoading,
  categoriesError,
  onSubmit,
  onCancelEdit,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function closeDialog() {
    onOpenChange(false);
    onCancelEdit();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="transaction-dialog-title"
      className="finance-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="transaction-dialog-title"
              className="text-xl font-semibold text-[#f4f5f7]"
            >
              {editingId ? "Ubah transaksi" : "Catat transaksi"}
            </h2>
            <p className="mt-1 text-sm text-[#a1a5b7]">
              Mau mencatat apa hari ini?
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Tutup formulir transaksi"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-[#383d49] text-lg text-[#a1a5b7] transition-colors hover:bg-[#232631]"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[#f4f5f7]">
              Jenis transaksi
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["expense", "Uang keluar"],
                ["income", "Uang masuk"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => {
                    setType(value);
                    setCategory("");
                  }}
                  className={[
                    "min-h-12 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    type === value
                      ? value === "income"
                        ? "border-[#36c98b] bg-[#172a25] text-[#62dfa7]"
                        : "border-[#c66bfa] bg-[#2a2033] text-[#d48af7]"
                      : "border-[#383d49] bg-[#1d2028] text-[#a1a5b7] hover:bg-[#262a33]",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <FormField id="tx-name" label="Nama transaksi">
            <input
              id="tx-name"
              type="text"
              placeholder="Contoh: Belanja kebutuhan"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="finance-input"
            />
          </FormField>

          <FormField id="tx-category" label="Kategori">
            <select
              id="tx-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              className="finance-input"
            >
              <option value="">Pilih kategori yang sesuai</option>
              {editingId &&
                category &&
                !categories.some(
                  (item) => item.name === category && item.type === type,
                ) && <option value={category}>{category} (kategori lama)</option>}
              {categories
                .filter((item) => item.type === type)
                .map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
            </select>
            {categoriesLoading && (
              <p role="status" className="mt-1 text-xs text-[#8a8ea4]">
                Menyiapkan kategori...
              </p>
            )}
            {categoriesError && (
              <p role="alert" className="mt-1 text-xs text-[#ff9caf]">
                {categoriesError}
              </p>
            )}
            {!categoriesLoading &&
              !categoriesError &&
              !categories.some((item) => item.type === type) && (
                <p className="mt-1 text-xs text-[#a1a5b7]">
                  Belum ada kategori untuk jenis ini. Buat kategori dulu, ya.{" "}
                  <Link
                    href="/categories"
                    className="font-semibold text-[#c8f76a] underline underline-offset-2"
                  >
                    Buat kategori
                  </Link>
                </p>
              )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="tx-amount" label="Nominal transaksi (Rupiah)">
              <input
                id="tx-amount"
                type="number"
                placeholder="Masukkan nominal transaksi"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="finance-input"
              />
            </FormField>
            <FormField id="tx-date" label="Tanggal transaksi">
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="finance-input"
              />
            </FormField>
          </div>

          <FormField id="tx-notes" label="Catatan (opsional)">
            <textarea
              id="tx-notes"
              placeholder="Tambahkan catatan (opsional)."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="finance-input min-h-20 resize-y"
            />
          </FormField>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-[#49313c] bg-[#301f27] px-3 py-2 text-sm text-[#ff9caf]"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="finance-button-secondary"
            >
              Batal
            </button>
            <button type="submit" className="finance-button-primary">
              {editingId ? "Simpan perubahan" : "Simpan transaksi"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
