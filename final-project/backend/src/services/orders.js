const prisma = require("../db");
const cartService = require("./cart");

async function checkout(userId, explicitItems) {
  // Source of items: explicit body (frontend cart) or the server-side cart
  let items = explicitItems;
  if (!items) {
    const cart = await cartService.getCart(userId);
    items = cart.map(({ productId, quantity }) => ({ productId, quantity }));
  }
  if (!items || items.length === 0) throw new Error("CART_EMPTY");

  const order = await prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];

    for (const { productId, quantity } of items) {
      // Atomic check-and-decrement: only succeeds if stock is still sufficient.
      const updated = await tx.product.updateMany({
        where: { id: Number(productId), stock: { gte: Number(quantity) } },
        data:  { stock: { decrement: Number(quantity) } },
      });
      if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");

      const product = await tx.product.findUnique({ where: { id: Number(productId) } });
      total += Number(product.price) * Number(quantity);
      itemsData.push({ productId: product.id, quantity: Number(quantity), unitPrice: product.price });
    }

    return tx.order.create({
      data: { userId, total, items: { create: itemsData } },
      include: { items: { include: { product: true } } },
    });
  });

  await cartService.clear(userId);
  return order;
}

async function listByUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getById(userId, id) {
  return prisma.order.findFirst({
    where: { id, userId },
    include: { items: { include: { product: true } } },
  });
}

module.exports = { checkout, listByUser, getById };
