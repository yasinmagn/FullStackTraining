const service = require("../services/cart");

function statusFor(message) {
  if (message === "PRODUCT_NOT_FOUND") return 404;
  if (message === "INSUFFICIENT_STOCK") return 409;
  return 400;
}

exports.getMine = (req, res) => res.json(service.getCart(req.userId));

exports.addItem = (req, res) => {
  try {
    const { productId, quantity } = req.body;
    res.status(201).json(service.addItem(req.userId, Number(productId), Number(quantity)));
  } catch (e) {
    res.status(statusFor(e.message)).json({ error: e.message });
  }
};

exports.setQuantity = (req, res) => {
  try {
    const { quantity } = req.body;
    res.json(service.setQuantity(req.userId, Number(req.params.productId), Number(quantity)));
  } catch (e) {
    res.status(statusFor(e.message)).json({ error: e.message });
  }
};

exports.removeItem = (req, res) => {
  res.json(service.setQuantity(req.userId, Number(req.params.productId), 0));
};
