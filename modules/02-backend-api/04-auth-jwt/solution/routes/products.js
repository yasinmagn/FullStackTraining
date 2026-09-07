const router = require("express").Router();
const ctrl = require("../controllers/products");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// GET routes stay public — anyone can browse the shop.
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);

// Write routes require an authenticated admin. Middleware runs left to right:
// requireAuth (must be logged in) -> requireAdmin (must be an admin) -> controller.
router.post("/", requireAuth, requireAdmin, ctrl.create);
router.put("/:id", requireAuth, requireAdmin, ctrl.update);
router.delete("/:id", requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
