// document.getElementById finds the one HTML element with id="product-grid".
// We grab it once and reuse it, instead of searching the page every time.
const grid = document.getElementById("product-grid");
// The shopping cart lives in memory as an array of items the user has added.
const cart = [];

// Render the product grid from a data array.
function renderProducts(list) {
  // Clear whatever is currently shown before drawing the (possibly filtered) list.
  grid.innerHTML = "";
  // forEach runs this function once per product to build a card for each.
  list.forEach((p) => {
    const out = p.stock === 0;
    // Create a brand-new <article> element in memory (not yet on the page).
    const card = document.createElement("article");
    card.className = "product-card";
    // Template literals (backticks) let us drop ${values} straight into the HTML string.
    // data-id stores the product id ON the button so the click handler can read it back.
    card.innerHTML = `
      <h3>${p.name}</h3>
      <p class="price">$${p.price}</p>
      <button data-id="${p.id}" ${out ? "disabled" : ""}>
        ${out ? "Out of stock" : "Add to Cart"}
      </button>`;
    // appendChild inserts the finished card into the page so the user can see it.
    grid.appendChild(card);
  });
}
renderProducts(products);

// Event delegation: instead of adding a listener to every button (they don't even exist
// until renderProducts runs), we attach ONE listener to the grid. Clicks "bubble up"
// from the button to the grid, and here we check what was actually clicked.
grid.addEventListener("click", (event) => {
  // event.target is the exact element clicked. Ignore clicks that aren't on a button.
  if (event.target.tagName !== "BUTTON") return;
  // dataset.id reads the data-id attribute; it's always a string, so convert to a number.
  const id = Number(event.target.dataset.id);
  const product = findById(products, id);
  if (!product) return;

  // If this product is already in the cart, just bump its quantity...
  const existing = cart.find((i) => i.id === id);
  if (existing) existing.quantity += 1;
  // ...otherwise add a copy of it (…spread copies its fields) with quantity 1.
  else cart.push({ ...product, quantity: 1 });

  renderCart();
});

// Render the cart: count, line items, and total.
function renderCart() {
  // textContent updates the text inside an element. Here reduce sums up all quantities
  // to show the total number of items next to the "Cart" label.
  document.getElementById("cart-count").textContent =
    cart.reduce((s, i) => s + i.quantity, 0);

  const list = document.getElementById("cart-list");
  list.innerHTML = "";
  cart.forEach((i) => {
    const li = document.createElement("li");
    // Each row carries a data-remove attribute so the delegated handler below knows
    // which item to remove.
    li.innerHTML = `${i.name} × ${i.quantity}
      <button data-remove="${i.id}">Remove</button>`;
    list.appendChild(li);
  });

  // Reuse the cartTotal helper from shop.js to display the price total.
  document.getElementById("cart-total").textContent = cartTotal(cart);
}

// Remove items (delegated on the cart list — same one-listener pattern as the grid).
document.getElementById("cart-list").addEventListener("click", (e) => {
  const id = Number(e.target.dataset.remove);
  if (!id) return;
  // findIndex gives the position of the item; splice removes 1 element at that position.
  const index = cart.findIndex((i) => i.id === id);
  if (index !== -1) cart.splice(index, 1);
  renderCart();
});

// Live search: the "input" event fires on every keystroke, so results update as you type.
document.getElementById("search").addEventListener("input", (e) => {
  renderProducts(searchByName(products, e.target.value));
});

// Category filter buttons, generated from the unique categories in the data.
const categoryBox = document.getElementById("category-buttons");
// new Set() drops duplicate categories; the ...spread turns it back into an array,
// with "all" added at the front for a "show everything" button.
const categories = ["all", ...new Set(products.map((p) => p.category))];
// .map() turns each category into a button's HTML; .join("") glues them into one string.
categoryBox.innerHTML = categories
  .map((c) => `<button class="cat" data-cat="${c}">${c === "all" ? "All" : c}</button>`)
  .join("");

categoryBox.addEventListener("click", (e) => {
  const cat = e.target.dataset.cat;
  if (!cat) return;
  // "all" shows the full list; otherwise filter the products down to the chosen category.
  renderProducts(cat === "all" ? products : productsInCategory(products, cat));
});
