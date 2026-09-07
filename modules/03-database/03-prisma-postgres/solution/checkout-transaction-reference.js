// Reference pattern for TODO in services/orders.js — adapt, don't paste blindly.
// The key line: updateMany with { stock: { gte: quantity } } is an ATOMIC
// check-and-decrement. If it updated 0 rows, someone else bought it first.
async function checkout(prisma, userId, cartItems) {
  // $transaction runs everything inside as ALL-OR-NOTHING: if any step throws,
  // every change is rolled back. This is why checkout must be a transaction —
  // you never want to decrement stock but fail to create the order (or vice versa).
  // `tx` is the transactional client; use it (not `prisma`) for every call inside.
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];
    for (const { productId, quantity } of cartItems) {
      // Combine the stock CHECK and the DECREMENT into one statement:
      //   where stock >= quantity  AND  data: decrement stock.
      // Because it's a single atomic UPDATE, two shoppers can't both buy the
      // last unit — only one update will find enough stock. `gte` = "greater than or equal".
      const updated = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data:  { stock: { decrement: quantity } },
      });
      // count === 0 means the WHERE matched nothing → not enough stock.
      // Throwing here aborts and rolls back the whole transaction.
      if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");
      // Read the price from the DB (trust the server, not the client) to build the total.
      const product = await tx.product.findUnique({ where: { id: productId } });
      total += Number(product.price) * quantity;
      // Snapshot the price into the order item so it stays fixed even if the product's price changes later.
      itemsData.push({ productId, quantity, unitPrice: product.price });
    }
    // Finally create the order with its items in one nested write.
    // If we reach here, all stock decrements succeeded and get committed together.
    return tx.order.create({
      data: { userId, total, items: { create: itemsData } },
      include: { items: true },
    });
  });
}
module.exports = { checkout };
