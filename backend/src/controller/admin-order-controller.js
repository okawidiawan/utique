import adminOrderService from "../services/admin-order-service.js";

// ==========================================
// Admin Order Controller — Handler request HTTP untuk manajemen order oleh admin
// Menghubungkan Router dengan Service.
// ==========================================

/**
 * Handler untuk GET /api/admin/orders
 * Mengambil semua order dengan filter dan paginasi.
 */
const getAll = async (req, res, next) => {
  try {
    const result = await adminOrderService.getAllOrders(req.query);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * Handler untuk GET /api/admin/orders/:id
 * Mengambil detail satu order.
 */
const getById = async (req, res, next) => {
  try {
    const result = await adminOrderService.getOrderById(req.params.id);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

/**
 * Handler untuk PATCH /api/admin/orders/:id/status
 * Mengubah status order.
 */
const updateStatus = async (req, res, next) => {
  try {
    const result = await adminOrderService.updateOrderStatus(req.params.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

/**
 * Handler untuk PATCH /api/admin/orders/:id/shipping
 * Input nomor resi & kurir.
 */
const updateShipping = async (req, res, next) => {
  try {
    const result = await adminOrderService.updateOrderShipping(req.params.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

/**
 * Handler untuk PATCH /api/admin/orders/:id/estimation
 * Override estimasi tanggal selesai.
 */
const updateEstimation = async (req, res, next) => {
  try {
    const result = await adminOrderService.updateOrderEstimation(req.params.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

export default {
  getAll,
  getById,
  updateStatus,
  updateShipping,
  updateEstimation,
};
