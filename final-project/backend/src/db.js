// A single shared Prisma client for the whole app. Prisma is our ORM: it turns
// JavaScript method calls (prisma.product.findMany(...)) into SQL queries.
// We create ONE instance and reuse it everywhere so we don't open too many DB connections.
const { PrismaClient } = require("@prisma/client");
module.exports = new PrismaClient();
