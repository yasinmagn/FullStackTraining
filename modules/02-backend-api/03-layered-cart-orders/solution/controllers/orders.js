const service = require("../services/orders");

exports.checkout = (req, res) => {
  try {
    // 201 Created — checkout turns the cart into a new order resource.
    res.status(201).json(service.checkout(req.userId));
  } catch (e) {
    // 409 Conflict when stock ran out; otherwise 400 (e.g. empty cart).
    const status = e.message === "INSUFFICIENT_STOCK" ? 409 : 400;
    res.status(status).json({ error: e.message });
  }
};

exports.listMine = (req, res) => res.json(service.listByUser(req.userId));

exports.getOne = (req, res) => {
  const order = service.getById(req.userId, Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
};
