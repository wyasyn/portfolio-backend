import type { Role } from '@prisma/client';

declare module 'better-auth' {
  interface User {
    // Custom fields only - Better Auth handles the base fields
    role?: Role | string;
    lastLoginAt?: Date | null;
    isActive?: boolean;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: Date | null;
  }
}

export {};
