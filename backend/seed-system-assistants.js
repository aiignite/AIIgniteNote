const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initializeSystemAssistants() {
  try {
    console.log('🚀 开始初始化系统助手...');

    // 检查是否已有系统助手
    const existingSystemAssistants = await prisma.aIAssistant.findMany({
      where: { isSystem: true }
    });

    if (existingSystemAssistants.length > 0) {
      console.log('✅ 系统助手已存在，跳过初始化');
      console.log('现有系统助手:', existingSystemAssistants.map(a => a.name));
      return;
    }

    // 获取第一个可用模型
    const firstModel = await prisma.aIModel.findFirst();
    const defaultModel = firstModel?.modelId || 'glm-4.7';

    console.log(`使用默认模型: ${defaultModel}`);

    // 创建默认系统助手
    const systemAssistants = [
      {
        name: 'AI 助手',
        description: '您的全能AI助手，可以帮助您完成各种任务',
        avatar: 'smart_toy',
        role: 'General Assistant',
        category: 'General',
        systemPrompt: '你是一个友好、专业且乐于助人的AI助手。你可以帮助用户完成写作、编程、分析等各种任务。请用清晰、简洁的方式回答问题。',
        model: defaultModel,
        isSystem: true,
      },
      {
        name: '写作助手',
        description: '专业的写作助手，帮助您撰写各类文档',
        avatar: 'edit_note',
        role: 'Writing Assistant',
        category: 'Writing',
        systemPrompt: '你是一个专业的写作助手，擅长帮助用户撰写各类文档，包括文章、报告、邮件等。你的语言优美、结构清晰，能够根据不同场景调整写作风格。',
        model: defaultModel,
        isSystem: true,
      },
      {
        name: '编程助手',
        description: '专业的编程助手，帮助您解决编程问题',
        avatar: 'code',
        role: 'Programming Assistant',
        category: 'Development',
        systemPrompt: '你是一个专业的编程助手，精通多种编程语言和技术栈。你可以帮助用户编写代码、调试程序、解释代码逻辑、优化性能等。请提供清晰、可运行的代码示例，并解释关键点。',
        model: defaultModel,
        isSystem: true,
      },
      {
        name: '学习助手',
        description: '耐心的学习助手，帮助您理解各种概念',
        avatar: 'school',
        role: 'Learning Assistant',
        category: 'Education',
        systemPrompt: '你是一个耐心的学习助手，擅长用通俗易懂的方式解释复杂的概念。你会使用类比、举例等方式帮助用户理解，并鼓励用户提出更多问题。',
        model: defaultModel,
        isSystem: true,
      },
      {
        name: '创意助手',
        description: '富有创意的助手，帮助您头脑风暴',
        avatar: 'lightbulb',
        role: 'Creative Assistant',
        category: 'Brainstorming',
        systemPrompt: '你是一个富有创意的助手，擅长头脑风暴和创意思考。你可以提供新颖的想法、不同角度的思考，帮助用户突破思维定式。',
        model: defaultModel,
        isSystem: true,
      },
    ];

    // 创建系统助手
    for (const assistant of systemAssistants) {
      await prisma.aIAssistant.create({
        data: assistant,
      });
      console.log(`✅ 创建系统助手: ${assistant.name}`);
    }

    console.log(`\n🎉 成功初始化 ${systemAssistants.length} 个系统助手！`);

  } catch (error) {
    console.error('❌ 初始化系统助手失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeSystemAssistants();
