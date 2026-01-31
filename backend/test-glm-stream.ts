import Anthropic from '@anthropic-ai/sdk';

async function testGLMStream() {
  // 从环境变量或硬编码获取API key
  const apiKey = process.env.GLM_API_KEY || 'your-api-key-here';
  const baseURL = 'https://open.bigmodel.cn/api/anthropic';
  
  const client = new Anthropic({
    apiKey,
    baseURL,
  });

  console.log('Testing GLM stream...');
  console.log('BaseURL:', baseURL);
  console.log('Model: glm-4.7');

  try {
    const stream = await client.messages.create({
      model: 'glm-4.7',
      max_tokens: 100,
      messages: [
        { role: 'user', content: '你好' }
      ],
      stream: true,
    });

    console.log('Stream created, iterating...');

    let eventCount = 0;
    for await (const event of stream) {
      eventCount++;
      console.log(`Event #${eventCount}:`, JSON.stringify(event, null, 2));
      
      if (eventCount > 20) {
        console.log('Stopping after 20 events for brevity...');
        break;
      }
    }

    console.log('Stream complete. Total events:', eventCount);
  } catch (error) {
    console.error('Error:', error);
  }
}

testGLMStream();
