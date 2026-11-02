
export default function manifest() {
  return {
    name: "Daily Finance - Pencatatan Keuangan",
    short_name: "Daily Finance",
    description:
      "Aplikasi pencatatan pemasukan dan pengeluaran harian.",

    start_url: "/",
    scope: "/",
    display: "standalone",

    background_color: "#f1f5f9",
    theme_color: "#2456b5",

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
