import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["creator", "brand_admin"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const campaignSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must not exceed 100 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must not exceed 1000 characters"),
  guidelines: z.string()
    .min(20, "Guidelines must be at least 20 characters")
    .max(2000, "Guidelines must not exceed 2000 characters"),
  ipKitId: z.string().optional().transform(val => val === "" ? undefined : val),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  maxSubmissions: z.number().int().min(1, "Must allow at least 1 submission").optional().or(z.nan().transform(() => undefined)),
  rewardAmount: z.number().int().min(0, "Reward amount must be non-negative").optional().or(z.nan().transform(() => undefined)),
  rewardCurrency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  briefDocument: z.string().url("Must be a valid URL").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  status: z.enum(["draft", "active", "paused", "closed"]).default("draft"),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => {
  if (data.endDate) {
    return data.endDate > new Date();
  }
  return true;
}, {
  message: "End date must be in the future",
  path: ["endDate"],
})

export const submissionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  notes: z.string().optional(),
})