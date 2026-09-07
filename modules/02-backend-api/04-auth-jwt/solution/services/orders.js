const productService = require("./products");
const cartService = require("./cart");
const orders = [];
let nextId = 1;

function checkout(userId) {
  const cart = cartService.getCart(userId);
  if (cart.length === 0) throw new Error("CART_EMPTY");

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

  items.forEach(line => {
    const product = productService.getById(line.productId);
    product.stock -= line.quantity;
  });

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
  cartService.clear(userId);
  return order;
}

function listByUser(userId) {
  return orders.filter(o => o.userId === userId);
}

function getById(userId, orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order || order.userId !== userId) return null;
  return order;
}

module.exports = { orders, checkout, listByUser, getById };
