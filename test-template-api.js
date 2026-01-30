// 测试模板API

const BASE_URL = 'http://localhost:4000';

async function testTemplateAPI() {
  console.log('=== 测试模板API ===\n');

  // 1. 测试获取模板列表（未登录）
  console.log('1. 测试获取模板列表（未登录）...');
  try {
    const response = await fetch(`${BASE_URL}/api/templates`);
    const data = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    console.log('模板数量:', data.data?.length || 0);
    console.log('');
  } catch (err) {
    console.error('错误:', err.message);
  }

  // 2. 测试登录
  console.log('2. 测试登录...');
  let accessToken = '';
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    const data = await response.json();
    console.log('登录状态:', response.status);
    if (data.success) {
      accessToken = data.data.accessToken;
      console.log('登录成功，获取到token');
    } else {
      console.log('登录失败:', data);
    }
    console.log('');
  } catch (err) {
    console.error('错误:', err.message);
  }

  // 3. 测试获取模板列表（已登录）
  if (accessToken) {
    console.log('3. 测试获取模板列表（已登录）...');
    try {
      const response = await fetch(`${BASE_URL}/api/templates`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      console.log('响应状态:', response.status);
      console.log('响应数据:', JSON.stringify(data, null, 2));
      console.log('模板数量:', data.data?.length || 0);
      console.log('');
    } catch (err) {
      console.error('错误:', err.message);
    }

    // 4. 测试创建模板
    console.log('4. 测试创建模板...');
    let newTemplateId = '';
    try {
      const response = await fetch(`${BASE_URL}/api/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: '测试模板',
          description: '这是一个测试模板',
          prompt: '请帮我生成一个测试内容',
          category: 'General',
          icon: 'auto_awesome',
          isPublic: false
        })
      });
      const data = await response.json();
      console.log('响应状态:', response.status);
      console.log('响应数据:', JSON.stringify(data, null, 2));
      if (data.success) {
        newTemplateId = data.data.id;
        console.log('创建成功，模板ID:', newTemplateId);
      }
      console.log('');
    } catch (err) {
      console.error('错误:', err.message);
    }

    // 5. 再次获取模板列表，验证新模板是否存在
    if (newTemplateId) {
      console.log('5. 验证新模板是否在列表中...');
      try {
        const response = await fetch(`${BASE_URL}/api/templates`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const data = await response.json();
        const foundTemplate = data.data?.find(t => t.id === newTemplateId);
        if (foundTemplate) {
          console.log('✓ 新模板已保存到数据库');
          console.log('模板信息:', foundTemplate);
        } else {
          console.log('✗ 新模板未找到');
        }
        console.log('');
      } catch (err) {
        console.error('错误:', err.message);
      }
    }
  }
}

testTemplateAPI().catch(console.error);
