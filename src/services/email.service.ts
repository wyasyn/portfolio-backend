import { Resend } from 'resend';
import { config } from '@/config/env';
import { logger } from '@/config/logger';

const resend = new Resend(config.email.resendApiKey);

export class EmailService {
  async sendContactNotification(data: {
    name: string;
    email: string;
    message: string;
  }): Promise<void> {
    try {
      await resend.emails.send({
        from: config.email.fromEmail,
        to: config.email.adminEmail,
        subject: `New Contact Form Submission from ${data.name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        `,
      });
      logger.info(`Contact notification sent for ${data.email}`);
    } catch (error) {
      logger.error('Failed to send contact notification:', error);
      throw error;
    }
  }

  async sendAutoReply(email: string, name: string): Promise<void> {
    try {
      await resend.emails.send({
        from: config.email.fromEmail,
        to: email,
        subject: 'Thank you for reaching out!',
        html: `
          <h2>Hello ${name}!</h2>
          <p>Thank you for getting in touch. I've received your message and will get back to you as soon as possible.</p>
          <p>Best regards,<br>Your Portfolio Team</p>
        `,
      });
      logger.info(`Auto-reply sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send auto-reply:', error);
    }
  }
}

export const emailService = new EmailService();
