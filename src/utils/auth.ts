import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/db/prisma';
import { admin } from 'better-auth/plugins';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Add base URL for proper session handling
  baseURL: process.env.BASE_URL || 'http://localhost:5000',

  // Define user schema with additional attributes
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'USER',
        required: false,
        input: false,
      },
      lastLoginAt: {
        type: 'date',
        required: false,
        input: false,
      },
      isActive: {
        type: 'boolean',
        defaultValue: true,
        required: false,
        input: false,
      },
      banned: {
        type: 'boolean',
        defaultValue: false,
        required: false,
        input: false,
      },
      banReason: {
        type: 'string',
        required: false,
        input: false,
      },
      banExpires: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  // Configure session
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // Add admin plugin for role-based access
  plugins: [
    admin({
      defaultRole: 'USER',
    }),
  ],
});
