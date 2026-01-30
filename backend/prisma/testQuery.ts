import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const where = {
    isActive: true,
    userId: null,
    isPublic: true,
  };
  console.log('查询条件:', JSON.stringify(where, null, 2));
  
  const templates = await prisma.aITemplate.findMany({ where });
  console.log('查询结果数量:', templates.length);
  console.log('模板名称:', templates.map(t => t.name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
