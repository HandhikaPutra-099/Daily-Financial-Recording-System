
import { localDb } from "./local-db";
import { supabase } from "./supabase";

// 1. Mengambil transaksi lokal berdasarkan pengguna
export async function getLocalTransactions(userId) {
  return await localDb.transactions
    .where("userId")
    .equals(userId)
    .toArray();
}

// 2. Menyimpan transaksi ke IndexedDB dan antrean sinkronisasi
export async function saveLocalTransaction(userId, transaction) {
  const localTransaction = {
    ...transaction,
    userId,
    syncStatus: "pending",
  };

  const serverPayload = {
    ...transaction,
    user_id: userId,
  };

  await localDb.transaction(
    "rw",
    localDb.transactions,
    localDb.syncQueue,
    async () => {
      await localDb.transactions.put(localTransaction);

      await localDb.syncQueue.add({
        userId,
        transactionId: transaction.id,
        operation: "upsert",
        payload: serverPayload,
        createdAt: Date.now(),
      });
    }
  );

  return localTransaction;
}

// 3. Mengantrekan penghapusan transaksi
export async function queueLocalDelete(userId, transactionId) {
  await localDb.transaction(
    "rw",
    localDb.transactions,
    localDb.syncQueue,
    async () => {
      await localDb.transactions.delete(transactionId);

      await localDb.syncQueue.add({
        userId,
        transactionId,
        operation: "delete",
        createdAt: Date.now(),
      });
    }
  );
}

// 4. Mengirim antrean ke Supabase
export async function syncPendingTransactions(userId) {
  if (!userId) {
    return {
      synced: 0,
      error: new Error("Pengguna belum login."),
    };
  }

  if (typeof navigator === "undefined" || !navigator.onLine) {
    return {
      synced: 0,
      offline: true,
    };
  }

  const jobs = await localDb.syncQueue
    .where("userId")
    .equals(userId)
    .sortBy("queueId");

  let synced = 0;

  for (const job of jobs) {
    let error = null;

    if (job.operation === "upsert") {
      const result = await supabase
        .from("transactions")
        .upsert(job.payload, {
          onConflict: "id",
        });

      error = result.error;
    } else if (job.operation === "delete") {
      const result = await supabase
        .from("transactions")
        .delete()
        .eq("id", job.transactionId);

      error = result.error;
    } else {
      return {
        synced,
        error: new Error("Operasi sinkronisasi tidak dikenal."),
      };
    }

    // Hentikan proses jika server mengembalikan error.
    // Antrean tetap disimpan agar bisa dicoba kembali.
    if (error) {
      return {
        synced,
        error,
      };
    }

    // Hapus pekerjaan dari antrean setelah berhasil
    await localDb.syncQueue.delete(job.queueId);

    if (job.operation === "upsert") {
      const remainingJobs = await localDb.syncQueue
        .where("transactionId")
        .equals(job.transactionId)
        .filter((item) => item.userId === userId)
        .count();

      if (remainingJobs === 0) {
        const localTransaction = await localDb.transactions.get(
          job.transactionId
        );

        if (localTransaction) {
          await localDb.transactions.put({
            ...localTransaction,
            syncStatus: "synced",
          });
        }
      }
    } else {
      await localDb.transactions.delete(job.transactionId);
    }

    synced++;
  }

  return {
    synced,
    error: null,
  };
}

// 5. Mengganti cache lokal dengan data server
// Panggil hanya setelah antrean berhasil disinkronkan.
export async function replaceLocalTransactionsFromServer(
  userId,
  serverTransactions
) {
  await localDb.transaction(
    "rw",
    localDb.transactions,
    async () => {
      await localDb.transactions
        .where("userId")
        .equals(userId)
        .delete();

      const localRows = serverTransactions.map((item) => ({
        ...item,
        userId,
        syncStatus: "synced",
      }));

      if (localRows.length > 0) {
        await localDb.transactions.bulkPut(localRows);
      }
    }
  );

  return serverTransactions;
}