import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/utils/password';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const email = 'admin@aiignite.com';
    const newPassword = 'Admin123456';

    const hashedPassword = await hashPassword(newPassword);

    const user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        isActive: true,
        emailVerified: new Date(),
      },
      select: {
        email: true,
        name: true,
        isActive: true,
      },
    });

    console.log('✅ 密码重置成功！');
    console.log('📧 邮箱:', user.email);
    console.log('👤 用户名:', user.name);
    console.log('🔑 新密码:', newPassword);
    console.log('');
    console.log('⚠️  安全提示：登录后请立即修改密码！');

  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error('❌ 错误：未找到该邮箱的账户');
    } else {
      console.error('❌ 重置密码失败:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
