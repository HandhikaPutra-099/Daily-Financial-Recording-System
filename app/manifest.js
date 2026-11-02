
export default function manifest() {
  return {
    name: "DuetKu",
    short_name: "DuetKu",
    description: "Keuangan pribadi, lebih terarah.",

    start_url: "/",
    scope: "/",
    display: "standalone",

    background_color: "#0b0d10",
    theme_color: "#0b0d10",

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
