import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Invalid role. Must be USER or ADMIN' }),
  }),
});

export const banUserSchema = z.object({
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});
