import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { ResponseError } from "../error/response-error.js";

// ==========================================
// Upload Middleware — Konfigurasi Multer & Cloudinary
// Digunakan untuk menangani upload file ke Cloudinary.
// ==========================================

// Konfigurasi Cloudinary dari environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Konfigurasi storage (gunakan memory storage untuk testing, Cloudinary untuk production/dev)
const storage =
  process.env.NODE_ENV === "test"
    ? multer.memoryStorage()
    : new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
          folder: "utique/payments",
          allowed_formats: ["jpg", "png", "jpeg", "webp"],
        },
      });

// Middleware Multer untuk upload bukti pembayaran
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Batas 2MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/webp") {
      cb(null, true);
    } else {
      // Lempar error jika format file tidak sesuai
      cb(new ResponseError(400, "File harus berupa gambar (jpg, png, webp)."), false);
    }
  },
}).single("proof_image");

/**
 * Middleware wrapper untuk menangani error dari Multer
 */
export const uploadPaymentProof = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ResponseError(400, "Ukuran file maksimal 2MB."));
      }
      return next(new ResponseError(400, err.message));
    } else if (err) {
      // Error dari fileFilter atau error lainnya
      return next(err);
    }

    // Jika sedang dalam test dan upload berhasil, simpan path palsu agar service tidak error
    if (process.env.NODE_ENV === "test" && req.file) {
      req.file.path = "https://res.cloudinary.com/mock/image.jpg";
    }

    next();
  });
};
