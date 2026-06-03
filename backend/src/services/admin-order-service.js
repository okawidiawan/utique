import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import {
  getAdminOrdersValidation,
  updateOrderEstimationValidation,
  updateOrderShippingValidation,
  updateOrderStatusValidation,
} from "../validation/admin-order-validation.js";

// ==========================================
// Admin Order Service — Logika bisnis untuk manajemen order oleh admin
// Menangani pengambilan data, update status, resi, dan estimasi.
// ==========================================

/**
 * Mengambil semua order dengan filter status dan paginasi (Admin).
 * @param {Object} query - Query params (status, page, size)
 * @returns {Promise<Object>} - Data order dan paging
 */
const getAllOrders = async (query) => {
  const filter = getAdminOrdersValidation.parse(query);

  const skip = (filter.page - 1) * filter.size;

  const where = {};
  if (filter.status) {
    where.status = filter.status;
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: filter.size,
      skip: skip,
    }),
    prisma.order.count({
      where,
    }),
  ]);

  return {
    data: orders.map((order) => ({
      id: order.id,
      status: order.status,
      total_price: order.totalPrice,
      shipping_courier: order.shippingCourier,
      created_at: order.createdAt,
      payment_deadline: order.paymentDeadline,
      user: order.user,
    })),
    paging: {
      page: filter.page,
      total_item: total,
      total_page: Math.ceil(total / filter.size),
    },
  };
};

/**
 * Mengambil detail satu order (Admin).
 * @param {string|number} id - ID order
 * @returns {Promise<Object>} - Detail order
 */
const getOrderById = async (id) => {
  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    throw new ResponseError(400, "ID order tidak valid");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      address: true,
      items: true,
      payment: true,
    },
  });

  if (!order) {
    throw new ResponseError(404, "Order tidak ditemukan");
  }

  return {
    id: order.id,
    status: order.status,
    total_price: order.totalPrice,
    shipping_courier: order.shippingCourier,
    shipping_tracking_number: order.trackingNumber,
    estimated_completion_date: order.estimatedCompletion
      ? order.estimatedCompletion.toISOString().split("T")[0]
      : null,
    notes: null, // Sesuai contoh di issue.md
    created_at: order.createdAt,
    payment_deadline: order.paymentDeadline,
    user: order.user,
    address: {
      label: order.address.label,
      recipient_name: order.address.recipientName,
      phone: order.address.phone,
      province: order.address.province,
      city: order.address.city,
      district: order.address.district,
      postal_code: order.address.postalCode,
      full_address: order.address.fullAddress,
    },
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product_name: item.productName,
      flavor_name: item.flavorName,
      size_name: item.sizeName,
    })),
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          proof_image_url: order.payment.proofImageUrl,
          verified_at: order.payment.verifiedAt,
          notes: order.payment.adminNotes,
        }
      : null,
  };
};

/**
 * Mengubah status order secara manual (Admin).
 * @param {string|number} id - ID order
 * @param {Object} body - Request body (status)
 * @returns {Promise<Object>} - Hasil update
 */
const updateOrderStatus = async (id, body) => {
  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    throw new ResponseError(400, "ID order tidak valid");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new ResponseError(404, "Order tidak ditemukan");
  }

  const updateRequest = updateOrderStatusValidation.parse(body);

  const validTransitions = {
    PAID: "IN_QUEUE",
    IN_QUEUE: "IN_PRODUCTION",
    IN_PRODUCTION: "DONE",
    DONE: "SHIPPED",
    SHIPPED: "COMPLETED",
  };

  if (validTransitions[order.status] !== updateRequest.status) {
    throw new ResponseError(400, "Transisi status tidak valid");
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: updateRequest.status,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedOrder.id,
    status: updatedOrder.status,
    updated_at: updatedOrder.updatedAt,
  };
};

/**
 * Menginput nomor resi dan kurir (Admin).
 * @param {string|number} id - ID order
 * @param {Object} body - Request body (shipping_tracking_number, shipping_courier)
 * @returns {Promise<Object>} - Hasil update
 */
const updateOrderShipping = async (id, body) => {
  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    throw new ResponseError(400, "ID order tidak valid");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new ResponseError(404, "Order tidak ditemukan");
  }

  const updateRequest = updateOrderShippingValidation.parse(body);

  if (order.status !== "DONE" && order.status !== "SHIPPED") {
    throw new ResponseError(400, "Resi hanya bisa diinput pada status DONE atau SHIPPED");
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: updateRequest.shipping_tracking_number,
      shippingCourier: updateRequest.shipping_courier,
    },
    select: {
      id: true,
      trackingNumber: true,
      shippingCourier: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedOrder.id,
    shipping_tracking_number: updatedOrder.trackingNumber,
    shipping_courier: updatedOrder.shippingCourier,
    updated_at: updatedOrder.updatedAt,
  };
};

/**
 * Meng-override estimasi tanggal selesai produksi (Admin).
 * @param {string|number} id - ID order
 * @param {Object} body - Request body (estimated_completion_date)
 * @returns {Promise<Object>} - Hasil update
 */
const updateOrderEstimation = async (id, body) => {
  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    throw new ResponseError(400, "ID order tidak valid");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new ResponseError(404, "Order tidak ditemukan");
  }

  const updateRequest = updateOrderEstimationValidation.parse(body);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(updateRequest.estimated_completion_date);
  if (inputDate < today) {
    throw new ResponseError(400, "Estimasi tidak boleh di masa lalu");
  }

  if (order.status !== "IN_QUEUE" && order.status !== "IN_PRODUCTION") {
    throw new ResponseError(400, "Estimasi hanya bisa diubah pada status IN_QUEUE atau IN_PRODUCTION");
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      estimatedCompletion: inputDate,
    },
    select: {
      id: true,
      estimatedCompletion: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedOrder.id,
    estimated_completion_date: updatedOrder.estimatedCompletion.toISOString().split("T")[0],
    updated_at: updatedOrder.updatedAt,
  };
};

export default {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderShipping,
  updateOrderEstimation,
};
