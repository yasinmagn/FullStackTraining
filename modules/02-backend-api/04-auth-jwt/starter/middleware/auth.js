const jwt = require("jsonwebtoken");

// TODO 3: requireAuth — read "Authorization: Bearer <token>" header.
//   Missing -> 401 { error: "Login required" }.
//   jwt.verify with JWT_SECRET; put the payload on req.user; call next().
//   Invalid/expired -> 401 { error: "Invalid or expired token" }.
function requireAuth(req, res, next) {
}

// TODO 4: requireAdmin — assume requireAuth ran first.
//   req.user.role !== "admin" -> 403 { error: "Admins only" }.
function requireAdmin(req, res, next) {
}

module.exports = { requireAuth, requireAdmin };
