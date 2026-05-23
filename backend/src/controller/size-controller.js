import sizeService from "../services/size-service.js";

// ==========================================
// Size Controller — Handler untuk request HTTP domain Size
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request penambahan ukuran baru
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const create = async (req, res, next) => {
  try {
    const result = await sizeService.create(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request pengambilan daftar ukuran
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const list = async (req, res, next) => {
  try {
    const result = await sizeService.list();
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default { create, list };
