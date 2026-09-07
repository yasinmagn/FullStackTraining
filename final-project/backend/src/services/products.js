const prisma = require("../db");

async function list({ category, maxPrice, search } = {}) {
  return prisma.product.findMany({
    where: {
      ...(category && { category: { name: category } }),
      ...(maxPrice && { price: { lte: Number(maxPrice) } }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
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
