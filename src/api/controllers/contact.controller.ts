import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { emailService } from '@/services/email.service';
import { NotFoundError } from '@/utils/errors';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';

export class ContactController {
  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, subject, message } = req.body;

      const contact = await prisma.contact.create({
        data: {
          name,
          email,
          subject,
          message,
        },
      });

      // Send emails asynchronously (don't wait)
      emailService.sendContactNotification({ name, email, subject, message }).catch((err) => {
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
      const unrepliedOnly = req.query.unreplied === 'true';

      const where: { read?: boolean; replied?: boolean } = {};

      if (unreadOnly) {
        where.read = false;
      }

      if (unrepliedOnly) {
        where.replied = false;
      }

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

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const contact = await prisma.contact.findUnique({ where: { id } });
      if (!contact) {
        throw new NotFoundError('Contact message not found');
      }

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const existing = await prisma.contact.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Contact message not found');
      }

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

  async markAsReplied(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const existing = await prisma.contact.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Contact message not found');
      }

      const contact = await prisma.contact.update({
        where: { id },
        data: {
          replied: true,
          repliedAt: new Date(),
          notes: notes || existing.notes,
          read: true, // Mark as read when replying
        },
      });

      res.json({
        success: true,
        data: contact,
        message: 'Message marked as replied',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const existing = await prisma.contact.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Contact message not found');
      }

      const contact = await prisma.contact.update({
        where: { id },
        data: { notes },
      });

      res.json({
        success: true,
        data: contact,
        message: 'Notes updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const contact = await prisma.contact.findUnique({ where: { id } });
      if (!contact) {
        throw new NotFoundError('Contact message not found');
      }

      await prisma.contact.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Contact message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const [total, unread, unreplied] = await Promise.all([
        prisma.contact.count(),
        prisma.contact.count({ where: { read: false } }),
        prisma.contact.count({ where: { replied: false } }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          unread,
          unreplied,
          read: total - unread,
          replied: total - unreplied,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();
