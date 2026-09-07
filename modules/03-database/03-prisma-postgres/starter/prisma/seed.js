const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const cats = ["phones", "computers", "accessories", "audio"];
  for (const name of cats) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.user.upsert({
    where: { email: "admin@sooqonline.local" },
    update: {},
    create: {
      name: "Admin", email: "admin@sooqonline.local",
      passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
    },
  });

  // TODO 5: seed your 20 products (look up category ids first with findUnique)
}

main().finally(() => prisma.$disconnect());
