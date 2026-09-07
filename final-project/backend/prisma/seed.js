const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const catalog = {
  phones: [["Smartphone X200", 120, 5], ["Smartphone Y10", 85, 8], ["Smartphone Z1", 210, 3], ["Feature Phone F2", 20, 25]],
  computers: [["Laptop Pro 14", 450, 2], ["Laptop Air 13", 380, 4], ["Desktop Tower", 520, 2], ["Monitor 24in", 110, 6]],
  accessories: [["USB-C Charger", 8, 40], ["Phone Case", 5, 30], ["Screen Protector", 3, 50], ["Power Bank 10k", 18, 15], ["USB Cable", 2.5, 60], ["Laptop Bag", 22, 10]],
  audio: [["Headphones Air", 25, 0], ["Bluetooth Speaker", 35, 12], ["Earbuds Mini", 15, 20], ["Microphone USB", 28, 5]],
};

async function main() {
  for (const [catName, products] of Object.entries(catalog)) {
    const category = await prisma.category.upsert({
      where: { name: catName }, update: {}, create: { name: catName },
    });
    for (const [name, price, stock] of products) {
      const exists = await prisma.product.findFirst({ where: { name } });
      if (!exists) await prisma.product.create({ data: { name, price, stock, categoryId: category.id } });
    }
  }

  await prisma.user.upsert({
    where: { email: "admin@sooqonline.local" },
    update: {},
    create: {
      name: "Admin", email: "admin@sooqonline.local",
      passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
    },
  });
  console.log("Seed complete. Admin: admin@sooqonline.local / admin1234");
}

main().catch(console.error).finally(() => prisma.$disconnect());
