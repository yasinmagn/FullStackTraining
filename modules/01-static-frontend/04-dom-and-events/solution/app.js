const grid = document.getElementById("product-grid");
const cart = [];

// Render the product grid from a data array.
function renderProducts(list) {
  grid.innerHTML = "";
  list.forEach((p) => {
    const out = p.stock === 0;
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <h3>${p.name}</h3>
      <p class="price">$${p.price}</p>
      <button data-id="${p.id}" ${out ? "disabled" : ""}>
        ${out ? "Out of stock" : "Add to Cart"}
      </button>`;
    grid.appendChild(card);
  });
}
renderProducts(products);

// Event delegation: one listener handles every Add-to-Cart button.
grid.addEventListener("click", (event) => {
  if (event.target.tagName !== "BUTTON") return;
  const id = Number(event.target.dataset.id);
  const product = findById(products, id);
  if (!product) return;

  const existing = cart.find((i) => i.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });

  renderCart();
});

// Render the cart: count, line items, and total.
function renderCart() {
  document.getElementById("cart-count").textContent =
    cart.reduce((s, i) => s + i.quantity, 0);

  const list = document.getElementById("cart-list");
  list.innerHTML = "";
  cart.forEach((i) => {
    const li = document.createElement("li");
    li.innerHTML = `${i.name} × ${i.quantity}
      <button data-remove="${i.id}">Remove</button>`;
    list.appendChild(li);
  });

  document.getElementById("cart-total").textContent = cartTotal(cart);
}

// Remove items (delegated on the cart list).
document.getElementById("cart-list").addEventListener("click", (e) => {
  const id = Number(e.target.dataset.remove);
  if (!id) return;
  const index = cart.findIndex((i) => i.id === id);
  if (index !== -1) cart.splice(index, 1);
  renderCart();
});

// Live search.
document.getElementById("search").addEventListener("input", (e) => {
  renderProducts(searchByName(products, e.target.value));
});

// Category filter buttons, generated from the unique categories in the data.
const categoryBox = document.getElementById("category-buttons");
const categories = ["all", ...new Set(products.map((p) => p.category))];
categoryBox.innerHTML = categories
  .map((c) => `<button class="cat" data-cat="${c}">${c === "all" ? "All" : c}</button>`)
  .join("");

categoryBox.addEventListener("click", (e) => {
  const cat = e.target.dataset.cat;
  if (!cat) return;
  renderProducts(cat === "all" ? products : productsInCategory(products, cat));
});
