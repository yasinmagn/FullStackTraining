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

  // $transaction runs everything inside as ALL-OR-NOTHING. If any step throws,
  // every change is rolled back — we never charge stock for a half-finished order.
  // "tx" is the transactional client; use it (not prisma) for queries in here.
  const order = await prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];

    for (const { productId, quantity } of items) {
      // Atomic check-and-decrement: only succeeds if stock is still sufficient.
      // The WHERE clause (stock >= quantity) and the decrement happen in ONE SQL
      // statement, so two shoppers buying the last item can't both succeed — a
      // classic race-condition fix. updateMany returns how many rows it changed.
      const updated = await tx.product.updateMany({
        where: { id: Number(productId), stock: { gte: Number(quantity) } },
        data:  { stock: { decrement: Number(quantity) } },
      });
      // 0 rows changed = stock wasn't enough. Throwing rolls back the whole transaction.
      if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");

      // Re-read to capture the price at purchase time (stored on the order line
      // so the historical total stays correct even if the price changes later).
      const product = await tx.product.findUnique({ where: { id: Number(productId) } });
      total += Number(product.price) * Number(quantity);
      itemsData.push({ productId: product.id, quantity: Number(quantity), unitPrice: product.price });
    }

    // Create the Order and its OrderItems together via a nested write ("create").
    return tx.order.create({
      data: { userId, total, items: { create: itemsData } },
      include: { items: { include: { product: true } } }, // return the full order
    });
  });

  // Only reached if the transaction committed successfully.
  await cartService.clear(userId);
  return order;
}

// A user's orders, newest first, with each line's product details.
async function listByUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// findFirst with BOTH id and userId: prevents one user from reading another's order.
async function getById(userId, id) {
  return prisma.order.findFirst({
    where: { id, userId },
    include: { items: { include: { product: true } } },
  });
}

module.exports = { checkout, listByUser, getById };
