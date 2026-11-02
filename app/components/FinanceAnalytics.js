"use client";

import { useState, useSyncExternalStore } from "react";
import EmptyState from "./EmptyState";
import StatCard from "./StatCard";

const subscribeToDate = () => () => {};
const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const CATEGORY_COLORS = [
  "#b7ef45",
  "#c66bfa",
  "#36c98b",
];
const PERIODS = [
  { days: 7, label: "7 hari", bucketCount: 7 },
  { days: 30, label: "1 bulan", bucketCount: 6 },
  { days: 90, label: "3 bulan", bucketCount: 12 },
];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateAtMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateIndex(date, startDate) {
  const dateValue = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const startValue = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  return Math.floor((dateValue - startValue) / 86400000);
}

function formatBucketLabel(date, periodDays) {
  if (periodDays === 7) {
    return date.toLocaleDateString("id-ID", { weekday: "short" });
  }
  if (periodDays === 30) {
    return date.toLocaleDateString("id-ID", { day: "numeric" });
  }
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function ChartEmptyState({ title, description, onAddTransaction }) {
  return (
    <EmptyState
      title={title}
      description={description}
      actionLabel="Catat transaksi"
      onAction={onAddTransaction}
    />
  );
}

export default function FinanceAnalytics({
  transactions,
  rupiah,
  loading,
  onAddTransaction,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[1]);
  const today = useSyncExternalStore(subscribeToDate, getCurrentDate, () => "");
  const now = today ? new Date(`${today}T00:00:00`) : new Date(0);
  const currentMonth = today ? monthKey(now) : "";

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentMonthTransactions = currentMonth
    ? transactions.filter((item) => String(item.date).startsWith(currentMonth))
    : [];
  const monthIncome = currentMonthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthExpense = currentMonthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const previousMonth = monthKey(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const previousMonthTransactions = transactions.filter((item) =>
    String(item.date).startsWith(previousMonth),
  );
  const previousMonthExpenses = previousMonthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseChange =
    previousMonthExpenses > 0
      ? ((monthExpense - previousMonthExpenses) / previousMonthExpenses) * 100
      : null;
  const monthlyCategoryTotals = Object.values(
    currentMonthTransactions
      .filter((item) => item.type === "expense")
      .reduce((result, item) => {
        const category = item.category || "Tanpa kategori";
        result[category] ??= { name: category, total: 0 };
        result[category].total += Number(item.amount || 0);
        return result;
      }, {}),
  ).sort((a, b) => b.total - a.total);
  const topMonthlyCategory = monthlyCategoryTotals[0];

  const monthlySeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = monthKey(date);
    const monthTransactions = transactions.filter((item) =>
      String(item.date).startsWith(key),
    );
    const income = monthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = monthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      key,
      income,
      expense,
      net: income - expense,
      transactionCount: monthTransactions.length,
    };
  });
  const activeMonthCount = monthlySeries.filter(
    (item) => item.transactionCount > 0,
  ).length;
  const openingBalance = transactions
    .filter((item) => String(item.date).slice(0, 7) < monthlySeries[0].key)
    .reduce(
      (sum, item) =>
        sum +
        (item.type === "income" ? 1 : item.type === "expense" ? -1 : 0) *
          Number(item.amount || 0),
      0,
    );
  let runningBalance = openingBalance;
  const balanceSeries = monthlySeries.map((item) => {
    runningBalance += item.net;
    return runningBalance;
  });

  const periodStart = dateAtMidnight(now);
  periodStart.setDate(periodStart.getDate() - selectedPeriod.days + 1);
  const chartBuckets = Array.from({ length: selectedPeriod.bucketCount }, (_, index) => {
    const bucketStartOffset = Math.floor(
      (index * selectedPeriod.days) / selectedPeriod.bucketCount,
    );
    const bucketEndOffset = Math.floor(
      ((index + 1) * selectedPeriod.days) / selectedPeriod.bucketCount,
    );
    const bucketDate = new Date(periodStart);
    bucketDate.setDate(periodStart.getDate() + bucketStartOffset);
    return {
      key: `${selectedPeriod.days}-${index}`,
      label: formatBucketLabel(bucketDate, selectedPeriod.days),
      income: 0,
      expense: 0,
      startOffset: bucketStartOffset,
      endOffset: bucketEndOffset,
    };
  });

  for (const transaction of transactions) {
    const transactionDate = new Date(`${String(transaction.date).slice(0, 10)}T00:00:00`);
    const dayIndex = getDateIndex(transactionDate, periodStart);
    if (dayIndex < 0 || dayIndex >= selectedPeriod.days) continue;

    const bucketIndex = Math.min(
      Math.floor((dayIndex * selectedPeriod.bucketCount) / selectedPeriod.days),
      selectedPeriod.bucketCount - 1,
    );
    const bucket = chartBuckets[bucketIndex];
    if (transaction.type === "income") {
      bucket.income += Number(transaction.amount || 0);
    } else if (transaction.type === "expense") {
      bucket.expense += Number(transaction.amount || 0);
    }
  }

  const maxPeriodAmount = Math.max(
    ...chartBuckets.flatMap((item) => [item.income, item.expense]),
    0,
  );
  const periodTransactions = transactions.filter((item) => {
    const transactionDate = new Date(`${String(item.date).slice(0, 10)}T00:00:00`);
    const dayIndex = getDateIndex(transactionDate, periodStart);
    return dayIndex >= 0 && dayIndex < selectedPeriod.days;
  });
  const periodExpenses = periodTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const categoryTotals = Object.values(
    periodTransactions
      .filter((item) => item.type === "expense")
      .reduce((result, item) => {
        const category = item.category || "Tanpa kategori";
        result[category] ??= { name: category, total: 0 };
        result[category].total += Number(item.amount || 0);
        return result;
      }, {}),
  ).sort((a, b) => b.total - a.total);
  const chartSegments = categoryTotals.reduce(
    (result, item, index) => {
      const end =
        result.end +
        (periodExpenses ? (item.total / periodExpenses) * 100 : 0);
      return {
        end,
        segments: [
          ...result.segments,
          `${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} ${result.end}% ${end}%`,
        ],
      };
    },
    { end: 0, segments: [] },
  ).segments;

  return (
    <>
      <section
        aria-label="Kondisi keuanganmu"
        className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Saldo saat ini"
          value={loading ? "Menghitung..." : rupiah(totalIncome - totalExpense)}
          detail="Uang masuk dikurangi uang keluar"
          variant="primary"
          featured
          sparkline={
            activeMonthCount > 1 &&
            new Set(balanceSeries).size > 1
              ? balanceSeries
              : undefined
          }
        />
        <StatCard
          label="Uang masuk"
          value={loading ? "Menghitung..." : rupiah(totalIncome)}
          detail="Total uang yang masuk sejauh ini"
          variant="income"
          sparkline={
            monthlySeries.filter((item) => item.income > 0).length > 1
              ? monthlySeries.map((item) => item.income)
              : undefined
          }
        />
        <StatCard
          label="Uang keluar"
          value={loading ? "Menghitung..." : rupiah(totalExpense)}
          detail="Total uang yang keluar sejauh ini"
          variant="expense"
          sparkline={
            monthlySeries.filter((item) => item.expense > 0).length > 1
              ? monthlySeries.map((item) => item.expense)
              : undefined
          }
        />
        <StatCard
          label="Sisa arus kas bulan ini"
          value={loading ? "Menghitung..." : rupiah(monthIncome - monthExpense)}
          detail="Uang masuk dikurangi uang keluar bulan ini"
          variant={monthIncome - monthExpense >= 0 ? "income" : "expense"}
          icon="cashflow"
          sparkline={
            activeMonthCount > 1 && new Set(monthlySeries.map((item) => item.net)).size > 1
              ? monthlySeries.map((item) => item.net)
              : undefined
          }
        />
      </section>

      <section
        aria-label="Analitik keuangan"
        className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]"
      >
        <section
          aria-labelledby="cashflow-heading"
          className="finance-card min-w-0 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="cashflow-heading"
                className="text-base font-semibold text-[#f4f5f7] sm:text-lg"
              >
                Arus kas
              </h2>
              <p className="mt-1 text-xs text-[#8a8ea4] sm:text-sm">
                Uang masuk dan uang keluar dari catatanmu
              </p>
            </div>
            <div
              role="group"
              aria-label="Pilih periode grafik"
              className="flex rounded-lg border border-[#2a2e38] bg-[#101217] p-1"
            >
              {PERIODS.map((period) => (
                <button
                  key={period.days}
                  type="button"
                  aria-pressed={selectedPeriod.days === period.days}
                  onClick={() => setSelectedPeriod(period)}
                  className={[
                    "min-h-11 rounded-md px-2.5 text-xs font-medium transition-colors sm:px-3",
                    selectedPeriod.days === period.days
                      ? "bg-[#292e20] text-[#c8f76a]"
                      : "text-[#8a8ea4] hover:text-[#f4f5f7]",
                  ].join(" ")}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-[#a1a5b7]">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#b7ef45]" aria-hidden="true" />
              Uang masuk
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#c66bfa]" aria-hidden="true" />
              Uang keluar
            </span>
          </div>

          {loading ? (
            <p role="status" className="mt-5 rounded-lg bg-[#1d2028] py-12 text-center text-sm text-[#a1a5b7]">
              Menghitung arus kas...
            </p>
          ) : maxPeriodAmount === 0 ? (
            <div className="mt-5">
              <ChartEmptyState
                title="Belum ada transaksi di periode ini."
                description="Transaksi yang kamu catat akan muncul di sini."
                onAddTransaction={onAddTransaction}
              />
            </div>
          ) : (
            <div
              key={selectedPeriod.days}
              className="finance-chart-enter relative mt-5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-36 sm:h-44"
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom, transparent calc(100% - 1px), #2a2e38 calc(100% - 1px))",
                  backgroundSize: "100% 25%",
                }}
              />
              <div
                className="relative grid h-36 gap-1 sm:h-44 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${selectedPeriod.bucketCount}, minmax(0, 1fr))`,
                }}
              >
                {chartBuckets.map((item, index) => (
                  <div
                    key={item.key}
                    className="flex min-w-0 flex-col items-center justify-end"
                  >
                    <div
                      role="img"
                      tabIndex={0}
                      aria-label={`${item.label}: pemasukan ${rupiah(item.income)}, pengeluaran ${rupiah(item.expense)}`}
                      className="finance-chart-point group relative flex h-full w-full items-end justify-center gap-0.5 rounded-sm px-0.5 sm:gap-1"
                      style={{ animationDelay: `${index * 24}ms` }}
                    >
                      <span className="finance-tooltip">
                        <span className="block font-medium text-[#c8f76a]">
                          Uang masuk {rupiah(item.income)}
                        </span>
                        <span className="block font-medium text-[#d48af7]">
                          Uang keluar {rupiah(item.expense)}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="finance-chart-bar-income w-[min(42%,24px)] rounded-t-[4px] transition-[height] duration-300 ease-out group-hover:brightness-110"
                        style={{
                          height: item.income
                            ? `${Math.max((item.income / maxPeriodAmount) * 100, 4)}%`
                            : "0%",
                        }}
                      />
                      <span
                        aria-hidden="true"
                        className="finance-chart-bar-expense w-[min(42%,24px)] rounded-t-[4px] transition-[height] duration-300 ease-out group-hover:brightness-110"
                        style={{
                          height: item.expense
                            ? `${Math.max((item.expense / maxPeriodAmount) * 100, 4)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="mt-2 w-full truncate text-center text-[10px] text-[#8a8ea4] sm:text-xs">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section
          aria-labelledby="category-spend-heading"
          className="finance-card min-w-0 p-4 sm:p-5"
        >
          <div>
            <h2
              id="category-spend-heading"
              className="text-base font-semibold text-[#f4f5f7] sm:text-lg"
            >
              Rincian pengeluaran
            </h2>
            <p className="mt-1 text-xs text-[#8a8ea4] sm:text-sm">
              Pembagian kategori pada {selectedPeriod.label.toLowerCase()} terakhir
            </p>
          </div>

          {loading ? (
            <p role="status" className="mt-5 rounded-lg bg-[#1d2028] py-12 text-center text-sm text-[#a1a5b7]">
              Menghitung uang keluar...
            </p>
          ) : categoryTotals.length === 0 ? (
            <div className="mt-5">
              <ChartEmptyState
                title="Belum ada pengeluaran di periode ini."
                description="Setiap pengeluaran yang kamu catat akan muncul di sini."
                onAddTransaction={onAddTransaction}
              />
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-5 2xl:flex-col">
                <div
                  role="img"
                  aria-label={`Diagram pengeluaran, total ${rupiah(periodExpenses)}`}
                  className="finance-chart-donut relative grid h-40 w-40 shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(${chartSegments.join(", ")})`,
                  }}
                >
                  <div className="finance-chart-donut-center grid h-[112px] w-[112px] place-items-center rounded-full bg-[#17191f] px-2 text-center">
                    <span className="text-xs leading-5 text-[#8a8ea4]">
                      Total uang keluar
                      <strong className="block break-all font-mono text-sm text-[#f4f5f7]">
                        {rupiah(periodExpenses)}
                      </strong>
                    </span>
                  </div>
                </div>
                <ul role="list" className="w-full min-w-0 space-y-3">
                  {categoryTotals.map((item, index) => {
                    const percentage =
                      periodExpenses > 0
                        ? (item.total / periodExpenses) * 100
                        : 0;
                    return (
                      <li
                        key={item.name}
                        className="flex min-w-0 items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                            }}
                          />
                          <span className="truncate text-[#c3c6d0]">{item.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-[#8a8ea4]">
                            {percentage.toFixed(0)}%
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[#f4f5f7]">
                          {rupiah(item.total)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </section>
      </section>

      <section
        aria-labelledby="finance-insight-heading"
        className="finance-insight mb-5"
      >
        <div className="finance-insight-mark" aria-hidden="true">
          <MetricInsightIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2
              id="finance-insight-heading"
              className="text-base font-semibold text-[#f4f5f7]"
            >
              Sorotan bulan ini
            </h2>
            <p className="text-xs text-[#8a8ea4]">
              {now.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {loading ? (
            <p role="status" className="mt-2 text-sm text-[#a1a5b7]">
              Menyiapkan sorotan bulanan...
            </p>
          ) : monthExpense > 0 || previousMonthExpenses > 0 ? (
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                {topMonthlyCategory ? (
                  <>
                    <p className="text-xs text-[#8a8ea4]">
                      Kategori dengan uang keluar terbanyak
                    </p>
                    <p className="mt-1 break-words text-sm font-medium text-[#d48af7]">
                      {topMonthlyCategory.name}
                      <span className="ml-2 font-mono text-[#f4f5f7]">
                        {rupiah(topMonthlyCategory.total)}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[#8a8ea4]">
                      Uang keluar bulan ini
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#36c98b]">
                      Belum ada pengeluaran bulan ini.
                    </p>
                  </>
                )}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[#8a8ea4]">
                  Dibanding bulan lalu
                </p>
                <p className="mt-1 text-sm font-medium text-[#c5c8d3]">
                  {expenseChange === null
                    ? "Belum ada pembanding bulan lalu"
                    : `${expenseChange > 0 ? "Naik" : expenseChange < 0 ? "Turun" : "Tetap"} ${Math.abs(expenseChange).toLocaleString("id-ID", { maximumSignificantDigits: 3 })}% dari ${rupiah(previousMonthExpenses)}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#a1a5b7]">
                Belum ada pengeluaran bulan ini. Setiap pengeluaran yang kamu
                catat akan muncul di sini.
              </p>
              <button
                type="button"
                onClick={onAddTransaction}
                className="min-h-11 shrink-0 rounded-lg border border-[#3b452d] bg-[#22281d] px-3 text-sm font-semibold text-[#c8f76a] transition-colors hover:border-[#52623a] hover:bg-[#292f22]"
              >
                Catat transaksi
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function MetricInsightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />
      <path d="M16 7h3v3" />
    </svg>
  );
}
