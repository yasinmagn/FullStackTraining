const router = require("express").Router();
const auth = require("../services/auth");

// POST /auth/register — create an account. The handler is async because the service
// awaits password hashing; await pauses until that finishes.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    res.status(201).json(await auth.register(name, email, password));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /auth/login — return a JWT the client will send on future protected requests.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json({ token: await auth.login(email, password) });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

module.exports = router;
