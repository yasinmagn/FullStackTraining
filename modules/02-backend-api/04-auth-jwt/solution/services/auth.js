// bcrypt hashes passwords (one-way scrambling) so we never store the real password.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = []; // { id, name, email, passwordHash, role } — stores the HASH, not the password
let nextId = 2; // 1 is the seeded admin

// Seed one admin at startup so the class can test roles immediately.
// async/await is needed because hashing is asynchronous (it takes deliberate time).
(async () => {
  users.push({
    id: 1, name: "Admin", email: "admin@sooqonline.local",
    passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
  });
})();

// register(name, email, password)
async function register(name, email, password) {
  // Validate before creating anything; each throw becomes a 400 in the route.
  if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");
  if (!password || password.length < 8) throw new Error("WEAK_PASSWORD");
  if (users.some(u => u.email === email)) throw new Error("EMAIL_TAKEN");

  // hash(password, 10) — the 10 is the "cost": more rounds = slower = harder to crack.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextId++, name, email, passwordHash, role: "customer" };
  users.push(user);
  // Never return the hash to the client — only safe, public fields.
  return { id: user.id, name: user.name, email: user.email };
}

// login(email, password) -> signed JWT
async function login(email, password) {
  const user = users.find(u => u.email === email);
  // Use the SAME error for unknown email and wrong password, so an attacker can't tell
  // which emails are registered.
  if (!user) throw new Error("INVALID_CREDENTIALS");
  // compare() re-hashes the given password and checks it against the stored hash.
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  // sign() creates the token. The first argument is the payload (data we want to carry),
  // signed with the secret and set to expire in 2 hours so a stolen token won't last forever.
  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

module.exports = { users, register, login };
