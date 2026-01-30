/**
 * AI Chat API 测试脚本
 *
 * 使用方法:
 * 1. 启动后端服务器
 * 2. 登录获取 token (或手动设置)
 * 3. 运行此脚本: node test-ai-chat.js
 */

const API_BASE = 'http://localhost:4000';
let authToken = ''; // 需要先登录获取

// 测试用户凭据（如果需要）
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

/**
 * 登录获取认证 token
 */
async function login() {
  console.log('🔐 登录中...');

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.data.accessToken;
    console.log('✅ 登录成功！');
    return true;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    console.log('💡 提示: 请确保测试用户存在，或手动设置 authToken');
    return false;
  }
}

/**
 * 测试 AI 聊天功能
 */
async function testChat() {
  console.log('\n🤖 测试 AI 聊天...');

  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        provider: 'GOOGLE',
        model: 'gemini-2.0-flash-exp',
        messages: [
          {
            role: 'user',
            content: 'Hello, can you help me?'
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ 聊天请求失败:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ 聊天响应成功！');
    console.log('📝 响应内容:', data.data.content?.substring(0, 100) + '...');
    console.log('💬 对话 ID:', data.data.conversationId);
    console.log('🎭 使用 Mock:', data.data.usingMockProvider ? '是' : '否');
    return true;
  } catch (error) {
    console.error('❌ 聊天测试失败:', error.message);
    return false;
  }
}

/**
 * 测试获取对话列表
 */
async function testGetConversations() {
  console.log('\n📚 测试获取对话列表...');

  try {
    const response = await fetch(`${API_BASE}/api/ai/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ 获取对话失败:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ 获取对话列表成功！');
    console.log('📊 对话数量:', data.data.length);

    if (data.data.length > 0) {
      console.log('💬 最新的对话:');
      data.data.slice(0, 3).forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.title} (${new Date(conv.updatedAt).toLocaleString()})`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ 获取对话列表失败:', error.message);
    return false;
  }
}

/**
 * 测试获取单个对话
 */
async function testGetConversation(conversationId) {
  console.log('\n📖 测试获取对话详情...');

  try {
    const response = await fetch(`${API_BASE}/api/ai/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ 获取对话详情失败:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ 获取对话详情成功！');
    console.log('💬 对话标题:', data.data.title);
    console.log('📨 消息数量:', data.data.messages.length);

    data.data.messages.forEach((msg, index) => {
      const preview = msg.content.substring(0, 50);
      console.log(`   ${index + 1}. [${msg.role}]: ${preview}...`);
    });

    return true;
  } catch (error) {
    console.error('❌ 获取对话详情失败:', error.message);
    return false;
  }
}

/**
 * 测试删除对话
 */
async function testDeleteConversation(conversationId) {
  console.log('\n🗑️  测试删除对话...');

  try {
    const response = await fetch(`${API_BASE}/api/ai/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ 删除对话失败:', response.status, error);
      return false;
    }

    console.log('✅ 删除对话成功！');
    return true;
  } catch (error) {
    console.error('❌ 删除对话失败:', error.message);
    return false;
  }
}

/**
 * 测试获取 AI 提供商列表
 */
async function testGetProviders() {
  console.log('\n🔧 测试获取 AI 提供商...');

  try {
    const response = await fetch(`${API_BASE}/api/ai/providers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ 获取提供商失败:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ 获取提供商成功！');
    console.log('🔌 可用的提供商:');
    data.data.providers.forEach(provider => {
      console.log(`   - ${provider.name} (需要 API Key: ${provider.requiresApiKey})`);
    });

    console.log('\n⚙️ 用户配置:');
    console.log(`   Google Gemini: ${data.data.userConfigured.gemini ? '✅' : '❌'}`);
    console.log(`   Anthropic Claude: ${data.data.userConfigured.anthropic ? '✅' : '❌'}`);
    console.log(`   OpenAI GPT: ${data.data.userConfigured.openai ? '✅' : '❌'}`);
    console.log(`   Ollama: ${data.data.userConfigured.ollama ? '✅' : '❌'}`);
    console.log(`   LM Studio: ${data.data.userConfigured.lmstudio ? '✅' : '❌'}`);

    return true;
  } catch (error) {
    console.error('❌ 获取提供商失败:', error.message);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('🚀 开始 AI Chat 功能测试...\n');
  console.log('=' .repeat(50));

  // 如果没有 token，尝试登录
  if (!authToken) {
    const loggedIn = await login();
    if (!loggedIn) {
      console.log('\n⚠️  无法自动登录。');
      console.log('💡 请手动设置 authToken 变量或创建测试用户');
      return;
    }
  }

  // 测试获取提供商
  await testGetProviders();

  // 测试聊天功能
  const chatSuccess = await testChat();

  // 如果聊天成功，测试其他功能
  if (chatSuccess) {
    // 等待一下确保数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试获取对话列表
    const conversationsSuccess = await testGetConversations();

    if (conversationsSuccess) {
      // 获取第一个对话的详情
      const getConvResponse = await fetch(`${API_BASE}/api/ai/conversations`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const convData = await getConvResponse.json();

      if (convData.data && convData.data.length > 0) {
        const firstConvId = convData.data[0].id;
        await testGetConversation(firstConvId);

        // 注意: 不删除，保留用于测试
        // await testDeleteConversation(firstConvId);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ 测试完成！');
}

// 运行测试
runTests().catch(console.error);
