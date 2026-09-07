// A "seed" script fills an empty database with starter data so the app has
// something to show. Run it once after setting up the tables.
const { PrismaClient } = require("@prisma/client"); // Prisma's query client
const bcrypt = require("bcryptjs");                 // hashes passwords securely
const prisma = new PrismaClient();

// Prisma queries are asynchronous (they wait on the database), so we use
// an async function with `await` on each call.
async function main() {
  // 1. Categories
  const cats = ["phones", "computers", "accessories", "audio"];
  for (const name of cats) {
    // upsert = "update if it exists, otherwise create". This makes the seed
    // idempotent: running it twice won't create duplicate categories.
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Admin user
  await prisma.user.upsert({
    where: { email: "admin@sooqonline.local" },
    update: {},
    create: {
      name: "Admin", email: "admin@sooqonline.local",
      // Never store a raw password. bcrypt.hash turns "admin1234" into a
      // one-way hash; login later re-hashes the input and compares. The 10 is
      // the "cost" (how much work the hash takes — slows down attackers).
      passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
    },
  });

  // Products need a categoryId, so first fetch each category to get its id.
  // findUnique looks up a single row by a unique field (here, the name).
  // TODO 5 (done): seed ~20 products. Look up category ids first with findUnique.
  const phones      = await prisma.category.findUnique({ where: { name: "phones" } });
  const computers   = await prisma.category.findUnique({ where: { name: "computers" } });
  const accessories = await prisma.category.findUnique({ where: { name: "accessories" } });
  const audio       = await prisma.category.findUnique({ where: { name: "audio" } });

  const products = [
    // phones
    { name: "Smartphone X200",             price: 120, stock: 5,  categoryId: phones.id },
    { name: "Smartphone Y10",              price: 85,  stock: 8,  categoryId: phones.id },
    { name: "Smartphone Z Ultra",         price: 240, stock: 3,  categoryId: phones.id },
    { name: "Smartphone Mini 5",          price: 60,  stock: 15, categoryId: phones.id },
    { name: "Foldable Phone F1",          price: 320, stock: 1,  categoryId: phones.id },
    // computers
    { name: "Laptop Pro 14",              price: 450, stock: 2,  categoryId: computers.id },
    { name: "Laptop Air 13",              price: 380, stock: 4,  categoryId: computers.id },
    { name: "Gaming Laptop 17",           price: 620, stock: 2,  categoryId: computers.id },
    { name: "Ultrabook Slim 14",          price: 410, stock: 6,  categoryId: computers.id },
    { name: "Desktop Tower i7",           price: 540, stock: 0,  categoryId: computers.id },
    // accessories
    { name: "USB-C Charger",              price: 8,   stock: 40, categoryId: accessories.id },
    { name: "Phone Case",                 price: 5,   stock: 30, categoryId: accessories.id },
    { name: "Wireless Mouse",             price: 12,  stock: 50, categoryId: accessories.id },
    { name: "Mechanical Keyboard",        price: 45,  stock: 20, categoryId: accessories.id },
    { name: 'Laptop Sleeve 15"',          price: 18,  stock: 25, categoryId: accessories.id },
    // audio
    { name: "Headphones Air",             price: 25,  stock: 0,  categoryId: audio.id },
    { name: "Bluetooth Speaker",          price: 35,  stock: 12, categoryId: audio.id },
    { name: "Noise-Cancelling Headphones", price: 95, stock: 7,  categoryId: audio.id },
    { name: "Earbuds Pro",                price: 55,  stock: 18, categoryId: audio.id },
    { name: "Soundbar 2.1",               price: 130, stock: 4,  categoryId: audio.id },
  ];

  // "slugify" turns a name like 'Laptop Sleeve 15"' into a URL-safe string
  // ("laptop-sleeve-15") to build the image filename.
  const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  for (const p of products) {
    // { ...p, imageUrl } copies all of p's fields and adds an imageUrl (spread syntax).
    const data = { ...p, imageUrl: `/product-images/${slugify(p.name)}.svg` };
    // findFirst + create keeps the seed idempotent (safe to re-run).
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
      // Already there: just refresh its image path.
      await prisma.product.update({ where: { id: existing.id }, data: { imageUrl: data.imageUrl } });
    } else {
      // New product: insert the full row.
      await prisma.product.create({ data });
    }
  }

  console.log(`Seeded ${products.length} products, ${cats.length} categories, 1 admin.`);
}

// Run main(); if anything throws, log it and exit with an error code.
// .finally always closes the database connection, success or failure.
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
