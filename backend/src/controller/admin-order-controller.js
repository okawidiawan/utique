import adminOrderService from "../services/admin-order-service.js";
import { ResponseError } from "../error/response-error.js";

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
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new ResponseError(400, "ID order tidak valid.");
    }
    const result = await adminOrderService.getOrderById(orderId);
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
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new ResponseError(400, "ID order tidak valid.");
    }
    const result = await adminOrderService.updateOrderStatus(orderId, req.body);
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
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new ResponseError(400, "ID order tidak valid.");
    }
    const result = await adminOrderService.updateOrderShipping(orderId, req.body);
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
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new ResponseError(400, "ID order tidak valid.");
    }
    const result = await adminOrderService.updateOrderEstimation(orderId, req.body);
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
