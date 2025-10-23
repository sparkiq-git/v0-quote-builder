import { z } from "zod"

export const ModelFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  manufacturer: z.string().optional(),
  defaultCapacity: z.number().int().nonnegative().optional(),
  defaultRangeNm: z.number().int().nonnegative().optional(),
  defaultSpeedKnots: z.number().int().nonnegative().optional(),
  images: z
    .array(
      z
        .string()
        .min(1, "Image path cannot be empty")
        .refine((val) => {
          // Accept full URLs or relative paths starting with /
          return val.startsWith("http") || val.startsWith("https") || val.startsWith("/")
        }, "Invalid image URL or path"),
    )
    .min(1, "At least one image is required"),
})

export const TailFormSchema = z.object({
  modelId: z.string().min(1, "Model is required"),
  tailNumber: z.string().min(1, "Tail number is required"),
  operator: z.string().optional(),
  amenities: z.string().optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 5)
    .optional(),
  yearOfRefurbishment: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 5)
    .optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  capacityOverride: z.number().int().nonnegative().optional(),
  rangeNmOverride: z.number().int().nonnegative().optional(),
  speedKnotsOverride: z.number().nonnegative().optional(),
  images: z
    .array(
      z
        .string()
        .min(1, "Image path cannot be empty")
        .refine((val) => {
          // Accept full URLs or relative paths starting with /
          return val.startsWith("http") || val.startsWith("https") || val.startsWith("/")
        }, "Invalid image URL or path"),
    )
    .optional(),
})

export type ModelFormData = z.infer<typeof ModelFormSchema>
export type TailFormData = z.infer<typeof TailFormSchema>
