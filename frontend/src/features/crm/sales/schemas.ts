import { z } from 'zod'

export const addPersonSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  role: z.enum(['Key Account Manager', 'Sales Head']),
  hq: z.string().trim(),
  phone: z.string().trim(),
  email: z.string().trim(),
  salaryInr: z.coerce.number().min(0, 'Salary cannot be negative.'),
})

export const targetSchema = z.object({
  repId: z.string().min(1, 'Pick a sales person.'),
  target: z.coerce.number().positive('Target must be greater than zero.'),
  rationale: z.string().trim().min(30, 'Rationale must be at least 30 characters — explain why this number.'),
})

export const rejectSchema = z.object({
  reason: z.string().trim().min(1, 'A rejection reason is required.'),
})

export const requestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
})

export const addTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.'),
  detail: z.string().trim(),
  dueOn: z.string().min(1, 'Due date is required.'),
  dueTime: z.string(),
})

export const snoozeTaskSchema = z.object({
  snoozedTo: z.string().min(1, 'Pick a date to snooze to.'),
  snoozedTime: z.string(),
})
