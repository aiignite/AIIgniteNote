const axios = require('axios');

async function testAssistants() {
  try {
    // 登录
    const loginRes = await axios.post('http://localhost:3215/api/auth/login', {
      email: 'admin@aiignite.com',
      password: 'Admin123456'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('✅ 登录成功');
    
    // 获取assistants
    const assistantsRes = await axios.get('http://localhost:3215/api/ai-assistants', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n📋 AI助手列表:');
    console.log('系统助手:', assistantsRes.data.data.system.length);
    console.log('自定义助手:', assistantsRes.data.data.custom.length);
    
    if (assistantsRes.data.data.system.length > 0) {
      console.log('\n系统助手:');
      assistantsRes.data.data.system.forEach(a => {
        console.log(`  - ${a.name} (${a.category})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
  }
}

testAssistants();
