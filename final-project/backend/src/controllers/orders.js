const service = require("../services/orders");

exports.checkout = async (req, res) => {
  try {
    // Accept either the server-side cart (default) or an explicit items array
    const order = await service.checkout(req.user.userId, req.body?.items);
    res.status(201).json(order);
  } catch (e) {
    const codes = { CART_EMPTY: 400, INSUFFICIENT_STOCK: 400, PRODUCT_NOT_FOUND: 404 };
    res.status(codes[e.message] || 500).json({ error: e.message });
  }
};
exports.listMine = async (req, res) => {
  res.json(await service.listByUser(req.user.userId));
};
exports.getOne = async (req, res) => {
  const order = await service.getById(req.user.userId, Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
};
