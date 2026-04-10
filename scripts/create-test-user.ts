/**
 * Script: create-test-user.ts
 * Creates a review/test ADMIN user for Isysocial.
 *
 * Run from monorepo root:
 *   pnpm tsx scripts/create-test-user.ts
 */

import { PrismaClient, Role } from "../apps/web/generated/prisma";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Creating test user: review@isysocial.com ...");

  // Find an existing agency to attach the ADMIN user to, or create a fallback.
  let agency = await db.agency.findFirst({ where: { isActive: true } });

  if (!agency) {
    console.log("No active agency found — creating a fallback agency...");
    agency = await db.agency.upsert({
      where: { slug: "review-agency" },
      update: {},
      create: {
        name: "Review Agency",
        slug: "review-agency",
        planTier: "professional",
        isActive: true,
      },
    });
    console.log(`Agency created: ${agency.name} (${agency.id})`);
  } else {
    console.log(`Using existing agency: ${agency.name} (${agency.id})`);
  }

  const passwordHash = await bcrypt.hash("MetaReview2025!", 12);

  const user = await db.user.upsert({
    where: { email: "review@isysocial.com" },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      agencyId: agency.id,
    },
    create: {
      email: "review@isysocial.com",
      passwordHash,
      name: "Review Admin",
      role: Role.ADMIN,
      isActive: true,
      agencyId: agency.id,
    },
  });

  console.log("\nUser created/updated successfully:");
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Role:  ${user.role}`);
  console.log(`  Agency: ${agency.name} (${agency.id})`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
