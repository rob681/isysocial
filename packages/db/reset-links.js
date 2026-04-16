const { PrismaClient } = require('../../apps/web/generated/prisma');
const crypto = require('crypto');

const db = new PrismaClient();

async function createResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // Invalidate existing tokens
  await db.token.updateMany({
    where: { userId, type: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  });

  // Create new token
  await db.token.create({
    data: {
      token,
      type: 'PASSWORD_RESET',
      userId,
      expiresAt,
    },
  });

  return token;
}

async function main() {
  try {
    // Get user by email
    const user = await db.user.findUnique({
      where: { email: 'social@brandot.mx' },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      console.log('❌ Usuario no encontrado: social@brandot.mx');
      return;
    }

    // Create reset token
    const token = await createResetToken(user.id);

    console.log(`\n🔑 Reset link para ${user.email}:`);
    console.log(`   https://isysocial-web.vercel.app/reset-password?token=${token}`);
    console.log(`   (válido 24 horas)\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
