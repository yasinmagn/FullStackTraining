const service = require("../services/cart");

// Map service error codes to HTTP statuses (404 missing, 409 conflict, 400 other).
function statusFor(message) {
  if (message === "PRODUCT_NOT_FOUND") return 404;
  if (message === "INSUFFICIENT_STOCK") return 409;
  return 400;
}

// req.user was set by requireAuth from the verified JWT (replaces the old x-user-id header).
exports.getMine = (req, res) => res.json(service.getCart(req.user.userId));

exports.addItem = (req, res) => {
  try {
    const { productId, quantity } = req.body;
    res.status(201).json(service.addItem(req.user.userId, Number(productId), Number(quantity)));
  } catch (e) {
    res.status(statusFor(e.message)).json({ error: e.message });
  }
};

exports.setQuantity = (req, res) => {
  try {
    const { quantity } = req.body;
    res.json(service.setQuantity(req.user.userId, Number(req.params.productId), Number(quantity)));
  } catch (e) {
    res.status(statusFor(e.message)).json({ error: e.message });
  }
};

exports.removeItem = (req, res) => {
  res.json(service.setQuantity(req.user.userId, Number(req.params.productId), 0));
};
