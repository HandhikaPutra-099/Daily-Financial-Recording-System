export function formatUserFacingError(error, fallback) {
  const detail = typeof error === "string" ? error : error?.message;
  if (!detail) return fallback;

  const normalized = detail.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("fetch failed")
  ) {
    return "Koneksi sedang bermasalah. Coba lagi sebentar.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Email atau kata sandi belum cocok. Coba periksa lagi.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Emailmu belum diverifikasi. Cek kotak masuk untuk melanjutkan.";
  }
  if (normalized.includes("user already registered")) {
    return "Email ini sudah terdaftar. Coba masuk, ya.";
  }
  if (normalized.includes("invalid email")) {
    return "Format emailnya belum benar. Coba periksa lagi.";
  }

  return `${fallback} Detail: ${detail}`;
}
