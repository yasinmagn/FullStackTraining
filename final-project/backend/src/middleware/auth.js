// Authentication middleware. A JWT (JSON Web Token) is a signed string the client
// sends with each request to prove who they are — no need to log in every time.
const jwt = require("jsonwebtoken");

// requireAuth blocks the request unless a valid token is present.
function requireAuth(req, res, next) {
  // Clients send the token in the header: "Authorization: Bearer <token>".
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" }); // 401 = not authenticated
  }
  try {
    // Verify the signature with our secret. If valid, the decoded payload
    // (userId, role, name) is attached to req.user for later handlers to use.
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    next(); // token OK -> continue to the next handler
  } catch {
    // Bad signature or expired token lands here.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// requireAdmin runs AFTER requireAuth, so req.user already exists.
// It checks the role and blocks non-admins (403 = authenticated but not allowed).
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
}

module.exports = { requireAuth, requireAdmin };
