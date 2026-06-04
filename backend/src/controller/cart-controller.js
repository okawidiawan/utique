import cartService from "../services/cart-service.js";
import { ResponseError } from "../error/response-error.js";

/**
 * Cart Controller — Handler untuk request HTTP domain Cart.
 * Menghubungkan Router dengan Service layer.
 */

const get = async (req, res, next) => {
  try {
    // Ambil userId dari user yang terautentikasi (diset oleh auth-middleware)
    const userId = req.user.id;
    
    // Panggil service untuk mengambil data keranjang
    const result = await cartService.get(userId);

    // Kirim response sukses
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    // Teruskan error ke error-middleware
    next(e);
  }
};

/**
 * Handler untuk menambahkan item ke keranjang.
 */
const addItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const request = req.body;
    
    const result = await cartService.addItem(userId, request);

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Handler untuk memperbarui item di keranjang.
 */
const updateItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cartItemId = parseInt(req.params.id, 10);
    if (isNaN(cartItemId)) {
      throw new ResponseError(400, "ID item keranjang tidak valid.");
    }
    const request = req.body;

    const result = await cartService.updateItem(userId, cartItemId, request);

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Handler untuk menghapus item dari keranjang.
 */
const removeItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cartItemId = parseInt(req.params.id, 10);
    if (isNaN(cartItemId)) {
      throw new ResponseError(400, "ID item keranjang tidak valid.");
    }

    const result = await cartService.removeItem(userId, cartItemId);

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default {
  get,
  addItem,
  updateItem,
  removeItem,
};
