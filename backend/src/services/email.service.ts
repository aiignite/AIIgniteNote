import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort,
      secure: config.emailPort === 465, // true for 465, false for other ports
      auth: {
        user: config.emailUser,
        pass: config.emailPass,
      },
    });
  }

  /**
   * Send verification email to new user
   */
  async sendVerificationEmail(to: string, token: string) {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: config.emailFrom || config.emailUser,
      to,
      subject: '请验证您的电子邮箱 - AI Ignite Note',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333 text-align: center;">欢迎加入 AI Ignite Note!</h2>
          <p>您好，</p>
          <p>感谢您注册我们的服务。请点击下面的按钮验证您的电子邮箱并激活您的账户：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">验证邮箱</a>
          </div>
          <p>或者您可以复制并粘贴以下链接到您的浏览器：</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>此链接将在 24 小时后过期。</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999 text-align: center;">如果您没有注册此账户，请忽略此邮件。</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${to}`);
    } catch (err) {
      logger.error('Failed to send verification email:', err);
      throw new Error('Could not send verification email. Please try again later.');
    }
  }
}

export const emailService = new EmailService();
