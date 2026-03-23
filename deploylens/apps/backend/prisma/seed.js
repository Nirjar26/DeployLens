"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const password_hash = await bcrypt_1.default.hash("demo1234", 12);
    const user = await prisma.user.upsert({
        where: { email: "demo@deploylens.dev" },
        update: {
            name: "Demo User",
            password_hash,
        },
        create: {
            name: "Demo User",
            email: "demo@deploylens.dev",
            password_hash,
        },
    });
    console.log("Seed complete.");
    console.log("Login credentials:");
    console.log(`email: ${user.email}`);
    console.log("password: demo1234");
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
