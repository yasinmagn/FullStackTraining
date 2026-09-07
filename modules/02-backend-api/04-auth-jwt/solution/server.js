require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth, requireAdmin } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

// /auth stays open so users can register and log in (they have no token yet).
app.use("/auth", require("./routes/auth"));

// The x-user-id hack is gone. /cart and /orders now require a valid JWT;
// controllers read req.user.userId. Product GET routes stay public, while
// POST/PUT/DELETE are protected inside routes/products.js (requireAuth + requireAdmin).
app.use("/products", require("./routes/products"));
// Placing requireAuth here means it runs BEFORE every /cart and /orders route,
// so those routers only ever see already-authenticated requests.
app.use("/cart", requireAuth, require("./routes/cart"));
app.use("/orders", requireAuth, require("./routes/orders"));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.listen(process.env.PORT || 3000, () => console.log("API running"));
