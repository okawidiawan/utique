import productService from "../services/product-service.js";

// ==========================================
// Product Controller — Handler untuk request HTTP domain Product (Public)
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request pencarian/katalog produk publik
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const search = async (req, res, next) => {
  try {
    const request = {
      name: req.query.name,
      page: req.query.page,
      size: req.query.size,
    };
    const result = await productService.search(request);
    res.status(200).json({
      data: result.data,
      paging: result.paging,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request detail produk berdasarkan slug publik
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const getBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const result = await productService.getBySlug(slug);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default { search, getBySlug };
