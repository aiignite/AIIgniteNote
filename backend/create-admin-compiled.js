const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const adminEmail = 'admin@aiignite.com';
    const adminPassword = 'Admin123456';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        password: hashedPassword,
        isActive: true,
        emailVerified: new Date(),
        settings: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    console.log('✅ 管理员账户创建成功！');
    console.log('📧 邮箱:', user.email);
    console.log('👤 用户名:', user.name);
    console.log('🔑 密码:', adminPassword);
    console.log('🔗 登录地址: http://localhost:3210');
    console.log('');
    console.log('⚠️  安全提示：登录后请立即修改密码！');

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ 错误：该邮箱已存在账户');
    } else {
      console.error('❌ 创建账户失败:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
