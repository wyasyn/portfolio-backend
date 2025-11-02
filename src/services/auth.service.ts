import { prisma } from '@/db/prisma';
import { auth } from '@/utils/auth';
import { Role } from '@prisma/client';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingHttpHeaders } from 'http';

export class AuthService {
  /**
   * Create a new user with Better Auth
   */
  async createUser(email: string, password: string, name: string, role: Role = 'USER') {
    // Better Auth handles user creation through its API
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    // Update role if needed (Better Auth creates users with default role)
    if (role !== 'USER') {
      await prisma.user.update({
        where: { id: user.user.id },
        data: { role },
      });
    }

    return {
      id: user.user.id,
      email: user.user.email,
      name: user.user.name,
      role: role,
      createdAt: user.user.createdAt,
    };
  }

  /**
   * Login user with Better Auth
   */
  async login(email: string, password: string) {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!result.user) {
      throw new Error('Invalid credentials');
    }

    // Get full user data including role
    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      user: user!,
      token: result.token, // ✅ Use token instead of session
    };
  }

  /**
   * Validate session using Better Auth
   */
  async validateSession(headers: IncomingHttpHeaders) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    if (!session?.user) {
      return null;
    }

    // Get full user data with role from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    return user;
  }

  /**
   * Logout user with Better Auth
   */
  async logout(headers: IncomingHttpHeaders): Promise<void> {
    await auth.api.signOut({
      headers: fromNodeHeaders(headers),
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }
}

export const authService = new AuthService();
