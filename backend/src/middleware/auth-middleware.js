import { prisma } from "../application/database.js";

// ==========================================
// Auth Middleware — Memvalidasi token Bearer dari header Authorization
// Jika valid, data user disimpan di req.user untuk digunakan di controller/service.
// Digunakan pada apiRouter untuk melindungi endpoint customer.
// ==========================================
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");

    // Cek apakah header Authorization ada dan format Bearer
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Akses ditolak. Token tidak ditemukan." });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Akses ditolak. Token tidak valid." });
    }

    // Cari user berdasarkan token di database
    const user = await prisma.user.findFirst({
      where: { token },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenExpiredAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Akses ditolak. Token tidak valid." });
    }

    // Cek apakah token sudah expired
    if (user.tokenExpiredAt && user.tokenExpiredAt < new Date()) {
      // Hapus token yang sudah expired dari database (optional tapi disarankan)
      await prisma.user.update({
        where: { id: user.id },
        data: { token: null, tokenExpiredAt: null },
      });
      return res.status(401).json({ error: "Akses ditolak. Token sudah expired." });
    }

    // Simpan data user di request untuk digunakan di handler selanjutnya
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
};
