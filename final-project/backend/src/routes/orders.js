// Order routes, also protected by requireAuth (see server.js).
const router = require("express").Router();
const ctrl = require("../controllers/orders");

router.post("/", ctrl.checkout);   // POST /orders     -> place an order (checkout)
router.get("/", ctrl.listMine);    // GET  /orders     -> my order history
router.get("/:id", ctrl.getOne);   // GET  /orders/:id -> one order (only if it's mine)

module.exports = router;
