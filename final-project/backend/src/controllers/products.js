const service = require("../services/products");

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.query)); } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try {
    const p = await service.getById(Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(p);
  } catch (e) { next(e); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await service.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const p = await service.update(Number(req.params.id), req.body);
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
};
exports.remove = async (req, res, next) => {
  try {
    const ok = await service.remove(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Product not found" });
    res.status(204).end();
  } catch (e) { next(e); }
};
