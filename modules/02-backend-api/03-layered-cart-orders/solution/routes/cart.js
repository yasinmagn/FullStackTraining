const router = require("express").Router();
const ctrl = require("../controllers/cart");

// GET    /                    -> my cart
// POST   /items               -> add { productId, quantity }
// PUT    /items/:productId     -> set quantity
// DELETE /items/:productId     -> remove
router.get("/", ctrl.getMine);
router.post("/items", ctrl.addItem);
router.put("/items/:productId", ctrl.setQuantity);
router.delete("/items/:productId", ctrl.removeItem);

module.exports = router;
