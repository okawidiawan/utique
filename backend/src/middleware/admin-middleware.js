// ==========================================
// Admin Middleware — Memverifikasi bahwa user memiliki role ADMIN
// Harus digunakan SETELAH authMiddleware agar req.user sudah tersedia.
// Digunakan pada adminRouter untuk melindungi endpoint admin.
// ==========================================
export const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Akses ditolak. Silakan login terlebih dahulu." });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Akses ditolak. Anda tidak memiliki izin admin." });
  }

  next();
};
