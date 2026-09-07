// In-memory carts: { [userId]: [ { productId, quantity } ] }
const productService = require("./products");
const carts = {};

// TODO 2: getCart(userId) -> the user's items array (empty array if none)

// TODO 3: addItem(userId, productId, quantity)
//   - product must exist            -> throw Error("PRODUCT_NOT_FOUND")
//   - product.stock >= quantity     -> else throw Error("INSUFFICIENT_STOCK")
//   - if item exists, increase quantity; else push a new item. Return the cart.

// TODO 4: setQuantity(userId, productId, quantity) — quantity 0 removes the item

// TODO 5: clear(userId)

module.exports = { carts /*, getCart, addItem, setQuantity, clear */ };
