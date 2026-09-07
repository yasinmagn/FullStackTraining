// ROUTES layer: maps HTTP method + URL to a handler. These handlers are thin —
// they read the request, call the auth SERVICE (which holds the real logic), and
// shape the response. Business rules live in ../services/auth.js.
const router = require("express").Router();
const auth = require("../services/auth");

// POST /auth/register -> create a new user account.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    res.status(201).json(await auth.register(name, email, password));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /auth/login -> check credentials and return a JWT the client stores and reuses.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json({ token: await auth.login(email, password) });
  } catch (e) { res.status(401).json({ error: e.message }); } // 401 on wrong credentials
});

module.exports = router;
