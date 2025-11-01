import { Resend } from 'resend';
import { config } from '@/config/env';
import { logger } from '@/config/logger';

const resend = new Resend(config.email.resendApiKey);

interface ContactEmailData {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

interface NewsletterEmailData {
  email: string;
  verificationToken?: string;
}

export class EmailService {
  async sendContactNotification(data: ContactEmailData): Promise<void> {
    try {
      await resend.emails.send({
        from: config.email.fromEmail,
        to: config.email.adminEmail,
        subject: data.subject
          ? `New Contact: ${data.subject}`
          : `New Contact Form Submission from ${data.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                .content { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #555; }
                .value { margin-top: 5px; }
                .message-box { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0; color: #333;">New Contact Form Submission</h2>
                </div>
                <div class="content">
                  <div class="field">
                    <div class="label">Name:</div>
                    <div class="value">${this.escapeHtml(data.name)}</div>
                  </div>
                  <div class="field">
                    <div class="label">Email:</div>
                    <div class="value">
                      <a href="mailto:${data.email}">${this.escapeHtml(data.email)}</a>
                    </div>
                  </div>
                  ${
                    data.subject
                      ? `
                    <div class="field">
                      <div class="label">Subject:</div>
                      <div class="value">${this.escapeHtml(data.subject)}</div>
                    </div>
                  `
                      : ''
                  }
                  <div class="field">
                    <div class="label">Message:</div>
                    <div class="message-box">
                      ${this.escapeHtml(data.message).replace(/\n/g, '<br>')}
                    </div>
                  </div>
                  <div class="field" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <small style="color: #888;">
                      Received: ${new Date().toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </small>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      logger.info({ email: data.email, name: data.name }, 'Contact notification sent');
    } catch (error) {
      logger.error({ err: error, email: data.email }, 'Failed to send contact notification');
      throw error;
    }
  }

  async sendAutoReply(email: string, name: string, subject?: string): Promise<void> {
    try {
      await resend.emails.send({
        from: config.email.fromEmail,
        to: email,
        subject: 'Thank you for reaching out!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 5px; }
                .content { background-color: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">Thank You!</h1>
                </div>
                <div class="content">
                  <h2>Hello ${this.escapeHtml(name)}!</h2>
                  <p>Thank you for reaching out. I've received your message${subject ? ` regarding "<strong>${this.escapeHtml(subject)}</strong>"` : ''} and appreciate you taking the time to contact me.</p>
                  <p>I'll review your message and get back to you as soon as possible, typically within 24-48 hours.</p>
                  <p>Best regards</p>
                </div>
                <div class="footer">
                  <p>This is an automated response. Please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      logger.info({ email, name }, 'Auto-reply sent');
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to send auto-reply');
      // Don't throw - auto-reply failure shouldn't break the flow
    }
  }

  async sendNewsletterVerification(data: NewsletterEmailData): Promise<void> {
    if (!data.verificationToken) {
      throw new Error('Verification token is required');
    }

    const verificationUrl = `${config.auth.url}/newsletter/verify?token=${data.verificationToken}`;

    try {
      await resend.emails.send({
        from: config.email.fromEmail,
        to: data.email,
        subject: 'Verify your newsletter subscription',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 5px; }
                .content { background-color: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
                .button { display: inline-block; padding: 15px 40px; background-color: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">📧 Verify Your Email</h1>
                </div>
                <div class="content">
                  <h2>Welcome to the Newsletter!</h2>
                  <p>Thank you for subscribing to my newsletter. To complete your subscription, please verify your email address by clicking the button below:</p>
                  <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                  </div>
                  <p style="margin-top: 20px; font-size: 14px; color: #666;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${verificationUrl}">${verificationUrl}</a>
                  </p>
                  <p style="margin-top: 20px; font-size: 14px; color: #666;">
                    This link will expire in 24 hours. If you didn't subscribe to this newsletter, you can safely ignore this email.
                  </p>
                </div>
                <div class="footer">
                  <p>&copy; ${new Date().getFullYear()}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      logger.info({ email: data.email }, 'Newsletter verification email sent');
    } catch (error) {
      logger.error({ err: error, email: data.email }, 'Failed to send newsletter verification');
      throw error;
    }
  }

  async sendNewsletterWelcome(email: string): Promise<void> {
    try {
      await resend.emails.send({
        from: config.email.fromEmail,
        to: email,
        subject: 'Welcome to the Newsletter! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 5px; }
                .content { background-color: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🎉 Welcome Aboard!</h1>
                </div>
                <div class="content">
                  <h2>You're all set!</h2>
                  <p>Thank you for verifying your email and joining the newsletter. You'll now receive updates about:</p>
                  <ul>
                    <li>New blog posts and articles</li>
                    <li>Project launches and updates</li>
                    <li>Tech insights and tutorials</li>
                    <li>Exclusive content and behind-the-scenes</li>
                  </ul>
                  <p>Stay tuned for exciting content!</p>
                </div>
                <div class="footer">
                  <p>You can unsubscribe at any time by clicking the unsubscribe link in any email.</p>
                  <p>&copy; ${new Date().getFullYear()}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      logger.info({ email }, 'Newsletter welcome email sent');
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to send newsletter welcome');
      // Don't throw - welcome email failure shouldn't break the flow
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

export const emailService = new EmailService();
