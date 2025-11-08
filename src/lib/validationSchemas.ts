import { z } from 'zod';

// Authentication schemas
export const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(100),
  fullName: z.string().trim().min(1, { message: "Name cannot be empty" }).max(100).optional(),
});

// List sharing schema
export const shareListSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  permission: z.enum(['view', 'edit'], { message: "Permission must be 'view' or 'edit'" }),
});

// Grocery item schema
export const groceryItemSchema = z.object({
  name: z.string().trim().min(1, { message: "Item name cannot be empty" }).max(100),
  quantity: z.number().positive({ message: "Quantity must be positive" }).max(10000, { message: "Quantity too large" }),
  unit: z.enum(['kg', 'gm', 'l', 'ml', 'pcs', 'dozen', 'pack'], { message: "Invalid unit" }),
  price_per_unit: z.number().nonnegative({ message: "Price cannot be negative" }).max(100000, { message: "Price too large" }).optional(),
  category: z.string().max(50).optional(),
});

// Edge function schemas
export const aiAssistantSchema = z.object({
  prompt: z.string().trim().min(1).max(2000, { message: "Prompt too long (max 2000 characters)" }),
  type: z.enum(['meal-to-list', 'nutrition', 'alternatives', 'chat'], { message: "Invalid request type" }),
});

export const fetchPriceSchema = z.object({
  itemName: z.string().trim().min(1).max(100),
  quantity: z.number().positive().max(10000),
  unit: z.string().max(20),
});
