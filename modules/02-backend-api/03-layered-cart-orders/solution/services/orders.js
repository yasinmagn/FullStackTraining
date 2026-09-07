// This service coordinates two others (products + cart) to complete a purchase.
const productService = require("./products");
const cartService = require("./cart");
const orders = [];
let nextId = 1;

// checkout(userId) — turn the user's cart into a saved order and reduce stock.
function checkout(userId) {
  const cart = cartService.getCart(userId);
  if (cart.length === 0) throw new Error("CART_EMPTY");

  // 1) Build the line items and re-check stock BEFORE mutating anything.
  // Validating everything first means a failure part-way through can't leave stock
  // half-decremented — either the whole order succeeds or nothing changes.
  const items = cart.map(item => {
    const product = productService.getById(item.productId);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    if (product.stock < item.quantity) throw new Error("INSUFFICIENT_STOCK");
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
    };
  });

  // 2) All checks passed — now decrement stock.
  items.forEach(line => {
    const product = productService.getById(line.productId);
    product.stock -= line.quantity;
  });

  // Sum each line (unit price × quantity) into the order total.
  const total = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const order = {
    id: nextId++,
    userId,
    items,
    total,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  orders.push(order);
  cartService.clear(userId); // Empty the cart now that it became an order.
  return order;
}

// listByUser(userId) — return only the orders that belong to this user.
function listByUser(userId) {
  return orders.filter(o => o.userId === userId);
}

// getById(userId, orderId) — null if not this user's
// The ownership check stops one user from reading another user's order by guessing its id.
function getById(userId, orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order || order.userId !== userId) return null;
  return order;
}

module.exports = { orders, checkout, listByUser, getById };
