import { z } from 'zod';

export const createBlogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  published: z.boolean().default(false),
  slug: z.string().optional(),
});

export const updateBlogSchema = createBlogSchema.partial();
