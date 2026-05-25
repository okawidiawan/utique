import productAdminService from "../services/product-admin-service.js";

// ==========================================
// Product Admin Controller — Handler untuk request HTTP domain Product & Variant (Admin)
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
    const result = await productAdminService.create(req.body);
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
    const result = await productAdminService.update(productId, req.body);
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
    const result = await productAdminService.remove(productId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request penambahan varian baru ke produk
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const createVariant = async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const result = await productAdminService.createVariant(productId, req.body);
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
const updateVariant = async (req, res, next) => {
  try {
    const variantId = Number(req.params.id);
    const result = await productAdminService.updateVariant(variantId, req.body);
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
const removeVariant = async (req, res, next) => {
  try {
    const variantId = Number(req.params.id);
    const result = await productAdminService.removeVariant(variantId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default {
  create,
  update,
  remove,
  createVariant,
  updateVariant,
  removeVariant,
};
