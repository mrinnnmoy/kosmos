import { z } from "zod";

export const createEventFormSchema = z
  .object({
    name: z.string().min(3).max(100),
    description: z.string().max(2000).optional(),
    location: z.string().max(200).optional(),
    startsAt: z.string().min(1, "Start date is required"),
    endsAt: z.string().min(1, "End date is required"),
    price: z.coerce.number().min(0),
    capacity: z.coerce.number().int().positive().optional(),
    requiresApproval: z.boolean(),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: "Start must be before end",
    path: ["endsAt"],
  })
  .refine((data) => new Date(data.startsAt) > new Date(), {
    message: "Start must be in the future",
    path: ["startsAt"],
  });

export type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

export const createEventApiSchema = z
  .object({
    name: z.string().min(3).max(100),
    description: z.string().max(2000).optional().or(z.literal("")),
    location: z.string().max(200).optional().or(z.literal("")),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    price: z.coerce.number().min(0),
    capacity: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    requiresApproval: z.enum(["true", "false"]).transform((v) => v === "true"),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: "Start must be before end",
    path: ["endsAt"],
  });
