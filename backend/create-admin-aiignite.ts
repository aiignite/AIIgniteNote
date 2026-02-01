import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/utils/password';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const adminEmail = 'admin@aiignite.com';
    const adminPassword = 'Admin123456';

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      console.log('⚠️  用户已存在，正在更新密码...');
      const hashedPassword = await hashPassword(adminPassword);
      
      await prisma.user.update({
        where: { email: adminEmail },
        data: { 
          password: hashedPassword,
          isActive: true,
          emailVerified: new Date(),
        },
      });
      
      console.log('✅ 密码已更新！');
    } else {
      const hashedPassword = await hashPassword(adminPassword);

      const user = await prisma.user.create({
        data: {
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

      console.log('✅ 管理员账户创建成功！');
    }

    console.log('');
    console.log('======================');
    console.log('📧 邮箱: admin@aiignite.com');
    console.log('🔑 密码: Admin123456');
    console.log('🔗 登录地址: http://localhost:3210');
    console.log('======================');
    console.log('');

  } catch (error: any) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
