import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { emailService } from '@/services/email.service';

import { getPaginationParams, calculatePagination } from '@/utils/pagination';

export class ContactController {
  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, message } = req.body;

      const contact = await prisma.contact.create({
        data: { name, email, message },
      });

      // Send emails asynchronously (don't wait)
      emailService.sendContactNotification({ name, email, message }).catch((err) => {
        console.error('Failed to send notification:', err);
      });

      emailService.sendAutoReply(email, name).catch((err) => {
        console.error('Failed to send auto-reply:', err);
      });

      res.status(201).json({
        success: true,
        data: { id: contact.id },
        message: 'Message sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = getPaginationParams(
        req.query.page as string,
        req.query.limit as string
      );
      const unreadOnly = req.query.unread === 'true';

      const where = unreadOnly ? { read: false } : {};

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contact.count({ where }),
      ]);

      res.json({
        success: true,
        data: contacts,
        pagination: calculatePagination(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const contact = await prisma.contact.update({
        where: { id },
        data: { read: true },
      });

      res.json({
        success: true,
        data: contact,
        message: 'Message marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await prisma.contact.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Contact message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();
