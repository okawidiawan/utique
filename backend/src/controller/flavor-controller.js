import flavorService from "../services/flavor-service.js";

// ==========================================
// Flavor Controller — Handler untuk request HTTP domain Flavor
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request penambahan flavor baru
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const create = async (req, res, next) => {
  try {
    const result = await flavorService.create(req.body);
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
const list = async (req, res, next) => {
  try {
    const result = await flavorService.list();
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default { create, list };
