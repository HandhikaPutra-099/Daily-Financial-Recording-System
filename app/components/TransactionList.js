import ConfirmButton from "./ConfirmButton";
import EmptyState from "./EmptyState";

function TransactionActions({ item, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="min-h-11 rounded-lg border border-[#383d49] px-3 text-xs font-semibold text-[#c5c8d3] transition-colors hover:border-[#666d7c] hover:bg-[#232631] hover:text-[#f4f5f7]"
      >
        Edit
      </button>
      <ConfirmButton
        label="Hapus"
        confirmLabel="Yakin mau menghapus transaksi ini?"
        confirmDescription="Transaksi yang dihapus tidak bisa dikembalikan."
        onConfirm={() => onDelete(item.id)}
        className="min-h-11 rounded-lg border border-[#49313c] bg-[#241b21] px-3 text-xs font-semibold text-[#f0718c] transition-colors hover:bg-[#301f27]"
      />
    </div>
  );
}

function TransactionIdentity({ item }) {
  const isIncome = item.type === "income";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold",
          isIncome
            ? "bg-[#172a25] text-[#36c98b]"
            : "bg-[#2a2033] text-[#d48af7]",
        ].join(" ")}
      >
        {(item.category || "?").slice(0, 1).toLocaleUpperCase("id-ID")}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#f4f5f7]">
          {item.name}
        </span>
        {item.notes && (
          <span className="mt-0.5 block truncate text-xs text-[#8a8ea4]">
            {item.notes}
          </span>
        )}
      </span>
    </div>
  );
}

export default function TransactionList({
  transactions,
  filteredTransactions,
  loading,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterCategory,
  setFilterCategory,
  filterMonth,
  setFilterMonth,
  sortOrder,
  setSortOrder,
  availableCategories,
  onEdit,
  onDelete,
  onAddTransaction,
  rupiah,
  formatDate,
}) {
  return (
    <section
      aria-labelledby="transactions-heading"
      className="finance-card min-w-0 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="transactions-heading"
            className="text-lg font-semibold text-[#f4f5f7]"
          >
            Transaksi terbaru
          </h2>
          <p className="mt-1 text-sm text-[#8a8ea4]">
            Semua catatan uang masuk dan uang keluar.
          </p>
        </div>
        <p aria-live="polite" className="text-xs text-[#8a8ea4]">
          {filteredTransactions.length} dari {transactions.length} transaksi
        </p>
      </div>

      <div className="my-5 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-5">
        <label className="sr-only" htmlFor="filter-search">
          Cari transaksi
        </label>
        <input
          type="search"
          id="filter-search"
          placeholder="Cari transaksi..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="finance-input"
        />
        <label className="sr-only" htmlFor="filter-type">
          Filter jenis transaksi
        </label>
        <select
          id="filter-type"
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          className="finance-input"
        >
          <option value="all">Semua jenis</option>
          <option value="income">Uang masuk</option>
          <option value="expense">Uang keluar</option>
        </select>
        <label className="sr-only" htmlFor="filter-category">
          Filter kategori
        </label>
        <select
          id="filter-category"
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          className="finance-input"
        >
          <option value="all">Semua kategori</option>
          {availableCategories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-month">
          Filter bulan
        </label>
        <input
          type="month"
          id="filter-month"
          value={filterMonth}
          onChange={(event) => setFilterMonth(event.target.value)}
          className="finance-input"
        />
        <label className="sr-only" htmlFor="filter-sort">
          Urutkan transaksi
        </label>
        <select
          id="filter-sort"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          className="finance-input"
        >
          <option value="newest">Tanggal terbaru</option>
          <option value="oldest">Tanggal terlama</option>
          <option value="highest">Nominal terbesar</option>
          <option value="lowest">Nominal terkecil</option>
        </select>
      </div>

      {loading && (
        <p role="status" className="rounded-lg bg-[#1d2028] py-10 text-center text-sm text-[#a1a5b7]">
          Menyiapkan transaksimu...
        </p>
      )}
      {!loading && transactions.length === 0 && (
        <EmptyState
          title="Belum ada transaksi nih."
          description="Yuk, mulai catat pemasukan dan pengeluaranmu."
          actionLabel="Catat transaksi"
          onAction={onAddTransaction}
        />
      )}
      {!loading &&
        transactions.length > 0 &&
        filteredTransactions.length === 0 && (
          <EmptyState
            title="Transaksi yang kamu cari belum ketemu."
            description="Coba kata kunci atau filter lainnya."
          />
        )}

      {!loading && filteredTransactions.length > 0 && (
        <>
          <ul role="list" className="space-y-2 md:hidden">
            {filteredTransactions.map((item) => {
              const isIncome = item.type === "income";
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-[#2a2e38] bg-[#13151a] p-3"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <TransactionIdentity item={item} />
                    <p
                      className={[
                        "shrink-0 text-right font-mono text-sm font-semibold tabular-nums",
                        isIncome ? "text-[#36c98b]" : "text-[#d48af7]",
                      ].join(" ")}
                    >
                      {isIncome ? "+" : "−"}
                      {rupiah(item.amount)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#2a2e38] pt-3">
                    <p className="min-w-0 truncate text-xs text-[#a1a5b7]">
                      {item.category} <span aria-hidden="true">·</span>{" "}
                      {formatDate(item.date)}
                    </p>
                    <TransactionActions
                      item={item}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[690px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2a2e38] text-[11px] font-medium text-[#8a8ea4]">
                  <th scope="col" className="px-3 py-3 font-medium">Transaksi</th>
                  <th scope="col" className="px-3 py-3 font-medium">Jenis</th>
                  <th scope="col" className="px-3 py-3 font-medium">Kategori</th>
                  <th scope="col" className="px-3 py-3 font-medium">Tanggal</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Nominal</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242731]">
                {filteredTransactions.map((item) => {
                  const isIncome = item.type === "income";
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-[#1d2028]">
                      <td className="max-w-[240px] px-3 py-3">
                        <TransactionIdentity item={item} />
                      </td>
                      <td className="px-3 py-3 text-xs text-[#a1a5b7]">
                        <span
                          className={[
                            "inline-flex rounded-md px-2 py-1",
                            isIncome
                              ? "bg-[#172a25] text-[#36c98b]"
                              : "bg-[#2a2033] text-[#d48af7]",
                          ].join(" ")}
                        >
                          {isIncome ? "Uang masuk" : "Uang keluar"}
                        </span>
                      </td>
                      <td className="max-w-[150px] truncate px-3 py-3 text-xs text-[#a1a5b7]">
                        {item.category}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-[#a1a5b7]">
                        {formatDate(item.date)}
                      </td>
                      <td
                        className={[
                          "whitespace-nowrap px-3 py-3 text-right font-mono text-sm font-semibold tabular-nums",
                          isIncome ? "text-[#36c98b]" : "text-[#d48af7]",
                        ].join(" ")}
                      >
                        {isIncome ? "+" : "−"}
                        {rupiah(item.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <TransactionActions
                          item={item}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
