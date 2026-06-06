import addressService from "../services/address-service.js";
import { ResponseError } from "../error/response-error.js";

/**
 * Address Controller — Handler untuk request HTTP domain Address
 */

const create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await addressService.create(userId, req.body);
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const list = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await addressService.list(userId);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const update = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id, 10);
    if (isNaN(addressId)) {
      throw new ResponseError(400, "ID alamat tidak valid.");
    }
    const result = await addressService.update(userId, addressId, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const remove = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id, 10);
    if (isNaN(addressId)) {
      throw new ResponseError(400, "ID alamat tidak valid.");
    }
    const result = await addressService.remove(userId, addressId);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

export default {
  create,
  list,
  update,
  remove,
};
