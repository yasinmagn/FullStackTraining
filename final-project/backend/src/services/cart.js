const prisma = require("../db");

async function getCart(userId) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { id: "asc" },
  });
}

async function addItem(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("INVALID_QUANTITY");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  if (product.stock < newQuantity) throw new Error("INSUFFICIENT_STOCK");

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: newQuantity },
    create: { userId, productId, quantity },
  });
  return getCart(userId);
}

async function setQuantity(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_QUANTITY");
  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
    return getCart(userId);
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (product.stock < quantity) throw new Error("INSUFFICIENT_STOCK");

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity },
    create: { userId, productId, quantity },
  });
  return getCart(userId);
}

async function clear(userId) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

module.exports = { getCart, addItem, setQuantity, clear };
