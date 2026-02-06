const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log('User:', user.id, user.email);
  
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secure-jwt-secret-key',
    { expiresIn: '1h' }
  );
  console.log('Token:', token);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
