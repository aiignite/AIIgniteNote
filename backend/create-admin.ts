import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/utils/password';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const adminEmail = 'admin@aiignite.com';
    // 更新默认密码（请登录后立即修改）
    const adminPassword = 'Admin123456';

    const hashedPassword = await hashPassword(adminPassword);

    // 使用 upsert 确保用户存在且密码最新
    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        name: 'Admin User',
        isActive: true,
        emailVerified: new Date(),
      },
      create: {
        email: adminEmail,
        name: 'Admin User',
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

    console.log('✅ 管理员账户同步成功！');
    console.log('📧 邮箱:', user.email);
    console.log('👤 用户名:', user.name);
    console.log('🔑 密码:', adminPassword);
    console.log('🔗 登录地址: http://localhost:3200');
    console.log('');
    console.log('⚠️  安全提示：登录后请立即修改密码！');

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ 错误：该邮箱已存在账户');
      console.log('提示：如需重置密码，请运行: npm run reset-password');
    } else {
      console.error('❌ 创建账户失败:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
