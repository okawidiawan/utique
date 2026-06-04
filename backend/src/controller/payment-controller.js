import paymentService from "../services/payment-service.js";
import { ResponseError } from "../error/response-error.js";

// ==========================================
// Payment Controller — Handler untuk request HTTP domain Payment (Customer)
// Menghubungkan Router dengan Service layer.
// ==========================================

/**
 * Menangani request upload bukti pembayaran oleh customer
 * @param {Object} req - Express Request Object
 * @param {Object} res - Express Response Object
 * @param {Function} next - Express Next Middleware Function
 */
const upload = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) {
      throw new ResponseError(400, "ID order tidak valid.");
    }
    const file = req.file; // Tersedia setelah melewati middleware uploadPaymentProof
    
    const result = await paymentService.uploadProof(userId, orderId, file);
    
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default {
  upload,
};
