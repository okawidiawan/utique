import orderService from "../services/order-service.js";
import { ResponseError } from "../error/response-error.js";

/**
 * Controller untuk menangani request terkait Order (sisi Customer).
 */

const create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const request = req.body;
    const result = await orderService.create(userId, request);
    res.status(201).json({
      data: result,
    });

  } catch (e) {
    next(e);
  }
};

const list = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await orderService.list(userId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const get = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new ResponseError(400, "ID order tidak valid.");
    }
    const result = await orderService.get(userId, orderId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default {
  create,
  list,
  get,
};
