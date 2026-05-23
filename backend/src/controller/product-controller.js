import productService from "../services/product-service.js";

// ==========================================
// Product Controller — Handler untuk request HTTP domain Product (Admin)
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request penambahan produk baru
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const create = async (req, res, next) => {
  try {
    const result = await productService.create(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request pembaruan data produk
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const update = async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const result = await productService.update(productId, req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request penghapusan produk
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const remove = async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const result = await productService.remove(productId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default { create, update, remove };
