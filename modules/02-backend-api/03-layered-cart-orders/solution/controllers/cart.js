// The controller handles HTTP: it reads req, calls the service, and shapes the response.
// The service (required here) holds the real logic and throws plain errors on failure.
const service = require("../services/cart");

// Translate the service's error "codes" into the right HTTP status.
// 404 = the product doesn't exist; 409 Conflict = not enough stock; 400 = other bad input.
function statusFor(message) {
  if (message === "PRODUCT_NOT_FOUND") return 404;
  if (message === "INSUFFICIENT_STOCK") return 409;
  return 400;
}

// req.userId was set by the middleware in server.js.
exports.getMine = (req, res) => res.json(service.getCart(req.userId));

exports.addItem = (req, res) => {
  // try/catch lets the service throw on invalid input while the controller decides the
  // HTTP status. This keeps error-handling out of the business logic.
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
