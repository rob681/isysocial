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

  // ─── Test Client with pre-filled brandKit ────────────────────────────────
  console.log("\n📦 Creating test client with brandKit...");

  // Find or create agency for test client (reuse first found, or create Demo Agency)
  let testAgency = await db.agency.findFirst();
  if (!testAgency) {
    testAgency = await db.agency.upsert({
      where: { slug: "demo-agency" },
      update: {},
      create: {
        name: "Demo Agency",
        slug: "demo-agency",
        planTier: "trial",
        isActive: true,
      },
    });
    console.log(`✅ Created Demo Agency: ${testAgency.name}`);
  } else {
    console.log(`✅ Using existing agency: ${testAgency.name}`);
  }

  const testClientPassword = await bcrypt.hash("demo1234", 12);
  const testClientUser = await db.user.upsert({
    where: { email: "test-cliente@isysocial.local" },
    update: {
      name: "Cliente Demo",
      passwordHash: testClientPassword,
      role: Role.CLIENTE,
      agencyId: testAgency.id,
      isActive: true,
    },
    create: {
      email: "test-cliente@isysocial.local",
      passwordHash: testClientPassword,
      name: "Cliente Demo",
      role: Role.CLIENTE,
      isActive: true,
      agencyId: testAgency.id,
    },
  });
  console.log(`✅ Test Client User: ${testClientUser.email}`);

  const brandKit = {
    brand_name: "Demo Company",
    colors: [
      { label: "Primario", value: "#2563eb", usage: "primary" },
      { label: "Secundario", value: "#10b981", usage: "secondary" },
      { label: "Acento", value: "#f59e0b", usage: "accent" },
    ],
    typography: {
      heading: { family: "Poppins", weights: [600, 700], size: "24px" },
      body: { family: "Inter", weights: [400, 500], size: "16px" },
    },
    mission:
      "Transformar la experiencia digital de nuestros clientes mediante soluciones innovadoras y personalizadas.",
    target_audience:
      "Empresas medianas y grandes en Latinoamérica que buscan digitalizar sus procesos de marketing.",
    brand_values: "Innovación, Confianza, Colaboración, Excelencia",
    tone_of_voice: "profesional",
    tagline: "Tu marca, nuestra pasión",
    do_and_donts:
      "Do: Usar lenguaje claro y profesional. Mantener consistencia visual. Don't: Usar jerga técnica innecesaria. Mezclar estilos visuales.",
  };

  await db.clientProfile.upsert({
    where: { userId: testClientUser.id },
    update: {
      companyName: "Demo Company",
      brandKit: brandKit,
      agencyId: testAgency.id,
      isActive: true,
    },
    create: {
      userId: testClientUser.id,
      agencyId: testAgency.id,
      companyName: "Demo Company",
      brandKit: brandKit,
      isActive: true,
    },
  });
  console.log(`✅ Test ClientProfile with brandKit created for Demo Company`);

  console.log("\n✨ Seed completado!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("  SUPER ADMIN: superadmin@isysocial.com / superadmin123");
  console.log("  ADMIN: admin@brandot.com / admin123");
  console.log("  EDITOR: editor@brandot.com / editor123");
  console.log("  CLIENTE: vandrive@cliente.com / cliente123");
  console.log("  TEST CLIENTE: test-cliente@isysocial.local / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
