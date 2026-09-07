// Cart routes. This whole group is protected by requireAuth in server.js,
// so every handler can trust req.user exists. Each route delegates to a
// controller function (routes -> controllers -> services).
const router = require("express").Router();
const ctrl = require("../controllers/cart");

// :productId is a URL parameter, available as req.params.productId.
router.get("/", ctrl.getCart);                      // GET  /cart          -> list my cart
router.post("/items", ctrl.addItem);                // POST /cart/items    -> add a product
router.put("/items/:productId", ctrl.setQuantity);  // PUT  set exact quantity
router.delete("/items/:productId", ctrl.removeItem);// DELETE remove one line

module.exports = router;
