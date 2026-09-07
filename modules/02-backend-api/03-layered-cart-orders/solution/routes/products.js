// A Router is a mini-app for one resource. Paths here are RELATIVE to the "/products"
// prefix set in server.js, so "/" below is really GET /products.
const router = require("express").Router();
// Each route just points to a controller function — the route file only maps URLs.
const ctrl = require("../controllers/products");
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
module.exports = router;
