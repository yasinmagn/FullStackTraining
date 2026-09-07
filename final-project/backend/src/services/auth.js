// SERVICES layer: the actual business logic. Services talk to the database (via
// Prisma) and enforce the rules. They know nothing about HTTP/req/res.
const bcrypt = require("bcryptjs");     // hashes passwords so we never store them as plain text
const jwt = require("jsonwebtoken");    // creates the signed login tokens
const prisma = require("../db");

async function register(name, email, password) {
  // Basic validation — throw a coded Error and let the controller map it to a status.
  if (!name) throw new Error("name is required");
  if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");
  if (!password || password.length < 8) throw new Error("WEAK_PASSWORD");
  // Emails are unique in the schema; reject duplicates with a clear error.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_TAKEN");

  // Never store the raw password. bcrypt.hash turns it into a one-way hash;
  // "10" is the salt cost (higher = slower = harder to brute force).
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  // Return only safe fields — never send the password hash back to the client.
  return { id: user.id, name: user.name, email: user.email };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Use the SAME error for "no such user" and "wrong password" so attackers
  // can't tell which emails are registered.
  if (!user) throw new Error("INVALID_CREDENTIALS");
  // bcrypt.compare re-hashes the input and checks it against the stored hash.
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  // Build and sign the JWT. The payload (userId, role, name) is readable but
  // tamper-proof because it's signed with JWT_SECRET. Expires after 2 hours.
  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

module.exports = { register, login };
