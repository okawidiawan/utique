import cartService from "../services/cart-service.js";

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

export default {
  get,
};
