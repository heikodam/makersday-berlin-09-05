import { z } from "zod";

export const librarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().transform((v) => v.trim()).pipe(z.string().min(1)),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Library = z.infer<typeof librarySchema>;
