import { prisma } from '@/db/prisma';
import { auth } from '@/utils/auth';
import { Role, Prisma, User } from '@prisma/client';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingHttpHeaders } from 'http';
import { UserResponse } from '@/types';

// Select only safe fields to return (exclude password)
const userSelectFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  image: true,
  isActive: true,
  banned: true,
  banReason: true,
  banExpires: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class AuthService {
  /**
   * Create a new user with Better Auth
   */
  async createUser(
    email: string,
    password: string,
    name: string,
    role: Role = Role.USER
  ): Promise<UserResponse> {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!result.user) {
      throw new Error('Failed to create user');
    }

    // Update user with additional attributes
    const updatedUser = await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role,
        lastLoginAt: new Date(),
        isActive: true,
      },
      select: userSelectFields,
    });

    return updatedUser;
  }

  /**
   * Login user with Better Auth
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: UserResponse; token: string | null }> {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!result.user) {
      throw new Error('Invalid credentials');
    }

    // Get full user data including all custom attributes
    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: userSelectFields,
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is banned
    if (user.banned) {
      throw new Error('Account is banned');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user,
      token: result.token ?? null,
    };
  }

  /**
   * Validate session using Better Auth
   */
  async validateSession(headers: IncomingHttpHeaders): Promise<User | null> {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    if (!session?.user) {
      return null;
    }

    // Get full user data with all attributes from database
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
  async getUserById(userId: string): Promise<UserResponse | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelectFields,
    });
  }

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(userId: string, role: Role): Promise<UserResponse> {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: userSelectFields,
    });
  }

  /**
   * Ban user (Admin only)
   */
  async banUser(userId: string, reason?: string, expiresAt?: Date): Promise<UserResponse> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        banned: true,
        banReason: reason ?? null,
        banExpires: expiresAt ?? null,
      },
      select: userSelectFields,
    });
  }

  /**
   * Unban user (Admin only)
   */
  async unbanUser(userId: string): Promise<UserResponse> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
      select: userSelectFields,
    });
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<UserResponse> {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: userSelectFields,
    });
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<UserResponse> {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: userSelectFields,
    });
  }

  /**
   * List all users (Admin only)
   */
  async listUsers(
    page = 1,
    limit = 10,
    filters?: { role?: Role; isActive?: boolean; banned?: boolean }
  ): Promise<{
    users: UserResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.banned !== undefined) {
      where.banned = filters.banned;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: userSelectFields,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const authService = new AuthService();
