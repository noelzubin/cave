import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const notesDeck = await prisma.reviseDecks.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "notes" },
  });
  console.log(notesDeck);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
