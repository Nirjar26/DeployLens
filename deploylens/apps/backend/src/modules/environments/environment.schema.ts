import { z } from "zod";

export const createEnvironmentSchema = z.object({
  repository_id: z.string().uuid(),
  codedeploy_app: z.string().min(1).max(100),
  codedeploy_group: z.string().min(1).max(100),
  display_name: z.string().min(1).max(50),
  color_tag: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});

export const updateEnvironmentSchema = z
  .object({
    display_name: z.string().min(1).max(50).optional(),
    color_tag: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
    codedeploy_app: z.any().optional(),
    codedeploy_group: z.any().optional(),
  })
  .refine((value) => value.display_name !== undefined || value.color_tag !== undefined, {
    message: "At least one mutable field is required",
  });
