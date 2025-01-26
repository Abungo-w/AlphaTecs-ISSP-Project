const { PrismaClient } = require("@prisma/client");
let db = new PrismaClient();

module.exports = { db };