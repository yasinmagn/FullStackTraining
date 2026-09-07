const router = require("express").Router();
const ctrl = require("../controllers/orders");

// POST /       -> checkout
// GET  /       -> my orders
// GET  /:id    -> one of my orders
router.post("/", ctrl.checkout);
router.get("/", ctrl.listMine);
router.get("/:id", ctrl.getOne);

module.exports = router;
