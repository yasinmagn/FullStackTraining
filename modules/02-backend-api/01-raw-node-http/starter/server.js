const http = require("http");
const { products } = require("./data/products");

const server = http.createServer((req, res) => {
  // TODO 2: GET /products -> 200 + JSON array (Content-Type: application/json)
  // TODO 3: GET /          -> 200 + { message: "Welcome to SooqOnline API" }
  // TODO 4: anything else  -> 404 + { error: "Not found" }
});

server.listen(3000, () => console.log("SooqOnline API on http://localhost:3000"));

// Stretch (homework): GET /categories -> unique category names (map + Set)
