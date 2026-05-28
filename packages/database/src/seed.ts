import { prisma } from './index.js';

// Simple seed script for development
async function main() {
  console.log('Seeding database...');

  // Check if users exist
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already seeded');
    return;
  }

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@forensiq.local',
      name: 'Admin User',
      password: 'admin123', // TODO: Hash in production
      role: 'ADMIN',
    },
  });

  // Create auditor
  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@forensiq.local',
      name: 'Auditor User',
      password: 'auditor123', // TODO: Hash in production
      role: 'AUDITOR',
    },
  });

  console.log(`Created users: ${admin.email}, ${auditor.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });