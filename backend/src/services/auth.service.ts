import { prisma } from '../config/database';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateTokens } from '../utils/jwt';
import { ApiErrorClass } from '../utils/response';
import { LoginCredentials, RegisterData } from '../types';
import { emailService } from './email.service';
import crypto from 'crypto';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData) {
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
      where: { email: data.email },
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpires,
        isActive: false, // User is inactive until verified
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

    // Send verification email
    await emailService.sendVerificationEmail(user.email!, verificationToken);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user,
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string) {
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

    // Activate user
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
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !user.password) {
      throw new ApiErrorClass(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        401
      );
    }

    // Verify password
    const isValid = await verifyPassword(credentials.password, user.password);

    if (!isValid) {
      throw new ApiErrorClass(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        401
      );
    }

    // Check if user is active
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
}

export const authService = new AuthService();
