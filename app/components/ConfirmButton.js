"use client";

import { useState, useEffect, useRef } from "react";

export default function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "Yakin mau menghapus?",
  confirmDescription = "Data yang dihapus tidak bisa dikembalikan.",
  cancelLabel = "Batal",
  className,
}) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  function handleFirstClick() {
    setPending(true);
    timerRef.current = setTimeout(() => setPending(false), 3000);
  }

  function handleConfirm() {
    clearTimeout(timerRef.current);
    setPending(false);
    onConfirm();
  }

  function handleCancel() {
    clearTimeout(timerRef.current);
    setPending(false);
  }

  if (pending) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p role="status" className="max-w-60 text-xs leading-4 text-[#a1a5b7]">
          {confirmDescription}
        </p>
        <span className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-11 rounded-lg border border-[#f0718c] bg-[#301f27] px-3 text-xs font-semibold text-[#ff9caf] transition-colors duration-150 hover:bg-[#49313c] hover:text-[#fff]"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-11 rounded-lg px-3 text-xs font-medium text-[#a1a5b7] transition-colors duration-150 hover:bg-[#1d2028] hover:text-[#f4f5f7]"
          >
            {cancelLabel}
          </button>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFirstClick}
      className={
        className ||
        "min-h-11 rounded-lg border border-[#49313c] bg-[#241b21] px-3 text-xs font-semibold text-[#ff9caf] transition-colors duration-150 hover:bg-[#301f27]"
      }
    >
      {label}
    </button>
  );
}
