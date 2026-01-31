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

  async sendVerificationCode(to: string, code: string) {
    const mailOptions = {
      from: config.emailFrom || config.emailUser,
      to,
      subject: 'AI Ignite Note 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333 text-align: center;">请验证您的邮箱</h2>
          <p>您好，</p>
          <p>您的验证码为：</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 28px; letter-spacing: 8px; font-weight: bold; padding: 12px 24px; border: 1px dashed #4CAF50; border-radius: 8px;">${code}</span>
          </div>
          <p>验证码有效期 10 分钟，请尽快完成验证。</p>
          <p>如非本人操作，请忽略本邮件。</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999 text-align: center;">AI Ignite Note</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification code sent to ${to}`);
    } catch (err) {
      logger.error('Failed to send verification code:', err);
      throw new Error('Could not send verification email. Please try again later.');
    }
  }
}

export const emailService = new EmailService();
