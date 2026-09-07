// Products service: catalog reads and admin-only writes.
const prisma = require("../db");

// Build a filtered query. Each spread (...) only adds its condition when the
// matching query param is present, so filters combine flexibly (all optional).
async function list({ category, maxPrice, search } = {}) {
  return prisma.product.findMany({
    where: {
      ...(category && { category: { name: category } }),        // filter by related category name
      ...(maxPrice && { price: { lte: Number(maxPrice) } }),    // price <= maxPrice
      ...(search && { name: { contains: search, mode: "insensitive" } }), // case-insensitive name search
    },
    include: { category: true },
    orderBy: { id: "asc" },
  });
}

async function getById(id) {
  return prisma.product.findUnique({ where: { id }, include: { category: true } });
}

async function create({ name, price, stock, categoryId }) {
  if (!name) throw new Error("name is required");
  if (typeof price !== "number" || price <= 0) throw new Error("price must be a positive number");
  if (!categoryId) throw new Error("categoryId is required");
  return prisma.product.create({ data: { name, price, stock: stock ?? 0, categoryId } });
}

// Partial update: only the fields that were actually sent get changed
// (see the conditional spreads in `data` below). Returns null if not found.
async function update(id, { name, price, stock, categoryId }) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return null;
  if (price !== undefined && (typeof price !== "number" || price <= 0)) {
    throw new Error("price must be a positive number");
  }
  return prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(stock !== undefined && { stock }),
      ...(categoryId !== undefined && { categoryId }),
    },
  });
}

async function remove(id) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return false;
  await prisma.product.delete({ where: { id } });
  return true;
}

module.exports = { list, getById, create, update, remove };
