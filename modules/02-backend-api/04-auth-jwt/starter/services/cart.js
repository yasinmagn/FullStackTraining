// In-memory carts: { [userId]: [ { productId, quantity } ] }
const productService = require("./products");
const carts = {};

function getCart(userId) {
  return carts[userId] || [];
}

function addItem(userId, productId, quantity) {
  const qty = Number(quantity) || 1;
  const product = productService.getById(productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const cart = carts[userId] || (carts[userId] = []);
  const existing = cart.find(i => i.productId === productId);
  const desired = (existing ? existing.quantity : 0) + qty;
  if (product.stock < desired) throw new Error("INSUFFICIENT_STOCK");

  if (existing) existing.quantity = desired;
  else cart.push({ productId, quantity: qty });
  return cart;
}

function setQuantity(userId, productId, quantity) {
  const qty = Number(quantity);
  const cart = carts[userId] || (carts[userId] = []);

  if (qty <= 0) {
    carts[userId] = cart.filter(i => i.productId !== productId);
    return carts[userId];
  }

  const product = productService.getById(productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (product.stock < qty) throw new Error("INSUFFICIENT_STOCK");

  const existing = cart.find(i => i.productId === productId);
  if (existing) existing.quantity = qty;
  else cart.push({ productId, quantity: qty });
  return cart;
}

function clear(userId) {
  carts[userId] = [];
  return carts[userId];
}

module.exports = { carts, getCart, addItem, setQuantity, clear };
