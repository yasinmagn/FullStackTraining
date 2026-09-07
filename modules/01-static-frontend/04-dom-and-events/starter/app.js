const grid = document.getElementById("product-grid");
const cart = [];

// TODO 1: renderProducts(list) — clear the grid, then for each product append an
// <article class="product-card"> with name, price, and an Add to Cart button
// carrying data-id. Disable the button + label "Out of stock" when stock === 0.
function renderProducts(list) {
}
renderProducts(products);

// TODO 2: click handler on the grid — when a BUTTON is clicked, find the product
// by its data-id, add to cart (quantity +1 if already there), then renderCart().
grid.addEventListener("click", (event) => {
});

// TODO 3: renderCart() — update #cart-count, rebuild #cart-list (one <li> per item
// with name, qty, and a Remove button), set #cart-total via cartTotal (reduce!).
function renderCart() {
}

// TODO 4: live search — on input in #search, renderProducts filtered by name
// (case-insensitive). Use .filter — no for loops.
document.getElementById("search").addEventListener("input", (e) => {
});

// TODO 5: category buttons — build one button per unique category (map + Set),
// clicking filters the grid; "All" shows everything.
