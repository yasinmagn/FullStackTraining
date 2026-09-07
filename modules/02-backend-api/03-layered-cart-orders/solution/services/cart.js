// The SERVICE layer holds the business rules and the data. It never touches req/res,
// so it can be reused and tested on its own. On failure it THROWS an error; the
// controller catches it and picks the HTTP status.
// In-memory carts: { [userId]: [ { productId, quantity } ] } (resets when the server restarts).
const productService = require("./products");
const carts = {};

// getCart(userId) -> the user's items array (empty array if none)
function getCart(userId) {
  return carts[userId] || [];
}

// addItem(userId, productId, quantity)
function addItem(userId, productId, quantity) {
  const qty = Number(quantity) || 1;
  // Validation lives here (not in the controller) so every caller of the service is
  // protected by the same rules.
  const product = productService.getById(productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  // Get this user's cart, creating an empty one on first use (assignment inside || ).
  const cart = carts[userId] || (carts[userId] = []);
  const existing = cart.find(i => i.productId === productId);
  // "desired" is what the total quantity would become; reject if it exceeds stock.
  const desired = (existing ? existing.quantity : 0) + qty;
  if (product.stock < desired) throw new Error("INSUFFICIENT_STOCK");

  if (existing) existing.quantity = desired;
  else cart.push({ productId, quantity: qty });
  return cart;
}

// setQuantity(userId, productId, quantity) — quantity 0 removes the item
function setQuantity(userId, productId, quantity) {
  const qty = Number(quantity);
  const cart = carts[userId] || (carts[userId] = []);

  // Setting quantity to 0 (or less) means "remove it": keep every item EXCEPT this one.
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

// clear(userId)
function clear(userId) {
  carts[userId] = [];
  return carts[userId];
}

module.exports = { carts, getCart, addItem, setQuantity, clear };
