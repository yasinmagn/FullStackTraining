const productService = require("./products");
const cartService = require("./cart");
const orders = [];

// TODO 6: checkout(userId)
//   - cart empty -> throw Error("CART_EMPTY")
//   - build items: { productId, name, unitPrice: current price, quantity }
//     re-checking stock for each (throw INSUFFICIENT_STOCK if not enough)
//   - decrement stock only AFTER all checks pass
//   - create { id, userId, items, total (reduce), createdAt, status: "pending" }
//   - push to orders, clear the cart, return the order

// TODO 7: listByUser(userId), getById(userId, orderId) (null if not this user's)

module.exports = { orders /*, checkout, listByUser, getById */ };
