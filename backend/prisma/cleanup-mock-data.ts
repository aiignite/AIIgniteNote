import { PrismaClient, AIProvider } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning up Database Mock Data ---');

  // 1. Delete all AI Conversations and related Messages
  console.log('Deleting AI Conversations and Messages...');
  await prisma.aIMessage.deleteMany({});
  await prisma.aIFavoriteMessage.deleteMany({});
  await prisma.aIConversationTag.deleteMany({});
  await prisma.aIConversation.deleteMany({});

  // 2. Delete all Custom Prompts
  console.log('Deleting Custom Prompts...');
  await prisma.aICustomPrompt.deleteMany({});

  // 3. Delete all AI Assistants
  console.log('Deleting AI Assistants...');
  await prisma.aIAssistant.deleteMany({});

  // 4. Delete all AI Models
  console.log('Deleting AI Models...');
  await prisma.aIModel.deleteMany({});

  // 5. Delete all AI Templates
  console.log('Deleting AI Templates...');
  await prisma.aITemplate.deleteMany({});

  console.log('--- Database Cleanup Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
