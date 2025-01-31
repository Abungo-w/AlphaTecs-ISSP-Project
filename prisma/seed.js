const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Create test modules
  const testModules = [
    {
      title: 'Introduction to Cybersecurity',
      description: 'Learn the basics of cybersecurity and common threats',
      difficulty: 'Beginner',
      duration: 60,
      content: 'Basic cybersecurity concepts and practices'
    },
    {
      title: 'Network Security',
      description: 'Understanding network security fundamentals',
      difficulty: 'Intermediate',
      duration: 90,
      content: 'Network security principles and implementations'
    }
  ];

  for (const module of testModules) {
    await prisma.module.create({
      data: module
    });
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
