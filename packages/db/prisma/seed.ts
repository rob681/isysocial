import { PrismaClient, Role } from "../../../apps/web/generated/prisma";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Isysocial database...");

  // Create SUPER_ADMIN
  const superAdminPassword = await bcrypt.hash("superadmin123", 12);
  const superAdmin = await db.user.upsert({
    where: { email: "superadmin@isysocial.com" },
    update: {},
    create: {
      email: "superadmin@isysocial.com",
      passwordHash: superAdminPassword,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // Create demo Agency
  const agency = await db.agency.upsert({
    where: { slug: "brandot-demo" },
    update: {},
    create: {
      name: "Brandot Agency",
      slug: "brandot-demo",
      planTier: "professional",
      isActive: true,
    },
  });
  console.log(`✅ Agency: ${agency.name}`);

  // Create Agency ADMIN
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@brandot.com" },
    update: {},
    create: {
      email: "admin@brandot.com",
      passwordHash: adminPassword,
      name: "Admin Brandot",
      role: Role.ADMIN,
      isActive: true,
      agencyId: agency.id,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Create Editor
  const editorPassword = await bcrypt.hash("editor123", 12);
  const editor = await db.user.upsert({
    where: { email: "editor@brandot.com" },
    update: {},
    create: {
      email: "editor@brandot.com",
      passwordHash: editorPassword,
      name: "Editor Demo",
      role: Role.EDITOR,
      isActive: true,
      agencyId: agency.id,
      editorProfile: {
        create: {
          permissions: JSON.stringify([
            "CREATE_POSTS",
            "EDIT_POSTS",
            "MANAGE_IDEAS",
          ]),
        },
      },
    },
  });
  console.log(`✅ Editor: ${editor.email}`);

  // Create demo Client user
  const clientPassword = await bcrypt.hash("cliente123", 12);
  const clientUser = await db.user.upsert({
    where: { email: "vandrive@cliente.com" },
    update: {},
    create: {
      email: "vandrive@cliente.com",
      passwordHash: clientPassword,
      name: "VanDrive Marketing",
      role: Role.CLIENTE,
      isActive: true,
      agencyId: agency.id,
      clientProfile: {
        create: {
          agencyId: agency.id,
          companyName: "VanDrive",
          brandColors: { primary: "#1a73e8", secondary: "#34a853" },
          isActive: true,
        },
      },
    },
  });
  console.log(`✅ Cliente: ${clientUser.email}`);

  // Add social networks to client
  const clientProfile = await db.clientProfile.findUnique({
    where: { userId: clientUser.id },
  });

  if (clientProfile) {
    await db.clientSocialNetwork.createMany({
      data: [
        {
          clientId: clientProfile.id,
          network: "FACEBOOK",
          accountName: "VanDrive Oficial",
          isActive: true,
        },
        {
          clientId: clientProfile.id,
          network: "INSTAGRAM",
          accountName: "@vandrive.mx",
          isActive: true,
        },
        {
          clientId: clientProfile.id,
          network: "LINKEDIN",
          accountName: "VanDrive México",
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });
    console.log(`✅ Redes sociales asignadas a VanDrive`);
  }

  console.log("\n✨ Seed completado!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("  SUPER ADMIN: superadmin@isysocial.com / superadmin123");
  console.log("  ADMIN: admin@brandot.com / admin123");
  console.log("  EDITOR: editor@brandot.com / editor123");
  console.log("  CLIENTE: vandrive@cliente.com / cliente123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
