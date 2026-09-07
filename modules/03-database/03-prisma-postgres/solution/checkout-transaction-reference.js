// Reference pattern for TODO in services/orders.js — adapt, don't paste blindly.
// The key line: updateMany with { stock: { gte: quantity } } is an ATOMIC
// check-and-decrement. If it updated 0 rows, someone else bought it first.
async function checkout(prisma, userId, cartItems) {
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];
    for (const { productId, quantity } of cartItems) {
      const updated = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data:  { stock: { decrement: quantity } },
      });
      if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");
      const product = await tx.product.findUnique({ where: { id: productId } });
      total += Number(product.price) * quantity;
      itemsData.push({ productId, quantity, unitPrice: product.price });
    }
    return tx.order.create({
      data: { userId, total, items: { create: itemsData } },
      include: { items: true },
    });
  });
}
module.exports = { checkout };
