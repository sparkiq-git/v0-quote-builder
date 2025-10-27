import { z } from "zod"

export const userFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  display_name: z.string().optional(),
  phone_number: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  roles: z.array(z.string()).optional(),
  active: z.boolean().default(true),
  is_crew: z.boolean().default(false),
  crew_data: z
    .object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      display_name: z.string().optional(),
      phone_number: z.string().optional(),
      home_base: z.string().optional(),
      international: z.boolean().default(false),
      shift_rotation_id: z.string().optional(),
      active: z.boolean().default(true),
    })
    .optional(),
  avatar: z.instanceof(File).optional(),
}).refine((data) => {
  // If not crew, display_name is required
  if (!data.is_crew && !data.display_name) {
    return false
  }
  return true
}, {
  message: "Display name is required for non-crew users",
  path: ["display_name"]
})

export type UserFormInput = z.infer<typeof userFormSchema>
