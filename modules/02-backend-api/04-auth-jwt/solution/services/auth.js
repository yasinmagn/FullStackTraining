const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = []; // { id, name, email, passwordHash, role }
let nextId = 2; // 1 is the seeded admin

// Seed one admin at startup so the class can test roles immediately
(async () => {
  users.push({
    id: 1, name: "Admin", email: "admin@sooqonline.local",
    passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
  });
})();

// register(name, email, password)
async function register(name, email, password) {
  if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");
  if (!password || password.length < 8) throw new Error("WEAK_PASSWORD");
  if (users.some(u => u.email === email)) throw new Error("EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextId++, name, email, passwordHash, role: "customer" };
  users.push(user);
  // Never return the hash.
  return { id: user.id, name: user.name, email: user.email };
}

// login(email, password) -> signed JWT
async function login(email, password) {
  const user = users.find(u => u.email === email);
  // Same error whether the email is unknown or the password is wrong.
  if (!user) throw new Error("INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

module.exports = { users, register, login };
