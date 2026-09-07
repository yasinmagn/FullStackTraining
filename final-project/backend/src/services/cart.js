// Cart service: reads/writes CartItem rows for a given user.
const prisma = require("../db");

async function getCart(userId) {
  return prisma.cartItem.findMany({
    where: { userId },
    // "include" follows the Prisma relation and embeds the full product for each
    // cart line, so the client gets name/price/stock in one query (a JOIN).
    include: { product: true },
    orderBy: { id: "asc" },
  });
}

async function addItem(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("INVALID_QUANTITY");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  // The schema has a unique (userId, productId) pair, so a user has at most one
  // row per product. Look it up to add onto any existing quantity.
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  if (product.stock < newQuantity) throw new Error("INSUFFICIENT_STOCK");

  // upsert = UPDATE if the row exists, otherwise CREATE it — no need for an if/else.
  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: newQuantity },
    create: { userId, productId, quantity },
  });
  return getCart(userId); // return the fresh cart to the caller
}

// Set an exact quantity for a product (used by +/- buttons and remove).
async function setQuantity(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_QUANTITY");
  // Quantity 0 means "remove this line from the cart".
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

// Empty the whole cart — called after a successful checkout.
async function clear(userId) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

module.exports = { getCart, addItem, setQuantity, clear };
