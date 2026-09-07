// CONTROLLERS layer: translate between HTTP and the service layer. They read
// req (params/body/user), call the service, and turn results OR thrown errors
// into HTTP responses. The service never touches req/res — that separation keeps
// the business logic reusable and testable.
const service = require("../services/cart");

// Map the service's error "codes" (thrown as Error messages) to HTTP status codes.
const ERRORS = { PRODUCT_NOT_FOUND: 404, INSUFFICIENT_STOCK: 400, INVALID_QUANTITY: 400 };
const fail = (res, e) =>
  res.status(ERRORS[e.message] || 500).json({ error: e.message });

// req.user.userId came from the verified JWT (set by requireAuth middleware).
exports.getCart = async (req, res) => {
  res.json(await service.getCart(req.user.userId));
};
exports.addItem = async (req, res) => {
  try {
    // Convert the incoming JSON values to numbers; default quantity to 1 if omitted.
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
    // Removing == setting the quantity to 0 (the service deletes the row).
    await service.setQuantity(req.user.userId, Number(req.params.productId), 0);
    res.status(204).end(); // 204 = success, no content to return
  } catch (e) { fail(res, e); }
};
