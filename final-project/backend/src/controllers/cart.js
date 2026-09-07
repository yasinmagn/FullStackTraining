const service = require("../services/cart");

const ERRORS = { PRODUCT_NOT_FOUND: 404, INSUFFICIENT_STOCK: 400, INVALID_QUANTITY: 400 };
const fail = (res, e) =>
  res.status(ERRORS[e.message] || 500).json({ error: e.message });

exports.getCart = async (req, res) => {
  res.json(await service.getCart(req.user.userId));
};
exports.addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    res.status(201).json(await service.addItem(req.user.userId, Number(productId), Number(quantity ?? 1)));
  } catch (e) { fail(res, e); }
};
exports.setQuantity = async (req, res) => {
  try {
    res.json(await service.setQuantity(req.user.userId, Number(req.params.productId), Number(req.body.quantity)));
  } catch (e) { fail(res, e); }
};
exports.removeItem = async (req, res) => {
  try {
    await service.setQuantity(req.user.userId, Number(req.params.productId), 0);
    res.status(204).end();
  } catch (e) { fail(res, e); }
};
