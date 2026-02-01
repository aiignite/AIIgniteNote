const http = require('http');

// 测试创建模型
async function testCreateModel() {
  try {
    // 登录
    console.log('1. 登录...');
    const loginData = JSON.stringify({
      email: 'admin@aiignite.com',
      password: 'Admin123456'
    });
    
    const token = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3215,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          resolve(json.data.accessToken);
        });
      });
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });
    
    console.log('✅ 登录成功');
    
    // 创建模型
    console.log('\n2. 创建AI模型（defaultTemplateId为空字符串）...');
    const modelData = JSON.stringify({
      name: "测试Llama模型",
      modelId: "llama-3.2",
      provider: "OLLAMA",
      description: "本地Llama模型",
      speed: "Fast",
      cost: "Free",
      context: "128K",
      popularity: 75,
      defaultTemplateId: ""
    });
    
    const result = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3215,
        path: '/api/ai/models',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(modelData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      });
      req.on('error', reject);
      req.write(modelData);
      req.end();
    });
    
    console.log('\n结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ 模型创建成功！');
    } else {
      console.log('\n❌ 模型创建失败');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testCreateModel();
