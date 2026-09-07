const router = require("express").Router();
const ctrl = require("../controllers/cart");

router.get("/", ctrl.getMine);
router.post("/items", ctrl.addItem);
router.put("/items/:productId", ctrl.setQuantity);
router.delete("/items/:productId", ctrl.removeItem);

module.exports = router;
