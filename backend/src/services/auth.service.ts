import { prisma } from '../config/database';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateTokens } from '../utils/jwt';
import { ApiErrorClass } from '../utils/response';
import { LoginCredentials, RegisterData } from '../types';
import { emailService } from './email.service';
import { config } from '../config';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const isDev = process.env.NODE_ENV === 'development';

// Check if email service is configured
function isEmailServiceConfigured(): boolean {
  return !!(config.emailHost && config.emailUser && config.emailPass);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.warn('Database connection failed:', error);
    return false;
  }
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData) {
    const normalizedEmail = normalizeEmail(data.email);

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new ApiErrorClass(
        'WEAK_PASSWORD',
        passwordValidation.errors.join(', '),
        400
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ApiErrorClass(
        'EMAIL_EXISTS',
        'An account with this email already exists',
        409
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Check if email verification is required
    const emailConfigured = isEmailServiceConfigured();
    const skipVerification = isDev || !emailConfigured;

    const verificationToken = generateVerificationCode();
    const verificationTokenExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name,
        password: hashedPassword,
        verificationToken: skipVerification ? null : verificationToken,
        verificationTokenExpires: skipVerification ? null : verificationTokenExpires,
        emailVerified: skipVerification ? new Date() : null,
        isActive: skipVerification,
        settings: {
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (skipVerification) {
      return {
        message: '注册成功，您现在可以登录了。',
        user,
      };
    }

    await emailService.sendVerificationCode(user.email!, verificationToken);

    return {
      message: '注册成功，验证码已发送至邮箱，请在10分钟内完成验证。',
      user,
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string) {
    return this.verifyCodeWithToken(token);
  }

  async verifyCode(email: string, code: string) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.verificationToken || !user.verificationTokenExpires) {
      throw new ApiErrorClass('INVALID_TOKEN', '验证码不存在或已过期', 400);
    }

    if (user.verificationToken !== normalizedCode || user.verificationTokenExpires < new Date()) {
      throw new ApiErrorClass('INVALID_TOKEN', '验证码错误或已过期', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return { message: '邮箱验证成功，现在可以登录。' };
  }

  async resendVerificationCode(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new ApiErrorClass('USER_NOT_FOUND', '用户不存在', 404);
    }

    if (user.emailVerified) {
      throw new ApiErrorClass('ALREADY_VERIFIED', '邮箱已验证，无需重复发送', 400);
    }

    const verificationToken = generateVerificationCode();
    const verificationTokenExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpires },
    });

    await emailService.sendVerificationCode(user.email!, verificationToken);

    return { message: '验证码已重新发送，请在10分钟内使用。' };
  }

  private async verifyCodeWithToken(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new ApiErrorClass(
        'INVALID_TOKEN',
        'Invalid or expired verification token',
        400
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return {
      message: 'Email verified successfully. You can now log in.',
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials) {
    // Check database connection first
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      throw new ApiErrorClass(
        'DATABASE_UNAVAILABLE',
        'Database is not configured. Please set up PostgreSQL database or use Docker.',
        503
      );
    }

    const normalizedEmail = normalizeEmail(credentials.email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      throw new ApiErrorClass(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        401
      );
    }

    const isValid = await verifyPassword(credentials.password, user.password);

    if (!isValid) {
      throw new ApiErrorClass(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        401
      );
    }

    if (!user.emailVerified) {
      throw new ApiErrorClass(
        'EMAIL_NOT_VERIFIED',
        '请先完成邮箱验证',
        403
      );
    }

    if (!user.isActive) {
      throw new ApiErrorClass(
        'ACCOUNT_DISABLED',
        'Your account has been disabled',
        403
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiErrorClass(
        'USER_NOT_FOUND',
        'User not found',
        404
      );
    }

    if (!user.emailVerified) {
      throw new ApiErrorClass(
        'EMAIL_NOT_VERIFIED',
        '请先完成邮箱验证',
        403
      );
    }

    if (!user.isActive) {
      throw new ApiErrorClass(
        'ACCOUNT_DISABLED',
        'Your account has been disabled',
        403
      );
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(userId: string) {
    // Delete all sessions for the user
    await prisma.session.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        isActive: true,
        settings: true,
      },
    });

    if (!user) {
      throw new ApiErrorClass(
        'USER_NOT_FOUND',
        'User not found',
        404
      );
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string; image?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string) {
    // Delete user (cascade will handle most relations like sessions, notes, etc. based on schema)
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  }

  /**
   * Get user AI settings
   */
  async getAISettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Create settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          aiProviderSettings: this.getDefaultAISettings(),
        },
      });
    }

    // Return AI settings in frontend format
    return {
      defaultProvider: settings.defaultAIProvider || 'GEMINI',
      defaultModel: settings.defaultAIModel || 'gemini-2.0-flash-exp',
      providers: settings.aiProviderSettings as any || this.getDefaultAISettings(),
    };
  }

  /**
   * Update user AI settings
   */
  async updateAISettings(userId: string, data: any) {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        defaultAIProvider: data.defaultProvider,
        defaultAIModel: data.defaultModel,
        aiProviderSettings: data.providers || this.getDefaultAISettings(),
      },
      update: {
        defaultAIProvider: data.defaultProvider,
        defaultAIModel: data.defaultModel,
        aiProviderSettings: data.providers || this.getDefaultAISettings(),
      },
    });

    return {
      defaultProvider: settings.defaultAIProvider || 'GEMINI',
      defaultModel: settings.defaultAIModel || 'gemini-2.0-flash-exp',
      providers: settings.aiProviderSettings as any || this.getDefaultAISettings(),
    };
  }

  /**
   * Get default AI settings
   */
  private getDefaultAISettings() {
    return {
      google: {
        provider: 'GEMINI',
        apiKey: '',
        enabled: true,
        models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
      },
      anthropic: {
        provider: 'ANTHROPIC',
        apiKey: '',
        enabled: false,
        models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
      },
      openai: {
        provider: 'OPENAI',
        apiKey: '',
        enabled: false,
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      },
      ollama: {
        provider: 'OLLAMA',
        apiKey: '',
        enabled: false,
        url: 'http://localhost:11434',
        models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3'],
      },
      lmstudio: {
        provider: 'LMSTUDIO',
        apiKey: '',
        enabled: false,
        url: 'http://localhost:1234',
        models: ['local-model'],
      },
    };
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Create settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          aiProviderSettings: this.getDefaultAISettings(),
        },
      });
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, data: any) {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
        aiProviderSettings: this.getDefaultAISettings(),
      },
      update: data,
    });

    return settings;
  }
}

export const authService = new AuthService();
