const router = require("express").Router();
const ctrl = require("../controllers/products");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", requireAuth, requireAdmin, ctrl.create);
router.put("/:id", requireAuth, requireAdmin, ctrl.update);
router.delete("/:id", requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
