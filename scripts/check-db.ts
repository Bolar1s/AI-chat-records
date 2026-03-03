import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const message = await prisma.message.findFirst({
    where: {
      content: {
        contains: "时间投入"
      }
    }
  });

  if (message) {
    console.log("--- Message Content Start ---");
    console.log(JSON.stringify(message.content));
    console.log("--- Message Content End ---");
  } else {
    console.log("Message not found");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
