const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  // 1. Categories
  const cats = ["phones", "computers", "accessories", "audio"];
  for (const name of cats) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Admin user
  await prisma.user.upsert({
    where: { email: "admin@sooqonline.local" },
    update: {},
    create: {
      name: "Admin", email: "admin@sooqonline.local",
      passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
    },
  });

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

  for (const p of products) {
    // findFirst + create keeps the seed idempotent (safe to re-run).
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }

  console.log(`Seeded ${products.length} products, ${cats.length} categories, 1 admin.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
