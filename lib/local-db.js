
import Dexie from "dexie";

// Membuat database lokal Daily Finance
export const localDb = new Dexie("DailyFinanceLocal");

// Mendefinisikan tabel dan indeks
localDb.version(1).stores({

  // Menyimpan transaksi di perangkat
  transactions: "id, userId, date, syncStatus, [userId+date]",

  // Menyimpan antrean perubahan yang belum disinkronkan
  syncQueue: "++queueId, userId, transactionId, operation, createdAt, [userId+createdAt]",

});
