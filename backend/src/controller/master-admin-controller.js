import masterAdminService from "../services/master-admin-service.js";

// ==========================================
// Master Admin Controller — Handler untuk request HTTP domain Flavor & Size (Admin)
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request penambahan flavor baru
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const createFlavor = async (req, res, next) => {
  try {
    const result = await masterAdminService.createFlavor(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request pengambilan daftar flavor
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const listFlavor = async (req, res, next) => {
  try {
    const result = await masterAdminService.listFlavor();
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request penambahan ukuran baru
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const createSize = async (req, res, next) => {
  try {
    const result = await masterAdminService.createSize(req.body);
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
const listSize = async (req, res, next) => {
  try {
    const result = await masterAdminService.listSize();
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default { createFlavor, listFlavor, createSize, listSize };
