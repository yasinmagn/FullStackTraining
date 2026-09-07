const router = require("express").Router();
const auth = require("../services/auth");

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    res.status(201).json(await auth.register(name, email, password));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json({ token: await auth.login(email, password) });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

module.exports = router;
