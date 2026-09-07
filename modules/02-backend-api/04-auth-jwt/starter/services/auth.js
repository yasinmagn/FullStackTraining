const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = []; // { id, name, email, passwordHash, role }

// Seed one admin at startup so the class can test roles immediately
(async () => {
  users.push({
    id: 1, name: "Admin", email: "admin@sooqonline.local",
    passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
  });
})();

// TODO 1: register(name, email, password)
//   - email must contain "@"          -> throw Error("INVALID_EMAIL")
//   - password.length >= 8            -> throw Error("WEAK_PASSWORD")
//   - email not already used          -> throw Error("EMAIL_TAKEN")
//   - hash with bcrypt (10 rounds), role "customer"
//   - return { id, name, email } — NEVER the hash

// TODO 2: login(email, password)
//   - find user; bcrypt.compare
//   - wrong email OR wrong password -> throw Error("INVALID_CREDENTIALS") (same msg!)
//   - return jwt.sign({ userId, role, name }, process.env.JWT_SECRET, { expiresIn: "2h" })

module.exports = { users /*, register, login */ };
