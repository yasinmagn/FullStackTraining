const router = require("express").Router();
const ctrl = require("../controllers/orders");

router.post("/", ctrl.checkout);
router.get("/", ctrl.listMine);
router.get("/:id", ctrl.getOne);

module.exports = router;
