// A JWT (JSON Web Token) is a signed string the client sends to prove who it is.
// Only the server knows JWT_SECRET, so it can trust a token it can verify.
const jwt = require("jsonwebtoken");

// requireAuth — gatekeeper middleware. It reads "Authorization: Bearer <token>",
// verifies the token, and only calls next() (letting the request through) if it's valid.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  // The header looks like "Bearer eyJ...". Split on the space into scheme + token.
  const [scheme, token] = header.split(" ");
  // 401 Unauthorized = "you are not logged in / no valid credentials provided".
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    // verify() checks the signature AND expiry. It throws if the token is tampered with
    // or expired. On success it returns the payload we signed (userId, role, name),
    // which we attach to req.user for later handlers to use.
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// requireAdmin — runs AFTER requireAuth, so req.user already exists here.
// This separates authentication (who are you?) from authorization (are you allowed?).
function requireAdmin(req, res, next) {
  // 403 Forbidden = "we know who you are, but you don't have permission" (vs 401 = not logged in).
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
