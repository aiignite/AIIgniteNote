import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const assistants = await prisma.aIAssistant.findMany({
    select: { id: true, name: true, isSystem: true, category: true }
  });
  
  console.log(`找到 ${assistants.length} 个助手:`);
  assistants.forEach(a => {
    console.log(`  - ${a.name} (${a.category}, 系统: ${a.isSystem})`);
  });
  
  await prisma.$disconnect();
}

test().catch(console.error);
