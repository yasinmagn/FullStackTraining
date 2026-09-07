// Orders controller: thin HTTP layer over the orders service.
const service = require("../services/orders");

exports.checkout = async (req, res) => {
  try {
    // Accept either the server-side cart (default) or an explicit items array
    const order = await service.checkout(req.user.userId, req.body?.items);
    res.status(201).json(order); // 201 = created
  } catch (e) {
    // Translate business errors into meaningful HTTP status codes for the client.
    const codes = { CART_EMPTY: 400, INSUFFICIENT_STOCK: 400, PRODUCT_NOT_FOUND: 404 };
    res.status(codes[e.message] || 500).json({ error: e.message });
  }
};
// Only returns orders belonging to the logged-in user.
exports.listMine = async (req, res) => {
  res.json(await service.listByUser(req.user.userId));
};
exports.getOne = async (req, res) => {
  // Pass userId so users can only fetch their OWN order, even by guessing an id.
  const order = await service.getById(req.user.userId, Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
};
