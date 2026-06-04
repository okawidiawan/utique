import userService from "../services/user-service.js";
import { ResponseError } from "../error/response-error.js";

// ==========================================
// User Controller — Handler untuk request HTTP domain User
// Menghubungkan Router dengan Service layer.
// ==========================================

const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body);
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
    const result = await userService.get(userId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const update = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await userService.update(userId, req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await userService.logout(userId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const createAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await userService.createAddress(userId, req.body);
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const listAddresses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await userService.listAddresses(userId);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id, 10);
    if (isNaN(addressId)) {
      throw new ResponseError(400, "ID alamat tidak valid.");
    }
    const result = await userService.updateAddress(userId, addressId, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id, 10);
    if (isNaN(addressId)) {
      throw new ResponseError(400, "ID alamat tidak valid.");
    }
    const result = await userService.deleteAddress(userId, addressId);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

export default {
  register,
  login,
  get,
  update,
  logout,
  createAddress,
  listAddresses,
  updateAddress,
  deleteAddress,
};
