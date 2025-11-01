import { z } from 'zod';

export const createSkillSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  iconUrl: z.string().url().optional(),
  level: z.number().int().min(0).max(100).default(0),
  order: z.number().int().default(0),
});

export const updateSkillSchema = createSkillSchema.partial();
