// Product routes. Reads are public; writes require a logged-in admin.
const router = require("express").Router();
const ctrl = require("../controllers/products");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Anyone can browse the catalog.
router.get("/", ctrl.list);      // GET /products      -> list (supports ?search, ?category, ?maxPrice)
router.get("/:id", ctrl.getOne); // GET /products/:id  -> one product

// Middleware runs left to right: must be authenticated (requireAuth) AND an
// admin (requireAdmin) before the controller runs. This is the server-side guard.
router.post("/", requireAuth, requireAdmin, ctrl.create);
router.put("/:id", requireAuth, requireAdmin, ctrl.update);
router.delete("/:id", requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
