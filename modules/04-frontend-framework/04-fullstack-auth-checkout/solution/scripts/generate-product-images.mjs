// Generates one self-contained SVG per product into public/product-images/.
// Deterministic: same product name -> same colors, so images are stable.
// Run: node scripts/generate-product-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "product-images");

const catalog = {
  phones: ["Smartphone X200", "Smartphone Y10", "Smartphone Z1", "Feature Phone F2"],
  computers: ["Laptop Pro 14", "Laptop Air 13", "Desktop Tower", "Monitor 24in"],
  accessories: ["USB-C Charger", "Phone Case", "Screen Protector", "Power Bank 10k", "USB Cable", "Laptop Bag"],
  audio: ["Headphones Air", "Bluetooth Speaker", "Earbuds Mini", "Microphone USB"],
};

const emoji = { phones: "📱", computers: "💻", accessories: "🔌", audio: "🎧" };

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Simple deterministic hash -> hue (0-359)
function hue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function svg(name, category) {
  const h = hue(name);
  const c1 = `hsl(${h}, 55%, 42%)`;
  const c2 = `hsl(${(h + 40) % 360}, 60%, 28%)`;
  const label = name.replace(/&/g, "&amp;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#g)"/>
  <circle cx="300" cy="165" r="92" fill="rgba(255,255,255,0.14)"/>
  <text x="300" y="200" font-size="96" text-anchor="middle" dominant-baseline="middle">${emoji[category]}</text>
  <text x="300" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
  <text x="300" y="336" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.85)" text-anchor="middle">${category}</text>
  <text x="574" y="382" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.75)" text-anchor="end">SooqOnline</text>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
let count = 0;
for (const [category, names] of Object.entries(catalog)) {
  for (const name of names) {
    writeFileSync(join(OUT, `${slugify(name)}.svg`), svg(name, category));
    count++;
  }
}
console.log(`Generated ${count} product images into public/product-images/`);
