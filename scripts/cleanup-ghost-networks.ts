import { PrismaClient } from "../apps/web/generated/prisma/index.js";

const db = new PrismaClient();

async function main() {
  const NETWORK_NAMES = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"];

  const ghosts = await db.clientSocialNetwork.findMany({
    where: { pageId: { in: NETWORK_NAMES }, accountName: null },
    select: { id: true, network: true, pageId: true, clientId: true },
  });

  console.log(`Ghost records found: ${ghosts.length}`);
  if (ghosts.length > 0) {
    console.log(JSON.stringify(ghosts, null, 2));

    const deleted = await db.clientSocialNetwork.deleteMany({
      where: { id: { in: ghosts.map((g) => g.id) } },
    });
    console.log(`Deleted: ${deleted.count} ghost records`);
  } else {
    console.log("No ghost records to clean up.");
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
