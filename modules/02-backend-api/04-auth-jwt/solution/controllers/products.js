const service = require("../services/products");

exports.list = (req, res) => res.json(service.list(req.query));
exports.getOne = (req, res) => {
  const p = service.getById(Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
};
exports.create = (req, res) => {
  try { res.status(201).json(service.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = (req, res) => {
  const p = service.update(Number(req.params.id), req.body);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
};
exports.remove = (req, res) => {
  if (!service.remove(Number(req.params.id))) return res.status(404).json({ error: "Product not found" });
  res.status(204).end();
};
