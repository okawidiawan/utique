import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import {
  searchProductValidation,
  getProductBySlugValidation,
} from "../validation/product-public-validation.js";

/**
 * Mencari produk cookies dengan paginasi dan filter nama (Public)
 * @param {Object} request - Query request berisi page, size, dan name
 * @returns {Object} - List data produk beserta data paginasi
 */
const search = async (request) => {
  // 1. Validasi request body/query menggunakan Zod
  const searchRequest = searchProductValidation.parse(request);

  // 2. Tentukan pagination variables
  const skip = (searchRequest.page - 1) * searchRequest.size;
  const take = searchRequest.size;

  // 3. Susun filter query (hanya produk yang available)
  const filters = [];
  
  // Hanya menampilkan produk yang isAvailable = true untuk publik
  filters.push({ isAvailable: true });

  if (searchRequest.name) {
    filters.push({
      name: {
        contains: searchRequest.name,
        mode: "insensitive",
      },
    });
  }

  // 4. Lakukan query data & total item secara paralel
  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where: {
        AND: filters,
      },
      skip,
      take,
      orderBy: {
        id: "desc", // Default sorting produk terbaru di atas
      },
      include: {
        variants: {
          where: {
            isAvailable: true,
          },
          include: {
            flavor: true,
            size: true,
          },
        },
      },
    }),
    prisma.product.count({
      where: {
        AND: filters,
      },
    }),
  ]);

  // 5. Hitung total halaman
  const totalPages = Math.ceil(totalItems / searchRequest.size);

  return {
    data: products,
    paging: {
      page: searchRequest.page,
      total_item: totalItems,
      total_page: totalPages,
    },
  };
};

/**
 * Mengambil detail produk beserta varian dan review berdasarkan slug (Public)
 * @param {String} productSlug - Slug produk
 * @returns {Object} - Detail produk lengkap
 */
const getBySlug = async (productSlug) => {
  // 1. Validasi parameter slug
  const slug = getProductBySlugValidation.parse(productSlug);

  // 2. Ambil data produk beserta relasi variant & reviews
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isAvailable: true, // Publik hanya boleh mengakses produk yang aktif/tersedia
    },
    include: {
      variants: {
        where: {
          isAvailable: true,
        },
        include: {
          flavor: true,
          size: true,
        },
      },
      reviews: {
        include: {
          user: {
            select: {
              name: true, // Ambil nama user saja untuk review
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  // 3. Jika produk tidak ditemukan atau tidak tersedia
  if (!product) {
    throw new ResponseError(404, "Produk tidak ditemukan.");
  }

  return product;
};

export default { search, getBySlug };
