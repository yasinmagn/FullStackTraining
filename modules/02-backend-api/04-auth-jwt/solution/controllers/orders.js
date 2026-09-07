const service = require("../services/orders");

exports.checkout = (req, res) => {
  try {
    res.status(201).json(service.checkout(req.user.userId));
  } catch (e) {
    const status = e.message === "INSUFFICIENT_STOCK" ? 409 : 400;
    res.status(status).json({ error: e.message });
  }
};

exports.listMine = (req, res) => res.json(service.listByUser(req.user.userId));

exports.getOne = (req, res) => {
  const order = service.getById(req.user.userId, Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
};
