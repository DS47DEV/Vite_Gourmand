import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  prenom: z.string().min(1).max(60),
  nom: z.string().min(1).max(60),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(72),
});

export const menuCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['classique', 'vegan', 'vegetarien']),
  theme: z.string().max(120).nullable().optional(),
  desc_short: z.string().min(1).max(400),
  desc_full: z.string().max(4000).nullable().optional(),
  price: z.number().positive(),
  min_persons: z.number().int().positive(),
  img_url: z.string().url().max(500).nullable().optional(),
  allergens: z.string().max(500).nullable().optional(),
});

export const menuUpdateSchema = menuCreateSchema.partial();

export const orderCreateSchema = z.object({
  menu_id: z.number().int().positive(),
  persons: z.number().int().positive(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const orderUpdateSchema = z.object({
  persons: z.number().int().positive().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  venue: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['received', 'accepted', 'preparing', 'delivering', 'awaiting_return', 'completed', 'cancelled']),
});

export const reviewCreateSchema = z.object({
  order_id: z.number().int().positive(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
});

export const reviewModerateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const eventCreateSchema = z.object({
  type: z.string().min(1).max(60),
  userId: z.number().int().positive().optional(),
  menuId: z.number().int().positive().optional(),
  orderRef: z.string().max(40).optional(),
  meta: z.record(z.any()).optional(),
});
