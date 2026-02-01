#!/bin/bash

# 创建默认管理员用户
# 邮箱: admin@aiignite.com
# 密码: Admin123456

docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDefaultUser() {
  try {
    const email = 'admin@aiignite.com';
    const password = 'Admin123456';
    
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  用户已存在，正在更新密码...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          isActive: true,
          emailVerified: new Date(),
          name: 'Admin User'
        }
      });
      
      console.log('✅ 密码已更新！');
    } else {
      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Admin User',
          isActive: true,
          emailVerified: new Date()
        }
      });
      
      console.log('✅ 管理员用户创建成功！');
    }

    console.log('');
    console.log('======================');
    console.log('📧 邮箱: admin@aiignite.com');
    console.log('🔑 密码: Admin123456');
    console.log('🔗 登录地址: http://localhost:3210');
    console.log('======================');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createDefaultUser();
"
