// This is the entry point of the backend. It creates the Express web server,
// wires up shared "middleware", mounts the feature routes, and starts listening.

// Load variables from the .env file (DATABASE_URL, JWT_SECRET, PORT...) into process.env.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
// requireAuth is our JWT gate — see middleware/auth.js. Used to protect whole route groups.
const { requireAuth } = require("./middleware/auth");

const app = express();
// Middleware runs on every request, in order. These three set up cross-origin access,
// JSON body parsing, and a simple request logger.
app.use(cors());                 // allow the frontend (different origin/port) to call this API
app.use(express.json());         // parse JSON request bodies into req.body
app.use((req, res, next) => { console.log(req.method, req.url); next(); }); // log each request

app.get("/", (req, res) => res.json({ message: "Welcome to SooqOnline API" }));
// Mount each feature's router under a URL prefix. This is the "routes" layer of the
// layered architecture: routes -> controllers -> services -> database.
app.use("/auth", require("./routes/auth"));         // public: register / login
app.use("/products", require("./routes/products")); // public reads; admin-only writes (guarded inside)
// requireAuth here means EVERY /cart and /orders request must carry a valid JWT.
app.use("/cart", requireAuth, require("./routes/cart"));
app.use("/orders", requireAuth, require("./routes/orders"));

// If no route above matched, this catch-all returns a 404.
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
// Error-handling middleware (4 args) catches anything thrown/passed to next(err).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the HTTP server on the configured port.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SooqOnline API on http://localhost:${port}`));
