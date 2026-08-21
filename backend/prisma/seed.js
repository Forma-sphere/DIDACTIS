const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { email: 'admin@didactys.fr' } });
  if (existing) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash('Admin2024!', 12);

  await prisma.user.create({
    data: {
      email: 'admin@didactys.fr',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Didactys',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('Admin user created: admin@didactys.fr');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
