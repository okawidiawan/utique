import variantService from "../services/variant-service.js";

// ==========================================
// Variant Controller — Handler untuk request HTTP domain ProductVariant (Admin)
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request penambahan varian baru ke produk
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const create = async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const result = await variantService.create(productId, req.body);
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request pembaruan data varian produk
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const update = async (req, res, next) => {
  try {
    const variantId = Number(req.params.id);
    const result = await variantService.update(variantId, req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request penghapusan varian produk
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const remove = async (req, res, next) => {
  try {
    const variantId = Number(req.params.id);
    const result = await variantService.remove(variantId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default { create, update, remove };
