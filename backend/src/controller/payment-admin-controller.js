import paymentAdminService from "../services/payment-admin-service.js";

// ==========================================
// Payment Admin Controller — Handler untuk request HTTP domain Payment (Admin)
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request verifikasi pembayaran oleh admin
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const verify = async (req, res, next) => {
  try {
    const paymentId = Number(req.params.id);
    const result = await paymentAdminService.verify(paymentId, req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Menangani request penolakan pembayaran oleh admin
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const reject = async (req, res, next) => {
  try {
    const paymentId = Number(req.params.id);
    const result = await paymentAdminService.reject(paymentId, req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default {
  verify,
  reject,
};
