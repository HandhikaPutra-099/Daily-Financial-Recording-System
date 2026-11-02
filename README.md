# DuetKu — Daily Financial Recording System

**Aplikasi pencatatan keuangan pribadi untuk membantu mengelola pemasukan, pengeluaran, dan anggaran secara lebih terstruktur.**

## 1. Tentang DuetKu

DuetKu merupakan aplikasi pencatatan keuangan pribadi berbasis web yang dirancang untuk membantu pengguna mengelola aktivitas keuangan sehari-hari dalam satu platform.

Melalui DuetKu, pengguna dapat mencatat transaksi, mengelompokkan pemasukan dan pengeluaran berdasarkan kategori, memantau anggaran, serta melihat ringkasan kondisi keuangan berdasarkan periode tertentu.

Aplikasi ini dikembangkan menggunakan teknologi web modern dengan pendekatan *Progressive Web App* (PWA). Selain mengutamakan kemudahan penggunaan, DuetKu juga dikembangkan dengan dukungan penyimpanan data lokal agar pencatatan keuangan dapat lebih fleksibel ketika koneksi internet tidak tersedia.

**Tagline:** *Understand Your Money, Manage Your Future.*

## 2. Fitur Aplikasi

DuetKu dikembangkan dengan sejumlah fitur untuk mendukung pengelolaan keuangan pribadi.

| Fitur | Deskripsi |
|---|---|
| Dashboard Keuangan | Menampilkan ringkasan saldo, total pemasukan, dan total pengeluaran. |
| Manajemen Transaksi | Mencatat, melihat, mengubah, dan menghapus transaksi keuangan. |
| Kategori Transaksi | Mengelompokkan transaksi berdasarkan jenis dan kategori. |
| Laporan Keuangan | Menampilkan ringkasan pemasukan dan pengeluaran berdasarkan periode serta kategori. |
| Manajemen Anggaran | Mengatur batas pengeluaran bulanan berdasarkan kategori. |
| Pencarian dan Filter | Mempermudah pencarian transaksi berdasarkan kata kunci, jenis, kategori, dan periode. |
| Ekspor Laporan | Menyediakan ekspor data laporan dalam format CSV. |
| Autentikasi Pengguna | Mendukung pendaftaran dan login menggunakan akun pengguna. |
| Penyimpanan Lokal | Memanfaatkan IndexedDB untuk menyimpan data pada perangkat. |
| Sinkronisasi Data | Menyediakan mekanisme antrean perubahan data untuk diproses kembali ketika koneksi tersedia. |
| Progressive Web App | Mendukung instalasi aplikasi melalui browser dan penggunaan fitur PWA pada perangkat kompatibel. |

*Catatan: Ketersediaan dan keandalan setiap fitur, terutama fitur offline dan sinkronisasi, tetap memerlukan pengujian pada lingkungan penggunaan sebenarnya.*

## 3. Teknologi yang Digunakan

DuetKu memanfaatkan beberapa teknologi untuk membangun aplikasi, mengelola data, dan menyediakan pengalaman penggunaan yang responsif.

| Teknologi | Peran dalam Aplikasi |
|---|---|
| Next.js | Framework utama untuk pengembangan aplikasi web. |
| React | Membangun antarmuka pengguna berbasis komponen. |
| Tailwind CSS | Mengatur tampilan dan desain responsif. |
| JavaScript | Mengembangkan logika dan interaksi aplikasi. |
| Supabase | Menyediakan layanan autentikasi dan akses database. |
| PostgreSQL | Mengelola penyimpanan data utama. |
| Dexie.js | Mempermudah pengelolaan database lokal berbasis IndexedDB. |
| Serwist | Mendukung implementasi Service Worker dan fitur PWA. |

## 4. Struktur Direktori

Berikut gambaran struktur utama proyek DuetKu:

```text
daily-financial-recording/
│
├── app/
│   ├── components/       # Komponen antarmuka yang dapat digunakan kembali
│   ├── budgets/          # Halaman pengelolaan anggaran
│   ├── categories/       # Halaman pengelolaan kategori
│   ├── reports/          # Halaman laporan keuangan
│   ├── offline/          # Halaman fallback ketika offline
│   ├── serwist/          # Route Service Worker
│   ├── page.js            # Dashboard utama
│   ├── layout.js          # Layout utama aplikasi
│   ├── globals.css        # Global styling
│   ├── manifest.js        # Konfigurasi PWA
│   └── sw.js              # Service Worker
│
├── lib/
│   ├── supabase.js        # Konfigurasi Supabase
│   ├── local-db.js        # Pengelolaan database lokal
│   ├── offline-sync.js    # Logika sinkronisasi data
│   └── user-facing-error.js
│
├── public/                # Ikon, logo, dan aset statis
│
├── .env.example           # Contoh konfigurasi environment
├── .gitignore
├── package.json
├── next.config.mjs
└── README.md
```

## 5. Persyaratan Sistem

Sebelum menjalankan aplikasi, pastikan perangkat telah memiliki:

- **Node.js** untuk menjalankan lingkungan JavaScript.
- **npm** untuk mengelola dependensi proyek.
- **Git** untuk mengambil dan mengelola kode sumber.
- **Akun Supabase** untuk menyediakan layanan autentikasi dan database.
- **Browser modern** untuk mengakses aplikasi.

## 6. Instalasi dan Konfigurasi

Ikuti langkah-langkah berikut untuk menjalankan DuetKu di lingkungan lokal.

### A. Clone Repository

Unduh kode sumber dari repository GitHub:

```bash
git clone https://github.com/HandhikaPutra-099/Daily-Financial-Recording-System.git
```

Masuk ke direktori aplikasi:

```bash
cd Daily-Financial-Recording-System/daily-financial-recording
```

### B. Instal Dependensi

Jalankan perintah berikut untuk memasang seluruh dependensi yang dibutuhkan:

```bash
npm install
```

### C. Konfigurasi Environment Variable

Buat file bernama `.env.local` pada direktori utama aplikasi.

Gunakan `.env.example` sebagai referensi, kemudian isi dengan konfigurasi proyek Supabase milikmu:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Ganti nilai placeholder dengan informasi koneksi yang sesuai dari dashboard Supabase.

**Penting:** Jangan mengunggah file `.env.local` ke repository publik. File tersebut berisi konfigurasi khusus untuk lingkungan lokal.

### D. Konfigurasi Database Supabase

DuetKu menggunakan Supabase sebagai layanan autentikasi dan database utama.

Database aplikasi menggunakan tabel berikut:

| Tabel | Fungsi |
|---|---|
| `transactions` | Menyimpan data pemasukan dan pengeluaran. |
| `categories` | Menyimpan kategori transaksi pengguna. |
| `budgets` | Menyimpan pengaturan anggaran bulanan. |

Pastikan struktur tabel, kebijakan *Row Level Security* (RLS), dan konfigurasi autentikasi telah disiapkan sesuai kebutuhan aplikasi.

### E. Jalankan Aplikasi

Untuk menjalankan aplikasi dalam mode pengembangan:

```bash
npm run dev
```

Setelah server berjalan, buka alamat berikut melalui browser:

```text
http://localhost:3000
```

## 7. Menjalankan Production Build

Next.js menyediakan proses build untuk menyiapkan aplikasi dalam lingkungan produksi.

Jalankan perintah:

```bash
npm run build
```

Setelah proses build berhasil, jalankan aplikasi menggunakan:

```bash
npm run start
```

Perintah tersebut menjalankan aplikasi berdasarkan hasil build yang telah dibuat.

## 8. Progressive Web App dan Dukungan Offline

DuetKu menggunakan pendekatan *Progressive Web App* (PWA) untuk menghadirkan pengalaman penggunaan yang lebih fleksibel pada berbagai perangkat.

Beberapa teknologi yang mendukung pendekatan tersebut meliputi:

- **Web App Manifest:** Menyediakan informasi aplikasi, seperti nama, ikon, dan warna tema, agar aplikasi dapat dipasang melalui browser yang kompatibel.
- **Service Worker:** Mengelola caching aset serta menyediakan mekanisme fallback ketika halaman tidak dapat diakses melalui jaringan.
- **IndexedDB:** Menyediakan penyimpanan data lokal pada browser dengan bantuan Dexie.js.
- **Offline Synchronization:** Mengelola antrean perubahan data lokal untuk disinkronkan kembali ketika koneksi internet tersedia.

Penting untuk dipahami bahwa akses offline dan sinkronisasi data bergantung pada ketersediaan data lokal, konfigurasi Service Worker, serta keberhasilan proses sinkronisasi ke database utama.

## 9. Keamanan dan Pengelolaan Data

Keamanan data merupakan salah satu aspek yang diperhatikan dalam pengembangan DuetKu.

Aplikasi menggunakan beberapa pendekatan berikut:

- **Supabase Authentication:** Mengelola proses registrasi dan autentikasi pengguna.
- **Row Level Security (RLS):** Membatasi akses data berdasarkan identitas pengguna yang telah terautentikasi.
- **Environment Variables:** Memisahkan konfigurasi koneksi dari kode sumber aplikasi.
- **Local Storage Management:** Menggunakan IndexedDB untuk mendukung penyimpanan data pada perangkat.

Konfigurasi RLS perlu diterapkan dan dipastikan aktif pada tabel yang menyimpan data pengguna. Kredensial rahasia, seperti Secret Key dan password database, tidak boleh disimpan dalam kode frontend maupun repository publik.

## 10. Status Pengembangan

DuetKu dikembangkan secara bertahap melalui beberapa milestone agar setiap bagian aplikasi dapat disempurnakan secara terstruktur.

| Milestone | Fokus Pengembangan |
|---|---|
| Milestone 1 | Penyempurnaan antarmuka, dashboard, komponen UI, dan fondasi desain aplikasi. |
| Milestone 2 | Penyempurnaan halaman kategori, laporan, anggaran, dan fitur offline. |
| Tahap Selanjutnya | Pengujian fungsional, peningkatan pengalaman pengguna, dan pengembangan fitur lanjutan. |

Status milestone menunjukkan tahapan pengerjaan, bukan jaminan bahwa seluruh fitur telah melewati pengujian produksi.

## 11. Pengembangan Selanjutnya

Pengembangan DuetKu diarahkan untuk meningkatkan kualitas pengelolaan keuangan pribadi melalui antarmuka yang mudah dipahami, pengelolaan data yang terstruktur, dan pengalaman penggunaan yang konsisten.

Penyempurnaan akan difokuskan pada stabilitas aplikasi, keamanan data, keandalan sinkronisasi, serta peningkatan fungsionalitas berdasarkan kebutuhan pengguna.

---

## Informasi Proyek

**Nama Proyek:** DuetKu — Daily Financial Recording System

**Kategori:** Personal Finance Management Application

**Platform:** Web Application / Progressive Web App

**Repository:** [GitHub — Daily Financial Recording System](https://github.com/HandhikaPutra-099/Daily-Financial-Recording-System)

**Pengembang:** [Handhika Putra Wijaya Kesuma](https://github.com/HandhikaPutra-099)

---

<p align="center">

**DuetKu**

*Understand Your Money, Manage Your Future.*

</p>
